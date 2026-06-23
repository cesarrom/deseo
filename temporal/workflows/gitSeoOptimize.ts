import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/gitAgent';

const { runGitSeoAgentActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface GitSeoOptimizeInput {
  userId: string;
  appSlug: string;
  targetRepo: string;
  eventPayload: any;
}

export async function gitSeoOptimizeWorkflow(input: GitSeoOptimizeInput): Promise<string> {
  const result = await runGitSeoAgentActivity(input);
  return result;
}
