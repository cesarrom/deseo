import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';

const { 
  callConnectorAction, 
  generateArticleOutline, 
  generateArticleSection,
  getProductContext,
  getClientModelPreference
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
});

export interface GenerateAndPublishInput {
  userId: string;
  topic: string;
  cmsAppSlug: string; // e.g., 'payload'
  productId?: string;
  clientId?: string;
}

export async function generateAndPublishWorkflow(input: GenerateAndPublishInput): Promise<string> {
  let context = '';
  let clientId = input.clientId;
  
  // 1. Fetch Product context if provided
  if (input.productId) {
    try {
      const product = await getProductContext(input.productId);
      context = `Product Summary: ${product.summary}\nValue Propositions: ${product.valueProps.join(', ')}`;
      if (!clientId) clientId = product.clientId;
    } catch (error) {
      console.warn(`Could not fetch product context for ${input.productId}`, error);
    }
  }

  // 2. Fetch Client model preference
  let model: string = 'openai/gpt-4o'; // Solid default
  if (clientId) {
    try {
      model = await getClientModelPreference(clientId);
    } catch (error) {
      console.warn(`❌ [Workflow] Could not fetch model preference for client ${clientId}, using default.`, error);
    }
  }

  console.log(`🤖 [Workflow] Generating content for ${input.topic} using model: ${model}`);

  // 3. Generate Article AST using existing AI package
  const { outline, metadata } = await generateArticleOutline({
    topic: input.topic,
    keywords: [],
    context,
    model,
  });

  const content = [];
  for (const sectionOutline of outline.sections) {
    const sectionNodes = await generateArticleSection({
      sectionTitle: sectionOutline.heading,
      subsections: sectionOutline.subsections,
      hints: sectionOutline.contentHints,
      model,
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
