import { generateText, Output } from 'ai';
import { z } from 'zod';
import { createOpenRouterClient, SMART_MODEL } from './client';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ProductVerticalSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().optional(), // relative path e.g. /features/ai-generation
});

export const GeneratedSuggestionSchema = z.object({
  title: z.string(),
  topic: z.string(),
  angle: z.string(),
  description: z.string(),
  hook: z.string(),
  targetAudience: z.string(),
  keySubheadings: z.array(z.string()),
  keywords: z.array(z.string()),
  whyNow: z.string(),
  reasoning: z.string(),
  // Which product vertical/feature this article promotes or is most relevant to
  productVertical: z.string(),
  // The URL of that vertical (relative path on the product's domain, if identifiable)
  productVerticalUrl: z.string().optional(),
  // Suggested anchor text / CTA for the in-article link back to the product
  callToAction: z.string(),
});

export type ProductVertical = z.infer<typeof ProductVerticalSchema>;
export type GeneratedSuggestion = z.infer<typeof GeneratedSuggestionSchema>;

// ---------------------------------------------------------------------------
// Unified suggestion generator
// ---------------------------------------------------------------------------

export interface GenerateSuggestionsOptions {
  productName: string;
  domain: string;
  productContext: string;
  productVerticals: ProductVertical[];
  userPrompt?: string;
  count?: number;
  model?: string;
  apiKey?: string;
}

export async function generateSuggestionsForProduct(
  options: GenerateSuggestionsOptions,
): Promise<GeneratedSuggestion[]> {
  const {
    productName,
    domain,
    productContext,
    productVerticals,
    userPrompt,
    count = 5,
    model,
    apiKey,
  } = options;

  const openrouter = createOpenRouterClient(apiKey);

  const verticalsBlock = productVerticals.length > 0
    ? `\nKnown product verticals / features to reference and link to:\n${
        productVerticals.map(v => `  - ${v.name}${v.url ? ` (${domain}${v.url})` : ''}: ${v.description}`).join('\n')
      }\n`
    : '';

  const focusBlock = userPrompt
    ? `\nUser's specific focus for these suggestions: "${userPrompt}"\n`
    : '';

  const system = `You are a senior content strategist generating highly specific, actionable article briefs for a product's content marketing programme.

Each brief must:
- Be so detailed a writer can execute it without further research or decisions
- Reference a specific product vertical or feature — not the product generically
- Include a natural, non-salesy CTA that links back to the relevant product vertical
- Be opinionated and specific. Never write generic SEO filler.`;

  const prompt = `Product: ${productName} (${domain})
${productContext}
${verticalsBlock}${focusBlock}
Generate exactly ${count} distinct article briefs. For each, identify which product vertical it is most relevant to, and suggest an in-article CTA that links to that vertical.

Each brief must have:
- title: exact SEO-optimised H1
- topic: primary keyword
- angle: one opinionated thesis sentence
- description: 2-3 sentences — what it covers, what argument it makes, what the reader takes away
- hook: the opening sentence that grabs the reader immediately
- targetAudience: precise reader profile (e.g. "B2B SaaS founders doing PLG who have < 50 employees")
- keySubheadings: 4-5 specific H2s the article will contain, in order
- keywords: 4-6 target keywords including long-tail and semantic variants
- whyNow: why this is timely THIS month (trend, event, season, shift)
- reasoning: why this is a high-impact opportunity for this specific product
- productVertical: the name of the product feature/vertical this article promotes (from the list above, or infer one)
- productVerticalUrl: the relative URL of that vertical (e.g. /features/ai-writing), or omit if unknown
- callToAction: suggested anchor text for the in-article link back to the product (e.g. "explore our AI writing suite")`;

  const { output } = await generateText({
    model: openrouter(model ?? SMART_MODEL),
    system,
    prompt,
    output: Output.array({ element: GeneratedSuggestionSchema }),
  });

  return output;
}
