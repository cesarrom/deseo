import { withRLS, apps, installations, products, performanceMetrics } from '@deseo/db';
import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface ActiveInstallation {
  installationId: string;
  userId: string;
  clientIdInInstallation: string | null;
  baseUrl: string;
  appClientId: string;
  clientSecret: string;
}

async function syncInstallation(installation: ActiveInstallation): Promise<void> {
  const { userId, clientIdInInstallation, baseUrl, appClientId, clientSecret } = installation;

  if (!clientIdInInstallation) return;

  const token = jwt.sign({ userId, clientId: appClientId }, clientSecret, { expiresIn: '10m' });
  const headers = { 'x-deseo-token': token };

  const clientProducts = await withRLS({ isInternal: true }, (tx) =>
    tx.select().from(products).where(eq(products.clientId, clientIdInInstallation))
  );

  if (clientProducts.length === 0) return;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startDateStr = startDate.toISOString().split('T')[0]!;
  const endDateStr = endDate.toISOString().split('T')[0]!;

  for (const product of clientProducts) {
    try {
      const response = await axios.post(
        `${baseUrl}/api/feature/analytics/sync`,
        { siteUrl: product.domain, startDate: startDateStr, endDate: endDateStr },
        { headers, timeout: 30_000 }
      );

      const keywords: Array<{
        query: string;
        date: string;
        clicks: number;
        impressions: number;
        position: number;
        ctr: number;
      }> = response.data?.data || [];

      if (keywords.length === 0) continue;

      await withRLS({ isInternal: true }, async (tx) => {
        // Delete stale rows for this window before reinserting — avoids NULL-in-unique-index duplicates
        await tx
          .delete(performanceMetrics)
          .where(
            and(
              eq(performanceMetrics.clientId, clientIdInInstallation),
              eq(performanceMetrics.productId, product.id),
              isNull(performanceMetrics.articleId),
              gte(performanceMetrics.date, startDate),
              lte(performanceMetrics.date, endDate)
            )
          );

        await tx.insert(performanceMetrics).values(
          keywords.map((k) => ({
            clientId: clientIdInInstallation,
            productId: product.id,
            keyword: k.query,
            date: new Date(k.date),
            clicks: k.clicks,
            impressions: k.impressions,
            position: k.position,
            ctr: k.ctr,
            source: 'gsc' as const,
          }))
        );
      });

      console.log(`✅ [GSCSync] ${keywords.length} keywords refreshed for ${product.domain}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ [GSCSync] Sync failed for ${product.domain}:`, msg);
    }
  }
}

async function runGscSyncCron(): Promise<void> {
  console.log('🔄 [GSCSync] Starting run...');

  try {
    const activeInstallations = await withRLS({ isInternal: true }, (tx) =>
      tx
        .select({
          installationId: installations.id,
          userId: installations.userId,
          clientIdInInstallation: installations.clientId,
          baseUrl: apps.baseUrl,
          appClientId: apps.clientId,
          clientSecret: apps.clientSecret,
        })
        .from(installations)
        .innerJoin(apps, eq(installations.appId, apps.id))
        .where(and(eq(apps.slug, 'gsc'), eq(installations.status, 'active')))
    );

    console.log(`🔌 [GSCSync] Found ${activeInstallations.length} active GSC installation(s)`);

    for (const installation of activeInstallations) {
      try {
        await syncInstallation(installation as ActiveInstallation);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`❌ [GSCSync] Installation ${installation.installationId} failed:`, msg);
      }
    }

    console.log('✅ [GSCSync] Run complete');
  } catch (err) {
    console.error('❌ [GSCSync] Fatal error during run:', err);
  }
}

export function startGscSyncCron(): void {
  // Stagger 30s after startup so the app is fully initialized
  setTimeout(() => runGscSyncCron(), 30_000);
  setInterval(() => runGscSyncCron(), SYNC_INTERVAL_MS);
  console.log(`⏰ [GSCSync] Scheduled every ${SYNC_INTERVAL_MS / 3_600_000}h`);
}
