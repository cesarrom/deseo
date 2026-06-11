import { generateText } from 'ai';
import type { ArticleAST, ArticleMetadata, ContentNode } from '@deseo/types';
import { createOpenRouterClient, DEFAULT_MODEL } from './client';
import { generateOutlinePrompt, generateSectionPrompt, SYSTEM_PROMPT } from './prompts';

interface GenerateArticleOptions {
  topic: string;
  keywords: string[];
  context?: string;
  model?: string;
  apiKey?: string;
}

interface OutlineResponse {
  title: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  sections: {
    heading: string;
    subsections: string[];
    contentHints: string[];
  }[];
  schemaType: string;
}

export async function generateArticleOutline(
  options: GenerateArticleOptions
): Promise<{ outline: OutlineResponse; metadata: ArticleMetadata }> {
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.model || DEFAULT_MODEL);

  const prompt = generateOutlinePrompt(options.topic, options.keywords, options.context);

  const { text } = await generateText({
    model: model as any,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const outline: OutlineResponse = JSON.parse(text);

  const metadata: ArticleMetadata = {
    title: outline.title,
    slug: outline.slug,
    description: outline.metaDescription,
    keywords: outline.keywords,
  };

  return { outline, metadata };
}

export async function generateArticleSection(
  sectionTitle: string,
  subsections: string[],
  hints: string[],
  context?: string,
  model?: string,
  apiKey?: string
): Promise<ContentNode[]> {
  const openrouter = createOpenRouterClient(apiKey);
  const llm = openrouter(model || DEFAULT_MODEL);

  const prompt = generateSectionPrompt(sectionTitle, subsections, hints, context);

  const { text } = await generateText({
    model: llm as any,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const nodes: ContentNode[] = [];
  const paragraphs = text.split('\n\n');

  let id = 0;
  for (const para of paragraphs) {
    if (para.trim()) {
      nodes.push({
        type: 'paragraph',
        id: `node-${id++}`,
        text: para.trim(),
      });
    }
  }

  return nodes;
}

export async function generateFullArticle(options: GenerateArticleOptions): Promise<ArticleAST> {
  const { outline, metadata } = await generateArticleOutline(options);

  const content: ContentNode[] = [];

  for (const section of outline.sections) {
    content.push({
      type: 'heading',
      id: `heading-${section.heading}`,
      level: 2,
      text: section.heading,
    });

    const sectionContent = await generateArticleSection(
      section.heading,
      section.subsections,
      section.contentHints,
      options.context,
      options.model,
      options.apiKey
    );

    content.push(...sectionContent);
  }

  return {
    metadata,
    content,
    seo: {
      metaTitle: outline.title,
      metaDescription: outline.metaDescription,
      schema: {
        '@context': 'https://schema.org',
        '@type': outline.schemaType || 'Article',
        headline: outline.title,
        description: outline.metaDescription,
        keywords: outline.keywords.join(', '),
      },
    },
  };
}
