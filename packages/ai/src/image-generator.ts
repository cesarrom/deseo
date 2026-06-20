import { generateImage as aiGenerateImage } from 'ai';
import { createOpenRouterClient } from './client';
import type { ImageStorageProvider } from './storage';

interface GenerateImageOptions {
  prompt: string;
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  apiKey?: string;
  storage?: ImageStorageProvider;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const openrouter = createOpenRouterClient(options.apiKey);
  const modelId = options.model ?? 'openai/dall-e-3';

  const { image } = await aiGenerateImage({
    model: openrouter.imageModel(modelId),
    prompt: options.prompt,
    size: options.size ?? '1024x1024',
  });

  if (!image.base64) throw new Error('Image generation returned no output');

  if (options.storage) {
    return await options.storage.upload(image.base64, image.mediaType);
  }

  // Fallback: return data URL (acceptable for non-Temporal callers)
  return `data:${image.mediaType};base64,${image.base64}`;
}
