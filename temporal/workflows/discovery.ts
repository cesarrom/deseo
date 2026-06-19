import { proxyActivities, executeChild } from '@temporalio/workflow';
import type * as activities from '../activities';
import { analyzeProductWorkflow } from './analyzeProduct';

const { 
  discoverAndSyncAnalytics, 
  discoverAndSyncCms,
  discoverTopPages
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

export async function discoverConnectorResourcesWorkflow(params: {
  userId: string;
  appSlug: string;
  appType: 'feature:git' | 'feature:cms' | 'feature:analytics';
  installationId: string;
}) {
  const { appType } = params;

  if (appType === 'feature:analytics') {
    const result = await discoverAndSyncAnalytics(params);
    
    if (result.products && result.products.length > 0) {
      for (const product of result.products) {
        try {
          // 1. Discover top pages for the product
          const urls = await discoverTopPages({
            userId: params.userId,
            installationId: params.installationId,
            siteUrl: product.domain,
          });

          // 2. Trigger analysis child workflow
          await executeChild(analyzeProductWorkflow, {
            args: [{
              productId: product.id,
              domain: product.domain,
              urls,
            }],
            workflowId: `analyze-${product.id}-${Date.now()}`,
          });
        } catch (error) {
          console.error(`⚠️ Failed to analyze product ${product.domain}:`, error);
        }
      }
    }
    return result;
  }

  if (appType === 'feature:cms') {
    return await discoverAndSyncCms(params);
  }

  return { skipped: true, reason: 'No sync logic for this app type yet' };
}
