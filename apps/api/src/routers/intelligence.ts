import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { suggestions, products, performanceMetrics, clients } from '@deseo/db';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { listModels, createOpenRouterClient, FAST_MODEL, SMART_MODEL, generateSuggestionsForProduct } from '@deseo/ai';
import { generateText, Output } from 'ai';

// ---------------------------------------------------------------------------
// Shared Zod schemas for trending keyword agents
// ---------------------------------------------------------------------------

const KeywordScoutItemSchema = z.object({
  keyword: z.string(),
  trendSignal: z.string(),
  intent: z.enum(['informational', 'commercial', 'navigational', 'transactional']).catch('informational'),
});

const KeywordScoutResultSchema = z.object({
  keywords: z.array(KeywordScoutItemSchema),
});

const EnrichedKeywordSchema = z.object({
  keyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  suggestedTitle: z.string(),
  productRelevance: z.string(),
  currentContext: z.string(),
  whyNow: z.string(),
  searchIntent: z.enum(['informational', 'commercial', 'navigational', 'transactional']).catch('informational'),
  trendSignal: z.string(),
  difficulty: z.enum(['low', 'medium', 'high']).catch('medium'),
});

const EnrichedKeywordListSchema = z.object({
  keywords: z.array(EnrichedKeywordSchema),
});

export type EnrichedKeyword = z.infer<typeof EnrichedKeywordSchema>;

export async function runTrendingKeywordPipeline(
  product: { name: string; domain: string; config: unknown },
  topGscKeywords: string[],
  models?: { smartModel?: string; fastModel?: string },
  apiKey?: string,
): Promise<EnrichedKeyword[]> {
  const config = (product.config as Record<string, unknown>) || {};
  const openrouter = createOpenRouterClient(apiKey);
  const fastModel = models?.fastModel ?? FAST_MODEL;
  const smartModel = models?.smartModel ?? SMART_MODEL;

  const productContext = [
    `Domain: ${product.domain}`,
    `Product: ${product.name}`,
    config.summary ? `Summary: ${config.summary}` : '',
    config.targetAudience ? `Target audience: ${(config.targetAudience as string[]).join(', ')}` : '',
    config.valueProps ? `Value propositions: ${(config.valueProps as string[]).join(', ')}` : '',
    config.contentGaps ? `Known content gaps: ${(config.contentGaps as string[]).join(', ')}` : '',
    topGscKeywords.length > 0 ? `Already ranking for: ${topGscKeywords.slice(0, 10).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  // --- Agent 1: Scout — fast, broad keyword discovery ---
  const { output: scoutResult } = await generateText({
    model: openrouter(fastModel),
    system: `You are an expert SEO trend analyst. Given a product's context and its existing rankings, identify 15 high-opportunity keywords that are currently rising in search interest. Focus on keywords NOT already covered, with real commercial or informational intent. Avoid generic terms — be specific.`,
    prompt: `${productContext}\n\nReturn 15 trending keyword opportunities. For each include a trendSignal (1 sentence on WHY it's rising now) and search intent classification.`,
    output: Output.object({ schema: KeywordScoutResultSchema }),
  });

  if (!scoutResult.keywords.length) return [];

  // --- Agent 2: Enricher — deep per-keyword product context ---
  const keywordList = scoutResult.keywords.map(k => `- ${k.keyword} (signal: ${k.trendSignal}, intent: ${k.intent})`).join('\n');

  const { output: enrichedResult } = await generateText({
    model: openrouter(smartModel),
    system: `You are a senior content strategist. You receive a list of trending keywords and a specific product's context. For EACH keyword you produce rich metadata that will be shown to a content creator to help them decide whether to write about it and how.`,
    prompt: `Product context:\n${productContext}\n\nKeywords to enrich:\n${keywordList}\n\nFor each keyword return:\n- secondaryKeywords: 4-6 related long-tail keywords and semantic variants that should be covered in the same article (e.g. if primary is "AI content generation", secondaries might be "automated blog writing", "LLM for SEO", "content at scale AI")\n- suggestedTitle: SEO-optimized article title that naturally includes the primary keyword\n- productRelevance: 1-2 sentences on exactly how this keyword connects to THIS product and its audience\n- currentContext: what is happening right now that makes this keyword trend\n- whyNow: why a content creator should write about this THIS month specifically\n- searchIntent, trendSignal (copy from input), difficulty estimate`,
    output: Output.object({ schema: EnrichedKeywordListSchema }),
  });

  return enrichedResult.keywords;
}

export const intelligenceRouter = router({
  listModels: protectedProcedure.query(async () => {
    return await listModels();
  }),

  listSuggestions: protectedProcedure
    .input(z.object({ productId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const base = input.productId
          ? and(eq(suggestions.clientId, ctx.activeClientId!), eq(suggestions.productId, input.productId))
          : eq(suggestions.clientId, ctx.activeClientId!);
        return await tx
          .select()
          .from(suggestions)
          .where(and(base, eq(suggestions.status, 'pending')))
          .orderBy(sql`created_at DESC`);
      });
    }),

  rejectSuggestion: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [updated] = await tx
          .update(suggestions)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(and(eq(suggestions.id, input.id), eq(suggestions.clientId, ctx.activeClientId!)))
          .returning({ id: suggestions.id });
        return updated;
      });
    }),

  getSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [suggestion] = await tx
          .select()
          .from(suggestions)
          .where(and(eq(suggestions.id, input.id), eq(suggestions.clientId, ctx.activeClientId!)))
          .limit(1);
        return suggestion;
      });
    }),

  convertDiscovery: protectedProcedure
    .input(z.object({ suggestionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        // 1. Get the suggestion
        const [suggestion] = await tx
          .select()
          .from(suggestions)
          .where(and(eq(suggestions.id, input.suggestionId), eq(suggestions.clientId, ctx.activeClientId!)))
          .limit(1);

        if (!suggestion || suggestion.type !== 'discovery') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Discovery suggestion not found' });
        }

        const context = suggestion.context as { domain: string };
        
        // 2. Create the product (domain is already clean — the GSC connector normalised it)
        const domain = context.domain as string;
        const [product] = await tx
          .insert(products)
          .values({
            clientId: ctx.activeClientId!,
            name: domain,
            domain,
            type: 'website',
            config: { siteUrl: domain },
          })
          .onConflictDoUpdate({
            target: [products.clientId, products.domain],
            set: { updatedAt: new Date() }
          })
          .returning();

        if (!product) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create product',
          });
        }

        // 3. Mark suggestion as converted
        await tx
          .update(suggestions)
          .set({ status: 'converted', updatedAt: new Date() })
          .where(eq(suggestions.id, suggestion.id));

        // 4. Trigger initial analysis
        try {
          await ctx.temporal.workflow.start('analyzeProductWorkflow', {
            taskQueue: 'deseo-main-queue',
            workflowId: `analyze-discovery-${product.id}-${Date.now()}`,
            args: [{
              productId: product.id,
              domain: product.domain,
              urls: [],
            }],
          });
        } catch (error) {
          console.error('⚠️ Failed to trigger initial analysis for discovered product:', error);
        }

        return product;
      });
    }),

  generateCustomSuggestions: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        prompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch product
      const product = await ctx.withDB(async (tx) => {
        const [p] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.productId), eq(products.clientId, ctx.activeClientId!)))
          .limit(1);
        return p;
      });

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      const config = (product.config as Record<string, unknown>) ?? {};

      // 2. Build product context from stored config
      const productContext = [
        `Product: ${product.name} (${product.domain})`,
        config.summary ? `Summary: ${config.summary}` : '',
        config.targetAudience ? `Audience: ${(config.targetAudience as string[]).join(', ')}` : '',
        config.valueProps ? `Value props: ${(config.valueProps as string[]).join(', ')}` : '',
        config.contentGaps ? `Content gaps: ${(config.contentGaps as string[]).join(', ')}` : '',
      ].filter(Boolean).join('\n');

      const productVerticals = (config.productVerticals as Array<{ name: string; description: string; url?: string }>) ?? [];

      // 3. Generate via the unified suggestion function
      const items = await generateSuggestionsForProduct({
        productName: product.name,
        domain: product.domain,
        productContext,
        productVerticals,
        userPrompt: input.prompt,
        count: 3,
      });

      // 4. Save full context to DB
      const inserted = await ctx.withDB(async (tx) => {
        const results = [];
        for (const item of items) {
          const [insertedSuggestion] = await tx
            .insert(suggestions)
            .values({
              clientId: ctx.activeClientId!,
              productId: product.id,
              type: 'new_article',
              title: item.title,
              description: `${item.angle} — ${item.description}`,
              aiReasoning: `${item.whyNow} | Prompt: ${input.prompt}`,
              context: {
                topic: item.topic,
                keywords: item.keywords,
                angle: item.angle,
                hook: item.hook,
                targetAudience: item.targetAudience,
                keySubheadings: item.keySubheadings,
                whyNow: item.whyNow,
                productVertical: item.productVertical,
                productVerticalUrl: item.productVerticalUrl,
                callToAction: item.callToAction,
              },
              status: 'pending',
            })
            .returning();
          results.push(insertedSuggestion);
        }
        return results;
      });

      return inserted;
    }),

  discoverTrendingKeywords: protectedProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.withDB(async (tx) => {
        const [p] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.productId), eq(products.clientId, ctx.activeClientId!)))
          .limit(1);
        return p;
      });

      if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });

      // Pull top GSC keywords already ranking (as negative signal for scout)
      const [topGscRows, clientRow] = await Promise.all([
        ctx.withDB(async (tx) =>
          tx
            .select({ keyword: performanceMetrics.keyword })
            .from(performanceMetrics)
            .where(eq(performanceMetrics.productId, product.id))
            .orderBy(desc(performanceMetrics.clicks))
            .limit(20)
        ),
        ctx.withDB(async (tx) => {
          const [c] = await tx
            .select({ aiSmartModel: clients.aiSmartModel, aiFastModel: clients.aiFastModel })
            .from(clients)
            .where(eq(clients.id, ctx.activeClientId!))
            .limit(1);
          return c;
        }),
      ]);

      const topGscKeywords = topGscRows.map(r => r.keyword).filter(Boolean) as string[];
      const models = {
        smartModel: clientRow?.aiSmartModel ?? undefined,
        fastModel: clientRow?.aiFastModel ?? undefined,
      };

      const enrichedKeywords = await runTrendingKeywordPipeline(product, topGscKeywords, models);

      const config = (product.config as Record<string, unknown>) || {};
      await ctx.withDB(async (tx) => {
        await tx
          .update(products)
          .set({
            config: {
              ...config,
              trendingKeywords: enrichedKeywords,
              trendingKeywordsUpdatedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(products.id, input.productId));
      });

      return { keywords: enrichedKeywords };
    }),
});

