import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { clients } from '@deseo/db';
import { eq, and } from 'drizzle-orm';

export const clientRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const userId = input.userId || ctx.user.id;
        return await tx.select().from(clients).where(eq(clients.userId, userId));
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [client] = await tx
          .select()
          .from(clients)
          .where(and(eq(clients.id, input.id), eq(clients.userId, ctx.user.id)))
          .limit(1);
        return client;
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        aiModelPreference: z.string().default('openai/gpt-4o'),
        aiSmartModel: z.string().default('anthropic/claude-sonnet-4-6'),
        aiFastModel: z.string().default('openrouter/free'),
        aiImageModel: z.string().default('openai/dall-e-3'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log('🚀 MUTATION START: clients.create', { input, userId: ctx.user.id });
      try {
        const result = await ctx.withDB(async (tx) => {
          console.log('👷 INSIDE TRANSACTION: Inserting client...');
          const [client] = await tx
            .insert(clients)
            .values({
              ...input,
              userId: ctx.user.id,
            })
            .returning();
          console.log('✅ INSERT SUCCESS:', client?.id);
          return client;
        });
        return result;
      } catch (error: any) {
        console.error('❌ MUTATION ERROR:', error.message, error.stack);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        aiModelPreference: z.string().optional(),
        aiSmartModel: z.string().optional(),
        aiFastModel: z.string().optional(),
        aiImageModel: z.string().optional(),
        customData: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.withDB(async (tx) => {
        const [client] = await tx
          .update(clients)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(clients.id, id), eq(clients.userId, ctx.user.id)))
          .returning();
        return client;
      });
    }),
});
