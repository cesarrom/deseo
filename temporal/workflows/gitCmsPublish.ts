import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/gitAgent';

const { runGitCmsAgentActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export interface GitCmsPublishInput {
  userId: string;
  appSlug: string;
  astContent: any;
  productConfig: any;
  targetRepo: string;
  branchName: string;
}

export async function gitCmsPublishWorkflow(input: GitCmsPublishInput): Promise<string> {
  const result = await runGitCmsAgentActivity(input);
  return result;
}
