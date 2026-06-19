import OpenAI from 'openai';

interface GenerateImageOptions {
  prompt: string;
  model?: string;
  apiKey?: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const key = options.apiKey || process.env.OPENROUTER_API_KEY;
  
  if (!key) {
    throw new Error('OpenRouter API key is required');
  }

  // Use the native OpenAI client configured for OpenRouter
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
    defaultHeaders: {
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'Deseo',
    }
  });

  const response = await openai.images.generate({
    model: options.model || 'openai/dall-e-3',
    prompt: options.prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  });

  const url = response.data[0]?.url;
  
  if (!url) {
    throw new Error('Failed to generate image');
  }

  return url;
}
