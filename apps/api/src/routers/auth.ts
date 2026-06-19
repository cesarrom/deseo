import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { users, apiKeys } from '@deseo/db';
import { eq } from 'drizzle-orm';

import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

export const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // Generate a new API key
  createApiKey: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = `ds_${crypto.randomBytes(24).toString('hex')}`;
      
      const [apiKey] = await ctx.withDB(async (tx) => {
        return await tx.insert(apiKeys).values({
          name: input.name,
          key,
          userId: ctx.user.id,
        }).returning();
      });

      if (!apiKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate API key',
        });
      }

      return { key: apiKey.key, name: apiKey.name };
    }),

  // List user's API keys
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.withDB(async (tx) => {
      return await tx.select().from(apiKeys).where(eq(apiKeys.userId, ctx.user.id));
    });
  }),

  // Delete an API key
  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.withDB(async (tx) => {
        await tx.delete(apiKeys).where(eq(apiKeys.id, input.id));
      });
      return { success: true };
    }),

  syncUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        image: z.string().optional(),
        provider: z.string(),
        providerAccountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isInternal) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only internal services can sync users.' });
      }
      
      console.log('🔄 SYNC USER START:', input.email);

      // Upsert user based on email
      return await ctx.withDB(async (tx) => {
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (existingUser) {
          console.log('📍 FOUND EXISTING USER:', existingUser.id);
          const [updated] = await tx
            .update(users)
            .set({
              name: input.name || existingUser.name,
              image: input.image || existingUser.image,
            })
            .where(eq(users.id, existingUser.id))
            .returning();
          
          console.log('✅ UPDATED USER:', updated?.id);
          console.log('📦 RETURNING TO FRONTEND:', JSON.stringify(updated, null, 2));
          return updated;
        }

        console.log('🆕 CREATING NEW USER');
        // Create new user
        const [inserted] = await tx
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            image: input.image,
          })
          .returning();
        
        console.log('✅ INSERTED USER:', inserted?.id);
        console.log('📦 RETURNING TO FRONTEND:', JSON.stringify(inserted, null, 2));
        return inserted;
      });
    }),
});
