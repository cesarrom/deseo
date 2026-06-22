import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { articles, clients, apps, installations } from '@deseo/db';
import { eq, inArray, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { generateText } from 'ai';
import { createOpenRouterClient, DEFAULT_MODEL, parseJSON } from '@deseo/ai';

export const articleRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        productId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        if (input.productId) {
          return await tx
            .select()
            .from(articles)
            .where(eq(articles.productId, input.productId))
            .limit(input.limit);
        }

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

  updateContent: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        lexicalRoot: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.withDB(async (tx) => {
        const [existing] = await tx
          .select({ astContent: articles.astContent })
          .from(articles)
          .where(and(eq(articles.id, input.id), eq(articles.clientId, ctx.activeClientId!)))
          .limit(1);

        if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

        const current = (existing.astContent as Record<string, unknown>) ?? {};
        const updated = { ...current, root: input.lexicalRoot };

        const [article] = await tx
          .update(articles)
          .set({ astContent: updated, updatedAt: new Date() })
          .where(eq(articles.id, input.id))
          .returning();
        return article;
      });
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

  publishToCms: protectedProcedure
    .input(
      z.object({
        articleId: z.string().uuid(),
        cmsAppSlugs: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [article] = await ctx.withDB(async (tx) => {
        return await tx
          .select()
          .from(articles)
          .where(eq(articles.id, input.articleId))
          .limit(1);
      });

      if (!article) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Article not found' });
      }

      const results: { appSlug: string; success: boolean; error?: string; url?: string; id?: string }[] = [];

      for (const appSlug of input.cmsAppSlugs) {
        try {
          const installation = await ctx.withDB(async (tx) => {
            const [installation] = await tx
              .select({
                baseUrl: apps.baseUrl,
                clientId: apps.clientId,
                clientSecret: apps.clientSecret,
              })
              .from(installations)
              .innerJoin(apps, eq(installations.appId, apps.id))
              .where(and(eq(apps.slug, appSlug), eq(installations.userId, ctx.user.id)))
              .limit(1);
            return installation;
          });

          if (!installation) {
            results.push({ appSlug, success: false, error: 'App not installed' });
            continue;
          }

          const token = jwt.sign(
            { 
              userId: ctx.user.id, 
              clientId: installation.clientId 
            }, 
            installation.clientSecret, 
            { expiresIn: '5m' }
          );

          const cleanBase = installation.baseUrl.endsWith('/') ? installation.baseUrl : `${installation.baseUrl}/`;
          const url = new URL('api/feature/cms/publish', cleanBase).toString();
          const response = await axios({
            method: 'POST',
            url,
            data: {
              title: article.title,
              slug: article.slug,
              content: article.astContent,
            },
            headers: {
              'x-deseo-token': token,
            },
          });

          if (response.data?.success) {
            await ctx.withDB(async (tx) => {
              await tx
                .update(articles)
                .set({
                  status: 'published',
                  targetCms: appSlug,
                  cmsPublishedId: response.data.data?.id || String(response.data.data),
                  publishedAt: new Date(),
                })
                .where(eq(articles.id, article.id));
            });

            results.push({
              appSlug,
              success: true,
              id: response.data.data?.id,
              url: response.data.data?.url,
            });
          } else {
            results.push({
              appSlug,
              success: false,
              error: response.data?.error || 'Unknown error from connector',
            });
          }
        } catch (error: any) {
          // Surface the full connector error message, not just the axios wrapper
          const connectorError = error.response?.data?.error
            ?? error.response?.data?.message
            ?? error.message;
          results.push({ appSlug, success: false, error: connectorError });
        }
      }

      return results;
    }),

  updateWithPrompt: protectedProcedure
    .input(
      z.object({
        articleId: z.string().uuid(),
        prompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch existing article
      const [article] = await ctx.withDB(async (tx) => {
        return await tx
          .select()
          .from(articles)
          .where(eq(articles.id, input.articleId))
          .limit(1);
      });

      if (!article) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Article not found' });
      }

      const ast = article.astContent as any;
      let nodes = [];
      if (ast && Array.isArray(ast.content)) {
        nodes = ast.content;
      } else if (ast && ast.root && Array.isArray(ast.root.children)) {
        nodes = ast.root.children;
      } else if (Array.isArray(ast)) {
        nodes = ast;
      } else {
        nodes = [{ type: 'paragraph', id: 'node-0', text: String(ast) }];
      }

      // 2. Call AI to rewrite/edit nodes
      const client = createOpenRouterClient();
      const model = client(DEFAULT_MODEL);

      const systemPrompt = `You are an expert Copyeditor. Edit the article content nodes provided in JSON format according to the user's revision instructions.
You MUST return a valid JSON array of ContentNode objects representing the complete edited article.
Do not add any markdown formatting or ticks around the JSON.
Supported ContentNode types are:
- paragraph: { type: "paragraph", id: string, text: string }
- heading: { type: "heading", id: string, level: number, text: string }
- list: { type: "list", id: string, ordered: boolean, items: string[] }
- blockquote: { type: "blockquote", id: string, text: string, author?: string }
- callout: { type: "callout", id: string, text: string }
- divider: { type: "divider", id: string }
Ensure you maintain the style and format, applying the user's instructions exactly.`;

      const userPrompt = `Existing Content Nodes:
${JSON.stringify(nodes, null, 2)}

User Revision Request: "${input.prompt}"`;

      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
      });

      const updatedNodes = parseJSON<any[]>(text);
      if (!Array.isArray(updatedNodes)) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI did not return a valid updated content structure',
        });
      }

      // 3. Re-assemble AST content
      let updatedAst = { ...ast };
      if (ast && Array.isArray(ast.content)) {
        updatedAst.content = updatedNodes;
      } else if (ast && ast.root && Array.isArray(ast.root.children)) {
        updatedAst.root.children = updatedNodes;
      } else {
        updatedAst = updatedNodes;
      }

      // 4. Update in database
      const [updatedArticle] = await ctx.withDB(async (tx) => {
        return await tx
          .update(articles)
          .set({
            astContent: updatedAst,
            updatedAt: new Date(),
          })
          .where(eq(articles.id, article.id))
          .returning();
      });

      return updatedArticle;
    }),
});
