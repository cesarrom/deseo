import { generateText } from 'ai';
import { createOpenRouterClient, SMART_MODEL } from './client';
import { createGitTools } from './tools/git';

export async function runGitCmsAgent(input: {
  userId: string;
  appSlug: string;
  astContent: any;
  productConfig: any;
  targetRepo: string;
  branchName: string;
}): Promise<string> {
  const model = createOpenRouterClient(SMART_MODEL);
  const tools = createGitTools({ userId: input.userId, appSlug: input.appSlug });

  const system = `You are an expert CMS publisher agent. 
Your goal is to convert an Article AST into markdown/MDX and commit it to a git repository using the provided tools.
You MUST:
1. Create a branch '${input.branchName}' off the default branch using createBranch.
2. Translate the AST into file(s) and use commitFiles to commit them. 
3. Create a Pull Request using createPullRequest.

Product Config:
${JSON.stringify(input.productConfig, null, 2)}

Article AST:
${JSON.stringify(input.astContent, null, 2)}
`;

  const { text } = await generateText({
    model,
    system,
    prompt: `Publish this article to ${input.targetRepo}`,
    tools,
    maxSteps: 5,
  });

  return text;
}

export async function runGitSeoAgent(input: {
  userId: string;
  appSlug: string;
  targetRepo: string;
  eventPayload: any;
}): Promise<string> {
  const model = createOpenRouterClient(SMART_MODEL);
  const tools = createGitTools({ userId: input.userId, appSlug: input.appSlug });

  const system = `You are an expert SEO Optimization agent.
Your goal is to analyze the repository context and propose SEO improvements.
You MUST:
1. Use readFileOrTree to explore the repository (e.g. package.json, next-seo.config.js, or HTML headers).
2. Create a branch using createBranch.
3. Commit SEO improvements using commitFiles.
4. Open a Pull Request using createPullRequest.

Webhook Event context:
${JSON.stringify(input.eventPayload, null, 2)}
`;

  const { text } = await generateText({
    model,
    system,
    prompt: `Analyze and optimize SEO for ${input.targetRepo}`,
    tools,
    maxSteps: 10,
  });

  return text;
}
