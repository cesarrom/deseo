import { createOpenAI } from '@ai-sdk/openai';

export function createOpenRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  
  if (!key) {
    throw new Error('OpenRouter API key is required');
  }

  return createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
  });
}

export const DEFAULT_MODEL = 'openai/gpt-4o';
export const FAST_MODEL = 'openai/gpt-4o-mini';
export const SMART_MODEL = 'anthropic/claude-3.5-sonnet';
