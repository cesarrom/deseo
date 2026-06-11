import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [client] = await tx
          .insert(clients)
          .values({
            ...input,
            userId: ctx.user.id,
          })
          .returning();
        return client;
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        payloadInstanceUrl: z.string().optional(),
        payloadApiKey: z.string().optional(),
        aiModelPreference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.withDB(async (tx) => {
        const [client] = await tx
          .update(clients)
          .set(data)
          .where(eq(clients.id, id))
          .returning();
        return client;
      });
    }),
});
