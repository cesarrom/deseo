import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';

const {
  fetchClientContext,
  generateArticleOutline,
  generateArticleSection,
  optimizeForSEO,
  saveArticleDraft,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
  },
});

export interface GenerateArticleInput {
  payload: unknown;
  clientId: string;
  targetCMS: string;
  keywords?: string[];
}

export async function generateArticleWorkflow(
  input: GenerateArticleInput
): Promise<string> {
  const { payload, clientId, targetCMS, keywords = [] } = input;

  const context = await fetchClientContext(clientId);

  const { outline, metadata } = await generateArticleOutline({
    topic: typeof payload === 'string' ? payload : JSON.stringify(payload),
    keywords,
    context,
  });

  const sections = [];
  for (const section of outline.sections) {
    const content = await generateArticleSection({
      sectionTitle: section.heading,
      subsections: section.subsections,
      hints: section.contentHints,
      context,
    });
    sections.push(content);
  }

  const article = await optimizeForSEO({
    metadata,
    sections: sections.flat(),
  });

  const articleId = await saveArticleDraft({
    article,
    clientId,
    targetCMS,
  });

  return articleId;
}
