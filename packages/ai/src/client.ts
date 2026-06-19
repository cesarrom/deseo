import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import axios from 'axios';

export function createOpenRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error('OpenRouter API key is required');
  }

  return createOpenRouter({
    apiKey: key,
    extraBody: {
      plugins: [
        { id: "response-healing" } // Applies to all models created from this instance
      ]
    }
  });
}

export async function listModels() {
  const response = await axios.get('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    }
  });
  return response.data.data;
}

export const DEFAULT_MODEL = 'openai/gpt-4o';
export const FAST_MODEL = 'openai/gpt-4o-mini';
export const SMART_MODEL = 'anthropic/claude-3.5-sonnet';
