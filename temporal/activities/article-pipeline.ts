/**
 * Temporal activities for the V2 multi-agent article generation pipeline.
 * Each activity wraps one stage of the pipeline, giving Temporal
 * retry, timeout, and observability for each step.
 */

import {
  runDirectorAgent,
  runVisualPlannerAgent,
  runSectionWriterAgent,
  generateArticleImage,
  assembleArticle,
  runEditorAgent,
  HttpImageStorage,
  type ArticleBlueprint,
  type BlueprintSection,
  type ImageSpec,
  type LexicalRoot,
  type LexicalNode,
  type VisualPlan,
} from '@deseo/ai';
import { db, articles, products, clients, suggestions } from '@deseo/db';
import { eq } from 'drizzle-orm';
import { fetchPageContent } from './analysis';

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

export async function getProductContextV2(
  productId?: string
): Promise<{ productContext: string; targetAudience?: string; productDomain?: string }> {
  if (!productId) return { productContext: '' };

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) return { productContext: '' };

  const config = (product.config as Record<string, any>) || {};

  const parts: string[] = [
    `Domain: ${product.domain}`,
    `Product name: ${product.name}`,
  ];
  if (config.summary) parts.push(`Summary: ${config.summary}`);
  if (config.valueProps) parts.push(`Value propositions: ${(config.valueProps as string[]).join(', ')}`);
  if (config.contentGaps) parts.push(`Content gaps to address: ${(config.contentGaps as string[]).join(', ')}`);
  if (config.trendingKeywords) parts.push(`Trending keywords: ${(config.trendingKeywords as string[]).join(', ')}`);

  return {
    productContext: parts.join('\n'),
    targetAudience: config.targetAudience?.[0],
    productDomain: product.domain,
  };
}

export async function getPipelineModelConfig(
  clientId: string
): Promise<{ smartModel: string; writerModel: string; fastModel: string; imageModel: string }> {
  const [client] = await db
    .select({
      aiModelPreference: clients.aiModelPreference,
      aiSmartModel: clients.aiSmartModel,
      aiFastModel: clients.aiFastModel,
      aiImageModel: clients.aiImageModel,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  return {
    writerModel: client?.aiModelPreference ?? 'openai/gpt-4o',
    smartModel: client?.aiSmartModel ?? 'anthropic/claude-3.5-sonnet',
    fastModel: client?.aiFastModel ?? 'openai/gpt-4o-mini',
    imageModel: client?.aiImageModel ?? 'openai/dall-e-3',
  };
}

// ---------------------------------------------------------------------------
// Stage 1: Director
// ---------------------------------------------------------------------------

export async function runDirectorActivity(input: {
  topic: string;
  keywords: string[];
  productContext: string;
  targetAudience?: string;
  smartModel: string;
  suggestionContext?: { title: string; description: string; angle?: string; hook?: string; targetAudience?: string; keySubheadings?: string[]; whyNow?: string; productVertical?: string; productVerticalUrl?: string; callToAction?: string };
}): Promise<ArticleBlueprint> {
  return runDirectorAgent({
    topic: input.topic,
    keywords: input.keywords,
    productContext: input.productContext,
    targetAudience: input.targetAudience,
    smartModel: input.smartModel,
    suggestionContext: input.suggestionContext,
  });
}

// ---------------------------------------------------------------------------
// Stage 2: Visual Planner
// ---------------------------------------------------------------------------

export async function runVisualPlannerActivity(input: {
  blueprint: ArticleBlueprint;
  productContext: string;
  fastModel: string;
}): Promise<VisualPlan> {
  return runVisualPlannerAgent(input.blueprint, input.productContext, {
    fastModel: input.fastModel,
  });
}

// ---------------------------------------------------------------------------
// Stage 3a: Section Writer
// ---------------------------------------------------------------------------

export async function runSectionWriterActivity(input: {
  section: BlueprintSection;
  context: {
    articleTitle: string;
    articleAngle: string;
    articleTone: string;
    productContext: string;
    keywords: string[];
    prevSectionSummary?: string;
    nextSectionHint?: string;
    productVertical?: string;
    productVerticalUrl?: string;
    callToAction?: string;
  };
  writerModel: string;
}): Promise<LexicalNode[]> {
  return runSectionWriterAgent(input.section, input.context, {
    writerModel: input.writerModel,
  });
}

// ---------------------------------------------------------------------------
// Stage 3b: Image Generator
// ---------------------------------------------------------------------------

export async function generateImageActivity(input: {
  spec: ImageSpec;
  imageModel?: string;
}): Promise<string | null> {
  const uploadUrl = process.env.IMAGE_STORAGE_URL
    ?? `http://localhost:${process.env.API_PORT ?? 3001}/api/images/upload`;
  const storage = new HttpImageStorage(uploadUrl);
  return generateArticleImage(input.spec, { imageModel: input.imageModel, storage });
}

// ---------------------------------------------------------------------------
// Stage 4: Assembler
// ---------------------------------------------------------------------------

export async function assembleArticleActivity(input: {
  blueprint: ArticleBlueprint;
  sectionEntries: [string, LexicalNode[]][];
  imageEntries: [string, string][];
}): Promise<LexicalRoot> {
  const sectionNodes = new Map<string, LexicalNode[]>(input.sectionEntries);
  const imageUrls = new Map<string, string>(input.imageEntries);
  return assembleArticle(input.blueprint, sectionNodes, imageUrls);
}

// ---------------------------------------------------------------------------
// Stage 5: Editor
// ---------------------------------------------------------------------------

export async function runEditorActivity(input: {
  lexicalRoot: LexicalRoot;
  blueprint: ArticleBlueprint;
  smartModel: string;
}): Promise<LexicalRoot> {
  return runEditorAgent(input.lexicalRoot, input.blueprint, {
    smartModel: input.smartModel,
  });
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export async function saveArticleV2(input: {
  blueprint: ArticleBlueprint;
  lexicalRoot: LexicalRoot;
  heroImageUrl?: string;
  clientId: string;
  productId?: string;
  targetCMS?: string;
  suggestionId?: string;
}): Promise<string> {
  const targetKeywords = input.blueprint.targetKeywords ?? [];

  const astContent = {
    metadata: {
      title: input.blueprint.title,
      slug: input.blueprint.slug,
      description: input.blueprint.metaDescription,
      keywords: targetKeywords,
      heroImageUrl: input.heroImageUrl,
    },
    root: input.lexicalRoot,
    seo: {
      metaTitle: input.blueprint.title,
      metaDescription: input.blueprint.metaDescription,
      schema: {
        '@context': 'https://schema.org',
        '@type': input.blueprint.schemaType || 'Article',
        headline: input.blueprint.title,
        description: input.blueprint.metaDescription,
        keywords: targetKeywords.join(', '),
      },
    },
  };

  const [result] = await db
    .insert(articles)
    .values({
      clientId: input.clientId,
      productId: input.productId,
      title: input.blueprint.title,
      slug: input.blueprint.slug,
      keywords: targetKeywords,
      astContent,
      targetCms: input.targetCMS || null,
      status: 'pending_review',
      metadata: {
        excerpt: input.blueprint.excerpt,
        angle: input.blueprint.angle,
        heroImageUrl: input.heroImageUrl,
        schemaType: input.blueprint.schemaType,
      },
    })
    .returning({ id: articles.id });

  if (!result?.id) throw new Error('Failed to save article');
  console.log(`✅ [Save] Article saved: ${result.id}`);

  if (input.suggestionId) {
    await db
      .update(suggestions)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(eq(suggestions.id, input.suggestionId));
    console.log(`✅ [Save] Suggestion ${input.suggestionId} marked as converted`);
  }

  return result.id;
}

// ---------------------------------------------------------------------------
// Vertical page context fetch
// ---------------------------------------------------------------------------

/**
 * Fetches a specific product page URL and returns a short context summary
 * to extend the Director's product knowledge beyond the base domain overview.
 *
 * Reuses fetchPageContent from analysis.ts — no duplication.
 * Returns empty string on any failure so the workflow falls back gracefully.
 */
export async function fetchVerticalPageActivity(input: {
  url: string;          // absolute or relative path
  productDomain: string; // base domain for constructing absolute URLs
}): Promise<string> {
  const { url, productDomain } = input;

  // Construct absolute URL
  let absoluteUrl: string;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    absoluteUrl = url;
  } else {
    const base = productDomain.startsWith('http') ? productDomain : `https://${productDomain}`;
    absoluteUrl = `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
  }

  console.log(`🔍 [VerticalFetch] Fetching: ${absoluteUrl}`);

  try {
    const { content } = await fetchPageContent(absoluteUrl);
    if (!content || content.length < 50) {
      console.warn(`[VerticalFetch] Page returned too little content: ${absoluteUrl}`);
      return '';
    }

    // Trim to a useful excerpt — enough for context without being overwhelming
    const excerpt = content.slice(0, 3000).trim();
    console.log(`✅ [VerticalFetch] Got ${excerpt.length} chars from ${absoluteUrl}`);
    return `Target page (${absoluteUrl}):\n${excerpt}`;
  } catch (err: any) {
    console.warn(`⚠️  [VerticalFetch] Failed to fetch ${absoluteUrl}: ${err.message}`);
    return '';
  }
}
