import { generateText, Output } from 'ai';
import { z } from 'zod';
import type { ArticleAST, ArticleMetadata, ContentNode } from '@deseo/types';
import { createOpenRouterClient, DEFAULT_MODEL, SMART_MODEL } from './client';
import { generateOutlinePrompt, generateSectionPrompt, SYSTEM_PROMPT, analyzeProductPrompt } from './prompts';
import { generateImage } from './image-generator';
import { parseJSON } from './utils';
import { ProductVerticalSchema } from './suggestions';

const ProductAnalysisSchema = z.object({
  summary: z.string(),
  targetAudience: z.array(z.string()),
  valueProps: z.array(z.string()),
  productVerticals: z.array(ProductVerticalSchema),
  seoAssessment: z.object({
    score: z.number(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    advice: z.array(z.string()),
  }),
  contentGaps: z.array(z.string()),
  discoveredSubdomains: z.array(z.string()),
});

export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;

/**
 * Parses a raw markdown string (as returned by the LLM) into typed ContentNode objects.
 * Handles headings, ordered/unordered lists, code blocks, blockquotes, and paragraphs.
 */
export function parseMarkdownToNodes(markdown: string): ContentNode[] {
  const nodes: ContentNode[] = [];
  const lines = markdown.split('\n');
  let id = 0;
  const nextId = () => `node-${id++}`;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      nodes.push({ type: 'code', id: nextId(), language: lang, code: codeLines.join('\n') } as ContentNode);
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      nodes.push({ type: 'heading', id: nextId(), level, text: headingMatch[2]!.trim() } as ContentNode);
      i++;
      continue;
    }

    // Blockquote — collect consecutive > lines
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('> ')) {
        quoteLines.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i++;
      }
      nodes.push({ type: 'blockquote', id: nextId(), text: quoteLines.join(' ') } as ContentNode);
      continue;
    }

    // Unordered list — collect consecutive bullet lines
    if (/^[-*+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i]!.trim())) {
        items.push(lines[i]!.trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      nodes.push({ type: 'list', id: nextId(), ordered: false, items } as ContentNode);
      continue;
    }

    // Ordered list — collect consecutive numbered lines
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!.trim())) {
        items.push(lines[i]!.trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push({ type: 'list', id: nextId(), ordered: true, items } as ContentNode);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      nodes.push({ type: 'divider', id: nextId() } as ContentNode);
      i++;
      continue;
    }

    // Paragraph — collect until blank line
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim()) {
      paraLines.push(lines[i]!);
      i++;
    }
    const paraText = paraLines.join(' ').trim();
    if (paraText) {
      nodes.push({ type: 'paragraph', id: nextId(), text: paraText } as ContentNode);
    }
  }

  return nodes;
}


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

  return parseMarkdownToNodes(text);
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
}): Promise<ProductAnalysis> {
  const openrouter = createOpenRouterClient(options.apiKey);
  const model = openrouter(options.model || SMART_MODEL);

  const { output } = await generateText({
    model,
    system: `You are a senior SEO strategist analysing a product website. Extract structured data that will be used to generate highly specific content marketing briefs. Be precise about product verticals — identify specific features, use cases, or audience segments the product serves, with their URL paths when visible in the page data.`,
    prompt: analyzeProductPrompt(options.domain, options.pages),
    output: Output.object({ schema: ProductAnalysisSchema }),
  });

  return output;
}
