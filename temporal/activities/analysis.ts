import axios from 'axios';
import * as cheerio from 'cheerio';
import { analyzeProduct, generateSuggestionsForProduct } from '@deseo/ai';
import { db, products, suggestions, apps, installations } from '@deseo/db';
import { eq, and, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function discoverTopPages(params: {
  userId: string;
  installationId: string;
  siteUrl: string;
}): Promise<string[]> {
  const [data] = await db
    .select({
      baseUrl: apps.baseUrl,
      clientId: apps.clientId,
      clientSecret: apps.clientSecret,
    })
    .from(installations)
    .innerJoin(apps, eq(installations.appId, apps.id))
    .where(eq(installations.id, params.installationId))
    .limit(1);

  if (!data) throw new Error('Installation not found');

  const token = jwt.sign({ userId: params.userId, clientId: data.clientId }, data.clientSecret, { expiresIn: '10m' });
  
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const response = await axios.post(`${data.baseUrl}/api/feature/analytics/pages`, {
    siteUrl: params.siteUrl,
    startDate: startDate.toISOString().split('T')[0],
    endDate,
  }, { 
    headers: { 'x-deseo-token': token } 
  });

  return response.data.data.map((p: any) => p.url);
}

export async function getProductContext(productId: string): Promise<{ summary: string; valueProps: string[]; clientId: string }> {
  console.log(`🔍 [Analysis] Fetching product context for ID: ${productId}`);
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
    
  if (!product) throw new Error(`Product not found: ${productId}`);
  
  console.log(`✅ [Analysis] Found product. Domain: ${product.domain}, ClientID: ${product.clientId}`);
  
  const config = product.config as any;
  return {
    summary: config.summary || '',
    valueProps: config.valueProps || [],
    clientId: product.clientId,
  };
}

export async function fetchPageContent(url: string): Promise<{ content: string; links: string[] }> {
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  
  try {
    console.log(`🔍 [Analysis] Fetching content and links for: ${targetUrl}`);
    const response = await axios.get(targetUrl, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'DeseoBot/1.0 (SEO Analysis Engine)'
      }
    });
    const $ = cheerio.load(response.data);
    
    // 1. Extract links
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, targetUrl).toString();
          // Basic filtering: remove anchors and queries to avoid duplicates
          const cleanUrl = absoluteUrl.split('#')[0].split('?')[0].replace(/\/$/, '');
          links.push(cleanUrl);
        } catch (e) {
          // Ignore malformed URLs
        }
      }
    });

    // 2. Extract content
    // Remove non-content elements
    $('script, style, nav, footer, iframe, noscript, svg, header').remove();
    const content = $('body').text().replace(/\s+/g, ' ').trim();
    
    return { 
      content, 
      links: Array.from(new Set(links)) 
    };
  } catch (error: any) {
    console.error(`❌ [Analysis] Failed to fetch for ${targetUrl}:`, error.message);
    return { content: '', links: [] };
  }
}

export async function analyzeProductAndSave(params: {
  productId: string;
  domain: string;
  pages: { url: string; content: string }[];
  model?: string;
  discoveredSubdomains?: string[];
}) {
  const { productId, domain, pages, model, discoveredSubdomains } = params;
  const activeModel = model || 'openai/gpt-4o';

  console.log(`🤖 [Analysis] Starting AI analysis for product: ${domain} using model: ${activeModel}`);
  const analysis = await analyzeProduct({
    domain,
    pages,
    model: activeModel,
  });

  // 1. Merge discovered subdomains from crawler and AI
  const allDiscoveredSubdomains = new Set([
    ...(discoveredSubdomains || []),
    ...(analysis.discoveredSubdomains || [])
  ]);

  // 2. Update Product with analysis summary and value props in config
  const [existingProduct] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!existingProduct) throw new Error('Product not found');

  const productVerticals = analysis.productVerticals ?? [];

  const updatedConfig = {
    ...(existingProduct.config as any || {}),
    summary: analysis.summary,
    targetAudience: analysis.targetAudience,
    valueProps: analysis.valueProps,
    productVerticals,
    seoAssessment: analysis.seoAssessment,
    contentGaps: analysis.contentGaps,
    discoveredSubdomains: Array.from(allDiscoveredSubdomains),
  };

  await db
    .update(products)
    .set({ config: updatedConfig, updatedAt: new Date() })
    .where(eq(products.id, productId));

  // 3. Clear old pending/rejected suggestions before inserting fresh ones.
  await db
    .delete(suggestions)
    .where(
      and(
        eq(suggestions.productId, productId),
        eq(suggestions.type, 'new_article'),
        inArray(suggestions.status, ['pending', 'rejected']),
      ),
    );

  // 4. Generate and save rich suggestions via the unified function.
  const productContext = [
    `Domain: ${domain}`,
    `Product: ${existingProduct.name}`,
    analysis.summary ? `Summary: ${analysis.summary}` : '',
    analysis.targetAudience?.length ? `Target audience: ${analysis.targetAudience.join(', ')}` : '',
    analysis.valueProps?.length ? `Value propositions: ${analysis.valueProps.join(', ')}` : '',
    analysis.contentGaps?.length ? `Content gaps: ${analysis.contentGaps.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const generatedSuggestions = await generateSuggestionsForProduct({
    productName: existingProduct.name,
    domain,
    productContext,
    productVerticals,
    count: 5,
    model: activeModel,
  });

  console.log(`💡 [Analysis] Saving ${generatedSuggestions.length} AI suggestions`);
  for (const s of generatedSuggestions) {
    await db.insert(suggestions).values({
      clientId: existingProduct.clientId,
      productId: existingProduct.id,
      type: 'new_article',
      title: s.title,
      description: `${s.angle} — ${s.description}`,
      aiReasoning: `${s.whyNow} | ${s.reasoning}`,
      context: {
        topic: s.topic,
        angle: s.angle,
        keywords: s.keywords,
        hook: s.hook,
        targetAudience: s.targetAudience,
        keySubheadings: s.keySubheadings,
        whyNow: s.whyNow,
        productVertical: s.productVertical,
        productVerticalUrl: s.productVerticalUrl,
        callToAction: s.callToAction,
      },
      status: 'pending',
    });
  }

  // 4. Save Discovery Suggestions for Subdomains
  if (allDiscoveredSubdomains.size > 0) {
    console.log(`📡 [Analysis] Found ${allDiscoveredSubdomains.size} subdomains. Creating suggestions...`);
    for (const subdomain of allDiscoveredSubdomains) {
      // Check if product already exists for this subdomain
      const [existing] = await db
        .select()
        .from(products)
        .where(and(eq(products.clientId, existingProduct.clientId), eq(products.domain, subdomain)))
        .limit(1);
      
      if (!existing) {
        await db.insert(suggestions).values({
          clientId: existingProduct.clientId,
          type: 'discovery',
          title: `New Subdomain Found: ${subdomain}`,
          description: `While analyzing ${domain}, we discovered a potentially related product at ${subdomain}.`,
          context: { domain: subdomain, source: 'crawler/ai' },
          status: 'pending',
        }).onConflictDoNothing();
      }
    }
  }

  return analysis;
}
