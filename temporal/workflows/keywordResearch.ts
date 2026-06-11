import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';

const {
  fetchGSCData,
  analyzeKeywordOpportunities,
  saveKeywordData,
  notifyClient,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

export interface KeywordResearchInput {
  domain: string;
  clientId: string;
}

export async function keywordResearchWorkflow(
  input: KeywordResearchInput
): Promise<void> {
  const { domain, clientId } = input;

  const gscData = await fetchGSCData({ domain, clientId });

  const opportunities = await analyzeKeywordOpportunities({
    gscData,
    clientId,
  });

  await saveKeywordData({
    opportunities,
    clientId,
  });

  if (opportunities.length > 0) {
    await notifyClient({
      clientId,
      message: `Found ${opportunities.length} new keyword opportunities`,
      type: 'keyword_research',
    });
  }
}
