import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { apps, installations, authGrants } from '@deseo/db';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import axios from 'axios';

export const registryRouter = router({
  // Developer: Register a new app/connector
  registerApp: publicProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        type: z.enum(['feature:git', 'feature:cms', 'feature:analytics']),
        baseUrl: z.string().url(),
        configUrl: z.string(),
        webhookUrl: z.string().url().optional(),
        isInternal: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = `deseo_${crypto.randomBytes(16).toString('hex')}`;
      const clientSecret = crypto.randomBytes(32).toString('hex');

      const app = await ctx.withDB(async (tx) => {
        const [app] = await tx
          .insert(apps)
          .values({
            name: input.name,
            slug: input.slug,
            type: input.type,
            baseUrl: input.baseUrl,
            configUrl: input.configUrl,
            webhookUrl: input.webhookUrl,
            clientId,
            clientSecret,
            isInternal: input.isInternal ? 'true' : 'false',
          })
          .returning();
        return app;
      });

      if (!app) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register app',
        });
      }

      return {
        id: app.id,
        clientId: app.clientId,
        clientSecret: app.clientSecret, // ONLY returned once
      };
    }),

  // User: List available connectors
  listAvailableApps: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      return await tx.select().from(apps);
    });
  }),

  // User: List installed connectors
  listInstallations: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      return await tx
        .select({
          id: installations.id,
          status: installations.status,
          createdAt: installations.createdAt,
          app: {
            id: apps.id,
            name: apps.name,
            type: apps.type,
            slug: apps.slug,
          },
        })
        .from(installations)
        .innerJoin(apps, eq(installations.appId, apps.id))
        .where(eq(installations.userId, ctx.user.id));
    });
  }),

  // User: Start installation flow
  installApp: protectedProcedure
    .input(z.object({ appId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.withDB(async (tx) => {
        const [app] = await tx
          .select()
          .from(apps)
          .where(eq(apps.id, input.appId))
          .limit(1);

        if (!app) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found' });
        }

        // Create a temporary grant code
        const code = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await tx.insert(authGrants).values({
          code,
          userId: ctx.user.id,
          appId: app.id,
          expiresAt,
        });

        return { app, code };
      });

      const { app, code } = result;

      // Construct the redirect URL for the connector
      const redirectUrl = new URL(app.configUrl, app.baseUrl);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('deseo_url', process.env.FRONTEND_URL || 'http://localhost:3000');

      return {
        redirectUrl: redirectUrl.toString(),
      };
    }),

  // Connector: Exchange code for user identity
  exchangeCode: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        clientSecret: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [grant] = await tx
          .select()
          .from(authGrants)
          .where(eq(authGrants.code, input.code))
          .limit(1);

        if (!grant || grant.expiresAt < new Date()) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired code' });
        }

        const [app] = await tx
          .select()
          .from(apps)
          .where(
            and(
              eq(apps.id, grant.appId),
              eq(apps.clientId, input.clientId),
              eq(apps.clientSecret, input.clientSecret)
            )
          )
          .limit(1);

        if (!app) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid client credentials' });
        }

        // Record the installation
        const [installation] = await tx
          .insert(installations)
          .values({
            appId: app.id,
            userId: grant.userId,
          })
          .onConflictDoNothing()
          .returning();

        // Clean up grant
        await tx.delete(authGrants).where(eq(authGrants.id, grant.id));

        return {
          userId: grant.userId,
          installationId: installation?.id,
        };
      });
    }),

  // Hub: Proxy a call to a connector's feature API
  executeAction: protectedProcedure
    .input(
      z.object({
        appSlug: z.string(),
        actionPath: z.string(), // e.g., 'git/repositories'
        method: z.enum(['GET', 'POST']).default('GET'),
        payload: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verify installation
      const installation = await ctx.withDB(async (tx) => {
        const [installation] = await tx
          .select({
            baseUrl: apps.baseUrl,
          })
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(and(eq(apps.slug, input.appSlug), eq(installations.userId, ctx.user.id)))
          .limit(1);
        return installation;
      });

      if (!installation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'App not installed' });
      }

      // 2. Forward request to connector
      try {
        const url = new URL(`/api/feature/${input.actionPath}`, installation.baseUrl).toString();
        const response = await axios({
          method: input.method,
          url,
          data: input.payload,
          headers: {
            'x-deseo-user-id': ctx.user.id,
          },
        });

        return response.data;
      } catch (error: any) {
        console.error('Connector call failed:', error.response?.data || error.message);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Connector error: ${error.response?.data?.error || error.message}`,
        });
      }
    }),

  // User: Trigger an automated SEO audit and PR for a connector
  optimizeSite: protectedProcedure
    .input(z.object({ appSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Ensure installation exists
      const installation = await ctx.withDB(async (tx) => {
        const [installation] = await tx
          .select()
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(and(eq(apps.slug, input.appSlug), eq(installations.userId, ctx.user.id)))
          .limit(1);
        return installation;
      });

      if (!installation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'App not installed' });
      }

      // 2. Start Temporal Workflow
      try {
        const handle = await ctx.temporal.workflow.start('optimizeSEOWorkflow', {
          taskQueue: 'deseo-main-queue',
          workflowId: `seo-opt-${ctx.user.id}-${input.appSlug}`,
          args: [
            {
              userId: ctx.user.id,
              appSlug: input.appSlug,
            },
          ],
        });

        return {
          workflowId: handle.workflowId,
        };
      } catch (error: any) {
        console.error('Failed to start SEO workflow:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start workflow: ${error.message}`,
        });
      }
    }),

  // User: Generate an article and publish it to their CMS
  generateAndPublish: protectedProcedure
    .input(z.object({ topic: z.string(), cmsAppSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Ensure CMS is installed
      const installation = await ctx.withDB(async (tx) => {
        const [installation] = await tx
          .select()
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(and(eq(apps.slug, input.cmsAppSlug), eq(installations.userId, ctx.user.id)))
          .limit(1);
        return installation;
      });

      if (!installation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'CMS not installed' });
      }

      try {
        const handle = await ctx.temporal.workflow.start('generateAndPublishWorkflow', {
          taskQueue: 'deseo-main-queue',
          workflowId: `gen-pub-${ctx.user.id}-${Date.now()}`,
          args: [
            {
              userId: ctx.user.id,
              topic: input.topic,
              cmsAppSlug: input.cmsAppSlug,
            },
          ],
        });

        return {
          workflowId: handle.workflowId,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start content workflow: ${error.message}`,
        });
      }
    }),
});
