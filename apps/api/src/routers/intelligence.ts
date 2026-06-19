import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { suggestions, products } from '@deseo/db';
import { TRPCError } from '@trpc/server';
import { eq, and, sql } from 'drizzle-orm';
import { listModels } from '@deseo/ai';

export const intelligenceRouter = router({
  listModels: protectedProcedure.query(async () => {
    return await listModels();
  }),

  listSuggestions: protectedProcedure
    .input(z.object({ productId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const whereClause = input.productId 
          ? and(eq(suggestions.clientId, ctx.activeClientId!), eq(suggestions.productId, input.productId))
          : eq(suggestions.clientId, ctx.activeClientId!);
          
        return await tx
          .select()
          .from(suggestions)
          .where(whereClause)
          .orderBy(sql`created_at DESC`);
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
        
        // 2. Create the product
        const [product] = await tx
          .insert(products)
          .values({
            clientId: ctx.activeClientId!,
            name: context.domain.replace('sc-domain:', '').replace('https://', '').replace(/\/$/, ''),
            domain: context.domain,
            type: 'website',
            config: { siteUrl: context.domain },
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
});
