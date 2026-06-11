import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';

const { callConnectorAction, generateArticleOutline, generateArticleSection } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
});

export interface GenerateAndPublishInput {
  userId: string;
  topic: string;
  cmsAppSlug: string; // e.g., 'payload'
}

export async function generateAndPublishWorkflow(input: GenerateAndPublishInput): Promise<string> {
  // 1. Generate Article AST using existing AI package
  const { outline, metadata } = await generateArticleOutline({
    topic: input.topic,
    keywords: [],
  });

  const content = [];
  for (const sectionOutline of outline.sections) {
    const sectionNodes = await generateArticleSection({
      sectionTitle: sectionOutline.heading,
      subsections: sectionOutline.subsections,
      hints: sectionOutline.contentHints,
    });
    content.push({
      type: 'heading',
      id: `heading-${sectionOutline.heading}`,
      level: 2,
      text: sectionOutline.heading,
    } as const);
    content.push(...sectionNodes);
  }

  const ast = {
    metadata,
    content,
  };

  // 2. Publish to the chosen CMS via Connector
  const publishResponse = await callConnectorAction({
    userId: input.userId,
    appSlug: input.cmsAppSlug,
    actionPath: 'cms/publish',
    method: 'POST',
    payload: {
      title: metadata.title,
      slug: metadata.slug,
      content: ast,
    },
  });

  if (!publishResponse.success) {
    throw new Error(`Publishing failed: ${publishResponse.error}`);
  }

  return publishResponse.data.url;
}
