import {
  db,
  products,
  articles,
  apps,
  installations,
  performanceMetrics,
  suggestions,
} from '@deseo/db';
import { eq, and, sql } from 'drizzle-orm';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { UnifiedPost, UnifiedKeywordData } from '@deseo/types';

interface SyncParams {
  userId: string;
  appSlug: string;
  installationId: string;
}

export async function discoverAndSyncAnalytics(params: SyncParams) {
  const { userId, appSlug, installationId } = params;

  // 1. Get Connector Config from Core DB
  const [data] = await db
    .select({
      baseUrl: apps.baseUrl,
      clientId: apps.clientId,
      clientSecret: apps.clientSecret,
      clientIdInInstallation: installations.clientId,
    })
    .from(installations)
    .innerJoin(apps, eq(installations.appId, apps.id))
    .where(eq(installations.id, installationId))
    .limit(1);

  if (!data) throw new Error('Installation not found');

  const token = jwt.sign({ userId, clientId: data.clientId }, data.clientSecret, {
    expiresIn: '10m',
  });
  const headers = { 'x-deseo-token': token };

  // 2. Discover Sites
  const sitesResponse = await axios.get(`${data.baseUrl}/api/feature/analytics/sites`, { headers });
  const sites: { siteUrl: string }[] = sitesResponse.data.data;

  // 3. Handle Products: Sync existing ones and suggest new ones
  const discoveredProducts: { id: string; domain: string }[] = [];
  const existingProducts = await db
    .select()
    .from(products)
    .where(eq(products.clientId, data.clientIdInInstallation!));

  for (const site of sites) {
    const domain = site.siteUrl;
    let existing = existingProducts.find((p) => p.domain === domain);
    let productId = existing?.id;

    if (!existing) {
      // Auto-create product for explicitly registered GSC site
      console.log(`🚀 [Discovery] Auto-creating product for GSC site: ${domain}`);
      const name = domain.replace('sc-domain:', '').replace('https://', '').replace(/\/$/, '');
      const [newProduct] = await db
        .insert(products)
        .values({
          clientId: data.clientIdInInstallation!,
          name: name,
          domain: domain,
          type: 'website',
          config: { siteUrl: domain },
        })
        .onConflictDoUpdate({
          target: [products.clientId, products.domain],
          set: { updatedAt: new Date() },
        })
        .returning();

      productId = newProduct.id;
      existing = newProduct;
    }

    discoveredProducts.push({ id: productId!, domain: domain });

    // 4. Initial Keyword Sync (Last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    try {
      const keywordsResponse = await axios.post(
        `${data.baseUrl}/api/feature/analytics/sync`,
        {
          siteUrl: domain,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
        },
        { headers }
      );

      const keywords: UnifiedKeywordData[] = keywordsResponse.data.data;

      if (keywords.length > 0) {
        await db
          .insert(performanceMetrics)
          .values(
            keywords.map((k) => ({
              clientId: data.clientIdInInstallation!,
              productId: productId!,
              keyword: k.query,
              date: new Date(k.date),
              clicks: k.clicks,
              impressions: k.impressions,
              position: k.position,
              ctr: k.ctr,
              source: 'gsc',
            }))
          )
          .onConflictDoUpdate({
            target: [
              performanceMetrics.clientId,
              performanceMetrics.productId,
              performanceMetrics.articleId,
              performanceMetrics.keyword,
              performanceMetrics.date,
            ],
            set: {
              clicks: sql`excluded.clicks`,
              impressions: sql`excluded.impressions`,
              position: sql`excluded.position`,
              ctr: sql`excluded.ctr`,
            },
          });
        console.log(`✅ Synced ${keywords.length} keywords for ${domain}`);
      }
    } catch (err) {
      console.error(`❌ Failed to sync keywords for ${domain}:`, err);
    }
  }

  return { sitesFound: sites.length, products: discoveredProducts };
}

export async function discoverAndSyncCms(params: SyncParams) {
  const { userId, appSlug, installationId } = params;

  const [data] = await db
    .select({
      baseUrl: apps.baseUrl,
      clientId: apps.clientId,
      clientSecret: apps.clientSecret,
      clientIdInInstallation: installations.clientId,
    })
    .from(installations)
    .innerJoin(apps, eq(installations.appId, apps.id))
    .where(eq(installations.id, installationId))
    .limit(1);

  if (!data) throw new Error('Installation not found');

  const token = jwt.sign({ userId, clientId: data.clientId }, data.clientSecret, {
    expiresIn: '10m',
  });
  const headers = { 'x-deseo-token': token };

  // 1. Discover Collections
  const collectionsResponse = await axios.get(`${data.baseUrl}/api/feature/cms/collections`, {
    headers,
  });
  const collections: { slug: string; name: string }[] = collectionsResponse.data.data;

  // 2. Map to Products (Try to match by domain if possible, or just create generic ones)
  // For now, let's just sync posts for the first collection found
  if (collections.length > 0) {
    const collection = collections[0].slug;

    // 3. Sync Posts
    const postsResponse = await axios.get(`${data.baseUrl}/api/feature/cms/sync`, {
      params: { collection },
      headers,
    });

    const posts: UnifiedPost[] = postsResponse.data.data;

    // Try to find a product that matches the CMS config or domain
    const [matchingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.clientId, data.clientIdInInstallation!)
          // For now, match by the fact they are in the same client
        )
      )
      .limit(1);

    for (const post of posts) {
      await db
        .insert(articles)
        .values({
          clientId: data.clientIdInInstallation!,
          productId: matchingProduct?.id, // Link to product
          title: post.title,
          slug: post.slug,
          status: post.status === 'published' ? 'published' : 'draft',
          astContent: post.content,
          targetCms: appSlug,
          cmsPublishedId: post.externalId,
          metadata: { ...post.metadata, externalAuthor: post.author },
          updatedAt: new Date(post.updatedAt),
          createdAt: new Date(post.publishedAt || post.updatedAt),
        })
        .onConflictDoUpdate({
          target: [articles.clientId, articles.slug],
          set: {
            title: post.title,
            productId: matchingProduct?.id,
            astContent: post.content,
            status: post.status === 'published' ? 'published' : 'draft',
            updatedAt: new Date(),
          },
        });
    }

    return { postsSynced: posts.length, collection };
  }

  return { postsSynced: 0 };
}
