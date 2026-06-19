import type { ArticleAST, ArticleMetadata, ContentNode } from '@deseo/types';
import { generateArticleOutline as generateOutline, generateArticleSection as generateSection } from '@deseo/ai';
import { db, articles } from '@deseo/db';

export async function fetchClientContext(clientId: string): Promise<string> {
  return `Fetch RAG context from client's Payload instance for client ${clientId}`;
}

export async function generateArticleOutline(input: {
  topic: string;
  keywords: string[];
  context?: string;
  model?: string;
}): Promise<{ outline: any; metadata: ArticleMetadata }> {
  return generateOutline({
    topic: input.topic,
    keywords: input.keywords,
    context: input.context,
    model: input.model,
  });
}

export async function generateArticleSection(input: {
  sectionTitle: string;
  subsections: string[];
  hints: string[];
  context?: string;
  model?: string;
}): Promise<ContentNode[]> {
  return generateSection(
    input.sectionTitle,
    input.subsections,
    input.hints,
    input.context,
    input.model
  );
}

export async function optimizeForSEO(input: {
  metadata: ArticleMetadata;
  sections: ContentNode[];
}): Promise<ArticleAST> {
  return {
    metadata: input.metadata,
    content: input.sections,
    seo: {
      metaTitle: input.metadata.title,
      metaDescription: input.metadata.description,
    },
  };
}

export async function saveArticleDraft(input: {
  article: ArticleAST;
  clientId: string;
  targetCMS: string;
}): Promise<string> {
  const [result] = await db
    .insert(articles)
    .values({
      clientId: input.clientId,
      title: input.article.metadata.title,
      slug: input.article.metadata.slug,
      astContent: input.article,
      targetCms: input.targetCMS,
      status: 'pending_review',
      keywords: input.article.metadata.keywords,
    })
    .returning({ id: articles.id });

  return result!.id;
}
