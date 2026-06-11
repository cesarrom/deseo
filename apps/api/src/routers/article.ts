import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { articles, clients } from '@deseo/db';
import { eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const articleRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        if (input.clientId) {
          return await tx
            .select()
            .from(articles)
            .where(eq(articles.clientId, input.clientId))
            .limit(input.limit);
        }

        // Fetch all clients for this user
        const userClients = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.userId, ctx.user.id));

        const clientIds = userClients.map((c) => c.id);

        if (clientIds.length === 0) return [];

        return await tx
          .select()
          .from(articles)
          .where(inArray(articles.clientId, clientIds))
          .limit(input.limit);
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [article] = await tx
          .select()
          .from(articles)
          .where(eq(articles.id, input.id))
          .limit(1);
        return article;
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string(),
        slug: z.string(),
        astContent: z.any(),
        targetCms: z.string(),
        keywords: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const article = await ctx.withDB(async (tx) => {
        const [article] = await tx
          .insert(articles)
          .values({
            clientId: input.clientId,
            title: input.title,
            slug: input.slug,
            astContent: input.astContent,
            targetCms: input.targetCms,
            keywords: input.keywords,
            status: 'draft',
          })
          .returning();
        return article;
      });

      if (!article) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create article',
        });
      }

      return article;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['draft', 'pending_review', 'approved', 'published', 'archived']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [article] = await tx
          .update(articles)
          .set({ status: input.status })
          .where(eq(articles.id, input.id))
          .returning();
        return article;
      });
    }),
});
