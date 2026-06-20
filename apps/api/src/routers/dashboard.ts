import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { apps, installations } from '@deseo/db';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { GitRepositoryImpl } from '../repositories/git';
import { CMSRepositoryImpl } from '../repositories/cms';
import { AnalyticsRepositoryImpl } from '../repositories/analytics';

export const dashboardRouter = router({
  getGitDashboard: protectedProcedure
    .input(z.object({ appSlug: z.string(), repository: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new GitRepositoryImpl(config);
      return repo.getDashboardData(input.repository);
    }),

  getCmsDashboard: protectedProcedure
    .input(z.object({ appSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new CMSRepositoryImpl(config);
      return repo.getDashboardData();
    }),

  getAnalyticsDashboard: protectedProcedure
    .input(z.object({ appSlug: z.string(), siteUrl: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new AnalyticsRepositoryImpl(config);
      return repo.getDashboardData(input.siteUrl);
    }),

  listGitRepos: protectedProcedure
    .input(z.object({ appSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new GitRepositoryImpl(config);
      return repo.listRepositories();
    }),

  listCmsCollections: protectedProcedure
    .input(z.object({ appSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new CMSRepositoryImpl(config);
      return repo.listCollections();
    }),

  listAnalyticsSites: protectedProcedure
    .input(z.object({ appSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const config = await getConnectorConfig(ctx, input.appSlug);
      const repo = new AnalyticsRepositoryImpl(config);
      return repo.listSites();
    }),
});

async function getConnectorConfig(ctx: any, appSlug: string) {
  const data = await ctx.withDB(async (tx: any) => {
    // 1. Try to find installation for active client first
    if (ctx.activeClientId) {
      const [clientInstall] = await tx
        .select({
          baseUrl: apps.baseUrl,
          clientId: apps.clientId,
          clientSecret: apps.clientSecret,
        })
        .from(installations)
        .innerJoin(apps, eq(installations.appId, apps.id))
        .where(
          and(
            eq(apps.slug, appSlug),
            eq(installations.userId, ctx.user.id),
            eq(installations.clientId, ctx.activeClientId)
          )
        )
        .limit(1);

      if (clientInstall) return clientInstall;
    }

    // 2. Fallback to user-global installation (client_id IS NULL)
    const [globalInstall] = await tx
      .select({
        baseUrl: apps.baseUrl,
        clientId: apps.clientId,
        clientSecret: apps.clientSecret,
      })
      .from(installations)
      .innerJoin(apps, eq(installations.appId, apps.id))
      .where(
        and(
          eq(apps.slug, appSlug),
          eq(installations.userId, ctx.user.id),
          sql`${installations.clientId} IS NULL`
        )
      )
      .limit(1);

    return globalInstall;
  });

  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Connector not installed or not found' });
  }

  return {
    baseUrl: data.baseUrl,
    clientId: data.clientId,
    clientSecret: data.clientSecret,
    userId: ctx.user.id,
  };
}
