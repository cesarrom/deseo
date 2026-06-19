import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { jobs, clients } from '@deseo/db';
import { eq, desc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
export const jobRouter = router({
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
            .from(jobs)
            .where(eq(jobs.clientId, input.clientId))
            .orderBy(desc(jobs.createdAt))
            .limit(input.limit);
        }

        const userClients = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.userId, ctx.user.id));

        const clientIds = userClients.map((c) => c.id);

        if (clientIds.length === 0) return [];

        return await tx
          .select()
          .from(jobs)
          .where(inArray(jobs.clientId, clientIds))
          .orderBy(desc(jobs.createdAt))
          .limit(input.limit);
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [job] = await tx
          .select()
          .from(jobs)
          .where(eq(jobs.id, input.id))
          .limit(1);
        return job;
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: z.enum(['article_generation', 'seo_optimization', 'keyword_research']),
        input: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.withDB(async (tx) => {
        const [job] = await tx
          .insert(jobs)
          .values({
            clientId: input.clientId,
            type: input.type,
            inputPayload: input.input,
            status: 'pending',
          })
          .returning();
        return job;
      });

      if (!job) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create job',
        });
      }

      // Trigger Temporal Workflow
      const workflowName = {
        article_generation: 'generateArticleWorkflow',
        seo_optimization: 'optimizeSEOWorkflow',
        keyword_research: 'keywordResearchWorkflow',
      }[input.type];

      try {
        await ctx.temporal.workflow.start(workflowName, {
          taskQueue: 'deseo-main-queue',
          workflowId: `job-${job.id}`,
          args: [input.input],
        });

        // Update status to running
        await ctx.withDB(async (tx) => {
          await tx
            .update(jobs)
            .set({ status: 'running' })
            .where(eq(jobs.id, job.id));
        });
      } catch (error) {
        console.error('Failed to start workflow:', error);
        await ctx.withDB(async (tx) => {
          await tx
            .update(jobs)
            .set({ status: 'failed', errorDetails: String(error) })
            .where(eq(jobs.id, job.id));
        });
      }

      return job;
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['pending', 'running', 'completed', 'failed']),
        output: z.any().optional(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.withDB(async (tx) => {
        const updateData: any = {
          status: data.status,
          ...(data.output !== undefined ? { outputPayload: data.output } : {}),
          ...(data.error !== undefined ? { errorDetails: data.error } : {}),
        };
        const [job] = await tx
          .update(jobs)
          .set(updateData)
          .where(eq(jobs.id, id))
          .returning();
        return job;
      });
    }),
});
