import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { products } from '@deseo/db';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const productRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      // RLS handles client isolation if activeClientId is set in context
      return await tx
        .select()
        .from(products)
        .where(eq(products.clientId, ctx.activeClientId!));
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.id), eq(products.clientId, ctx.activeClientId!)))
          .limit(1);
        return product;
      });
    }),

  reevaluate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.withDB(async (tx) => {
        const [p] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, input.id), eq(products.clientId, ctx.activeClientId!)))
          .limit(1);
        return p;
      });

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      try {
        await ctx.temporal.workflow.start('analyzeProductWorkflow', {
          taskQueue: 'deseo-main-queue',
          workflowId: `analyze-manual-${product.id}-${Date.now()}`,
          args: [{
            productId: product.id,
            domain: product.domain,
            urls: [], // Activity will prioritize domain/homepage if URLs are empty
          }],
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to trigger analysis: ${error.message}`,
        });
      }
    }),
});
