import { generateText } from 'ai';
import type { ArticleAST, ArticleMetadata, ContentNode } from '@deseo/types';
import { createOpenRouterClient, DEFAULT_MODEL } from './client';
import { generateOutlinePrompt, generateSectionPrompt, SYSTEM_PROMPT, analyzeProductPrompt } from './prompts';
import { generateImage } from './image-generator';
import { parseJSON } from './utils';

interface GenerateArticleOptions {
  topic: string;
  keywords: string[];
  context?: string;
  model?: string;
  apiKey?: string;
  generateHeroImage?: boolean;
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
  imagePrompt?: string;
}

export async function generateArticleOutline(
  options: GenerateArticleOptions
): Promise<{ outline: OutlineResponse; metadata: ArticleMetadata }> {
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.model || DEFAULT_MODEL);

  const prompt = generateOutlinePrompt(options.topic, options.keywords, options.context);

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const outline = parseJSON<OutlineResponse>(text);

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
    model: llm,
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

  // Generate Hero Image if requested or defaults to true for new articles
  if (options.generateHeroImage !== false) {
    try {
      const imagePrompt = outline.imagePrompt || `A high quality, professional, editorial illustration about ${metadata.title}. Ensure it is relevant to: ${metadata.keywords.join(', ')}.`;
      const imageUrl = await generateImage({
        prompt: imagePrompt,
        apiKey: options.apiKey,
      });

      content.push({
        type: 'image',
        id: 'hero-image',
        url: imageUrl,
        alt: metadata.title,
        caption: `Illustration for ${metadata.title}`,
      });
    } catch (error) {
      console.error('Failed to generate hero image:', error);
      // Fail gracefully, article text is more important
    }
  }

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

export async function analyzeProduct(options: {
  domain: string;
  pages: { url: string; content: string }[];
  apiKey?: string;
  model?: string;
}): Promise<any> {
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.model || DEFAULT_MODEL);

  const prompt = analyzeProductPrompt(options.domain, options.pages);

  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return parseJSON(text);
}
