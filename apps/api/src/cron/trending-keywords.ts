import { db, products, performanceMetrics } from '@deseo/db';
import { eq, desc } from 'drizzle-orm';
import { runTrendingKeywordPipeline } from '../routers/intelligence';

const INTERVAL_MS = 24 * 60 * 60 * 1000;

async function discoverKeywordsForProduct(product: typeof products.$inferSelect) {
  const topGscRows = await db
    .select({ keyword: performanceMetrics.keyword })
    .from(performanceMetrics)
    .where(eq(performanceMetrics.productId, product.id))
    .orderBy(desc(performanceMetrics.clicks))
    .limit(20);

  const topGscKeywords = topGscRows.map(r => r.keyword).filter(Boolean) as string[];
  const enrichedKeywords = await runTrendingKeywordPipeline(product, topGscKeywords);

  if (!enrichedKeywords.length) return;

  const config = (product.config as Record<string, unknown>) || {};
  await db
    .update(products)
    .set({
      config: {
        ...config,
        trendingKeywords: enrichedKeywords,
        trendingKeywordsUpdatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  console.log(`✅ [TrendingKeywords] ${enrichedKeywords.length} keywords enriched for ${product.name}`);
}

async function runTrendingKeywordsCron() {
  console.log('🔍 [TrendingKeywords] Starting run...');
  try {
    const allProducts = await db.select().from(products);
    for (const product of allProducts) {
      try {
        await discoverKeywordsForProduct(product);
      } catch (err) {
        console.error(`❌ [TrendingKeywords] Failed for ${product.id}:`, err);
      }
    }
    console.log(`✅ [TrendingKeywords] Completed for ${allProducts.length} products.`);
  } catch (err) {
    console.error('❌ [TrendingKeywords] Failed:', err);
  }
}

export function startTrendingKeywordsCron() {
  setTimeout(() => { runTrendingKeywordsCron(); }, 10_000);
  setInterval(() => { runTrendingKeywordsCron(); }, INTERVAL_MS);
  console.log(`⏰ [TrendingKeywords] Scheduled every ${INTERVAL_MS / 3600000}h`);
}
