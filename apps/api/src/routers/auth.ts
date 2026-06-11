import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { users } from '@deseo/db';
import { eq } from 'drizzle-orm';

import { TRPCError } from '@trpc/server';

export const authRouter = router({
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
      // Upsert user based on email
      return await ctx.withDB(async (tx) => {
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, input.email),
        });

        if (existingUser) {
          return await tx
            .update(users)
            .set({
              name: input.name || existingUser.name,
              image: input.image || existingUser.image,
            })
            .where(eq(users.id, existingUser.id))
            .returning();
        }

        // Create new user
        return await tx
          .insert(users)
          .values({
            email: input.email,
            name: input.name,
            image: input.image,
          })
          .returning();
      });
    }),
});
