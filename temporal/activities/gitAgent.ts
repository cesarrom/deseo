import { runGitCmsAgent, runGitSeoAgent } from '@deseo/ai/src/git-agents';

export async function runGitCmsAgentActivity(input: {
  userId: string;
  appSlug: string;
  astContent: any;
  productConfig: any;
  targetRepo: string;
  branchName: string;
}): Promise<string> {
  return runGitCmsAgent(input);
}

export async function runGitSeoAgentActivity(input: {
  userId: string;
  appSlug: string;
  targetRepo: string;
  eventPayload: any;
}): Promise<string> {
  return runGitSeoAgent(input);
}
