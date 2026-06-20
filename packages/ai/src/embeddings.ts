import { embed } from 'ai';
import { createOpenRouterClient } from './client';

export const EMBEDDING_MODEL = 'perplexity/pplx-embed-v1-4b';
export const EMBEDDING_DIMENSIONS = 2560;

export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const openrouter = createOpenRouterClient(apiKey);
  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
    value: text.slice(0, 8000),
  });
  return Array.from(embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  metaDescription: string;
  similarity: number;
}
