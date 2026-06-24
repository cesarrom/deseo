import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { apps, installations, authGrants, products, performanceMetrics, withRLS } from '@deseo/db';
import { eq, and, sql, gte, lte, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';

export const registryRouter = router({
  // Developer: Register a new app/connector
  registerApp: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        iconUrl: z.string().url().optional(),
        type: z.enum(['feature:git', 'feature:cms', 'feature:analytics']),
        baseUrl: z.string().url(),
        configUrl: z.string(),
        settingsUrl: z.string().optional(),
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
            description: input.description,
            iconUrl: input.iconUrl,
            type: input.type,
            baseUrl: input.baseUrl,
            configUrl: input.configUrl,
            settingsUrl: input.settingsUrl,
            webhookUrl: input.webhookUrl,
            clientId,
            clientSecret,
            userId: ctx.user.id,
            isInternal: input.isInternal,
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

  // Developer: Update an existing app/connector
  updateApp: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        iconUrl: z.string().url().optional().or(z.literal('')),
        type: z.enum(['feature:git', 'feature:cms', 'feature:analytics']),
        baseUrl: z.string().url(),
        configUrl: z.string(),
        settingsUrl: z.string().optional(),
        webhookUrl: z.string().url().optional().or(z.literal('')),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [updatedApp] = await tx
          .update(apps)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description,
            iconUrl: input.iconUrl === '' ? null : input.iconUrl,
            type: input.type,
            baseUrl: input.baseUrl,
            configUrl: input.configUrl,
            settingsUrl: input.settingsUrl,
            webhookUrl: input.webhookUrl === '' ? null : input.webhookUrl,
            updatedAt: new Date(),
          })
          .where(and(eq(apps.id, input.id), eq(apps.userId, ctx.user.id)))
          .returning();

        if (!updatedApp) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'App not found or unauthorized to update',
          });
        }

        return updatedApp;
      });
    }),

  // Developer: Delete an app
  deleteApp: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [deleted] = await tx
          .delete(apps)
          .where(and(eq(apps.id, input.id), eq(apps.userId, ctx.user.id)))
          .returning();

        if (!deleted) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found or unauthorized' });
        }

        return { success: true };
      });
    }),

  // Developer: List apps created by the user
  listUserApps: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      return await tx.select().from(apps).where(eq(apps.userId, ctx.user.id));
    });
  }),

  // Developer: Toggle app publication status
  togglePublishApp: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [app] = await tx
          .select()
          .from(apps)
          .where(and(eq(apps.id, input.id), eq(apps.userId, ctx.user.id)))
          .limit(1);

        if (!app) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found' });
        }

        const newStatus = !app.isPublished;
        
        await tx
          .update(apps)
          .set({ isPublished: newStatus, updatedAt: new Date() })
          .where(eq(apps.id, app.id));

        return { isPublished: newStatus };
      });
    }),

  // Public: List available connectors (Marketplace)
  listAvailableApps: publicProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      let baseQuery = tx
        .select({
          id: apps.id,
          name: apps.name,
          slug: apps.slug,
          description: apps.description,
          iconUrl: apps.iconUrl,
          type: apps.type,
          baseUrl: apps.baseUrl,
          configUrl: apps.configUrl,
          settingsUrl: apps.settingsUrl,
          isPublished: apps.isPublished,
          userId: apps.userId,
          isInternal: apps.isInternal,
        })
        .from(apps);

      if (ctx.user?.id) {
        // Show published apps OR apps owned by the current user
        return await baseQuery.where(
          sql`${apps.isPublished} = true OR ${apps.userId} = ${ctx.user.id}::uuid`
        );
      }
      
      // Guest: Only show published apps
      return await baseQuery.where(eq(apps.isPublished, true));
    });
  }),

  // Public: Get specific connector details
  getAppBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [app] = await tx.select().from(apps).where(eq(apps.slug, input.slug)).limit(1);
        if (!app) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'App not found' });
        }
        return app;
      });
    }),

  // User: List installed connectors
  listInstallations: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      const whereClause = ctx.activeClientId 
        ? and(eq(installations.userId, ctx.user.id), sql`(${installations.clientId} IS NULL OR ${installations.clientId} = ${ctx.activeClientId})`)
        : eq(installations.userId, ctx.user.id);

      return await tx
        .select({
          id: installations.id,
          status: installations.status,
          createdAt: installations.createdAt,
          clientId: installations.clientId,
          app: {
            id: apps.id,
            name: apps.name,
            type: apps.type,
            slug: apps.slug,
            settingsUrl: apps.settingsUrl,
          },
        })
        .from(installations)
        .innerJoin(apps, eq(installations.appId, apps.id))
        .where(whereClause);
    });
  }),

  // User: Start installation flow
  installApp: protectedProcedure
    .input(z.object({ 
      appId: z.string(),
      clientId: z.string().optional() // Allow explicit client selection
    }))
    .mutation(async ({ ctx, input }) => {
      const activeClientId = input.clientId || ctx.activeClientId;

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
          clientId: activeClientId,
          expiresAt,
        });

        return { app, code };
      });

      const { app, code } = result;

      // Construct the redirect URL for the connector preserving baseUrl subpath
      const cleanBase = app.baseUrl.endsWith('/') ? app.baseUrl : `${app.baseUrl}/`;
      const cleanPath = (app.configUrl || '').startsWith('/') ? (app.configUrl || '').substring(1) : (app.configUrl || '');
      const redirectUrl = new URL(cleanPath, cleanBase);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('deseo_url', process.env.FRONTEND_URL || process.env.APP_PUBLIC_URL || 'http://localhost:3000');

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
            clientId: grant.clientId,
            status: 'pending',
          })
          .onConflictDoUpdate({
            target: [installations.userId, installations.appId, installations.clientId],
            set: { status: 'pending', updatedAt: new Date() }, // Reset to pending if re-installing
          })
          .returning();

        // Clean up grant
        await tx.delete(authGrants).where(eq(authGrants.id, grant.id));

        return {
          userId: grant.userId,
          installationId: installation?.id,
        };
      });
    }),

  // Connector: Update installation status (e.g., from pending to active)
  updateInstallationStatus: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        clientSecret: z.string(),
        installationId: z.string().uuid(),
        status: z.string(),
        config: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        // Verify app credentials
        const [app] = await tx
          .select()
          .from(apps)
          .where(
            and(
              eq(apps.clientId, input.clientId),
              eq(apps.clientSecret, input.clientSecret)
            )
          )
          .limit(1);

        if (!app) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid client credentials' });
        }

        // Update installation
        const [updated] = await tx
          .update(installations)
          .set({
            status: input.status,
            config: input.config,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(installations.id, input.installationId),
              eq(installations.appId, app.id)
            )
          )
          .returning();

        if (!updated) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Installation not found' });
        }

        // Trigger Async Discovery Flow if installation is active
        if (input.status === 'active') {
          try {
            await ctx.temporal.workflow.start('discoverConnectorResourcesWorkflow', {
              taskQueue: 'deseo-main-queue',
              workflowId: `discovery-${input.installationId}`,
              args: [{
                userId: updated.userId,
                appSlug: app.slug,
                appType: app.type,
                installationId: updated.id,
              }],
            });
          } catch (error) {
            console.error('⚠️ Failed to trigger discovery workflow:', error);
            // We don't fail the request since the installation status was already updated
          }
        }

        return { success: true };
      });
    }),

  // User: Poll installation status
  getInstallation: protectedProcedure
    .input(z.object({ installationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [installation] = await tx
          .select({
            id: installations.id,
            status: installations.status,
            app: {
              name: apps.name,
              slug: apps.slug,
              type: apps.type,
            }
          })
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(
            and(
              eq(installations.id, input.installationId),
              eq(installations.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!installation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Installation not found' });
        }

        return installation;
      });
    }),

  // User: Manually trigger resource discovery/sync for an installation
  syncInstallation: protectedProcedure
    .input(z.object({ installationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const installation = await ctx.withDB(async (tx) => {
        const [inst] = await tx
          .select({
            id: installations.id,
            userId: installations.userId,
            appSlug: apps.slug,
            appType: apps.type,
          })
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(
            and(
              eq(installations.id, input.installationId),
              eq(installations.userId, ctx.user.id)
            )
          )
          .limit(1);
        return inst;
      });

      if (!installation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Installation not found' });
      }

      try {
        await ctx.temporal.workflow.start('discoverConnectorResourcesWorkflow', {
          taskQueue: 'deseo-main-queue',
          workflowId: `discovery-manual-${installation.id}-${Date.now()}`,
          args: [{
            userId: installation.userId,
            appSlug: installation.appSlug,
            appType: installation.appType as any,
            installationId: installation.id,
          }],
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to trigger sync: ${error.message}`,
        });
      }
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
            clientId: apps.clientId,
            clientSecret: apps.clientSecret,
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

      // 2. Forward request to connector with signed token
      try {
        const token = jwt.sign(
          { 
            userId: ctx.user.id, 
            clientId: installation.clientId 
          }, 
          installation.clientSecret, 
          { expiresIn: '5m' }
        );

        const cleanBase = installation.baseUrl.endsWith('/') ? installation.baseUrl : `${installation.baseUrl}/`;
        const cleanPath = `api/feature/${input.actionPath.replace(/^\//, '')}`;
        const url = new URL(cleanPath, cleanBase).toString();
        const response = await axios({
          method: input.method,
          url,
          data: input.payload,
          headers: {
            'x-deseo-token': token,
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

  // User: Pull fresh GSC performance data into the core DB right now
  refreshAnalyticsData: protectedProcedure
    .input(z.object({ appSlug: z.string(), siteUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const installation = await ctx.withDB(async (tx) => {
        const [inst] = await tx
          .select({
            baseUrl: apps.baseUrl,
            appClientId: apps.clientId,
            clientSecret: apps.clientSecret,
            clientIdInInstallation: installations.clientId,
          })
          .from(installations)
          .innerJoin(apps, eq(installations.appId, apps.id))
          .where(and(eq(apps.slug, input.appSlug), eq(installations.userId, ctx.user.id)))
          .limit(1);
        return inst;
      });

      if (!installation) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'App not installed' });
      }

      const product = await ctx.withDB(async (tx) => {
        const [p] = await tx
          .select()
          .from(products)
          .where(and(eq(products.clientId, installation.clientIdInInstallation!), eq(products.domain, input.siteUrl)))
          .limit(1);
        return p;
      });

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No product found for this site' });
      }

      const token = jwt.sign(
        { userId: ctx.user.id, clientId: installation.appClientId },
        installation.clientSecret,
        { expiresIn: '10m' }
      );

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startDateStr = startDate.toISOString().split('T')[0]!;
      const endDateStr = endDate.toISOString().split('T')[0]!;

      const cleanBase = installation.baseUrl.endsWith('/') ? installation.baseUrl : `${installation.baseUrl}/`;
      const response = await axios.post(
        `${cleanBase}api/feature/analytics/sync`,
        { siteUrl: input.siteUrl, startDate: startDateStr, endDate: endDateStr },
        { headers: { 'x-deseo-token': token }, timeout: 30_000 }
      );

      const keywords: Array<{
        query: string; date: string; clicks: number;
        impressions: number; position: number; ctr: number;
      }> = response.data?.data || [];

      if (keywords.length > 0) {
        await withRLS({ userId: ctx.user.id, activeClientId: ctx.activeClientId ?? undefined, isInternal: false }, async (tx) => {
          await tx
            .delete(performanceMetrics)
            .where(
              and(
                eq(performanceMetrics.clientId, installation.clientIdInInstallation!),
                eq(performanceMetrics.productId, product.id),
                isNull(performanceMetrics.articleId),
                gte(performanceMetrics.date, startDate),
                lte(performanceMetrics.date, endDate)
              )
            );

          await tx.insert(performanceMetrics).values(
            keywords.map((k) => ({
              clientId: installation.clientIdInInstallation!,
              productId: product.id,
              keyword: k.query,
              date: new Date(k.date),
              clicks: k.clicks,
              impressions: k.impressions,
              position: k.position,
              ctr: k.ctr,
              source: 'gsc' as const,
            }))
          );
        });
      }

      return { synced: keywords.length, siteUrl: input.siteUrl };
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
    .input(z.object({ topic: z.string(), cmsAppSlug: z.string(), productId: z.string().optional() }))
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
              productId: input.productId,
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

  // Hub: Receive webhooks from connectors and trigger workflows
  dispatchWebhook: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        clientSecret: z.string(),
        appSlug: z.string(),
        event: z.string(),
        payload: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify app credentials
      const app = await ctx.withDB(async (tx) => {
        const [app] = await tx
          .select()
          .from(apps)
          .where(
            and(
              eq(apps.clientId, input.clientId),
              eq(apps.clientSecret, input.clientSecret),
              eq(apps.slug, input.appSlug)
            )
          )
          .limit(1);
        return app;
      });

      if (!app) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid client credentials' });
      }

      // Trigger the appropriate Temporal workflow
      try {
        if (input.appSlug === 'github' && input.event === 'push') {
          // We assume the payload contains the installation context mapping, e.g. userId and targetRepo
          const { userId, repository } = input.payload;
          
          if (userId && repository) {
            await ctx.temporal.workflow.start('gitSeoOptimizeWorkflow', {
              taskQueue: 'deseo-main-queue',
              workflowId: `seo-webhook-${repository.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`,
              args: [
                {
                  userId,
                  appSlug: input.appSlug,
                  targetRepo: repository,
                  eventPayload: input.payload,
                },
              ],
            });
          }
        }
        return { success: true };
      } catch (error: any) {
        console.error('Failed to dispatch webhook to temporal:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to dispatch webhook: ${error.message}`,
        });
      }
    }),
});
