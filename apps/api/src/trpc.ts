import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';
import superjson from 'superjson';
import { eq, and } from 'drizzle-orm';
import { clients } from '@deseo/db';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const clientProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.activeClientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Active Client ID is required.' });
  }

  // Verify ownership using the database context
  const client = await ctx.withDB(async (tx) => {
    const [c] = await tx
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, ctx.activeClientId!),
          eq(clients.userId, ctx.user!.id)
        )
      )
      .limit(1);
    return c;
  });

  if (!client) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this client.' });
  }

  return next({
    ctx: {
      ...ctx,
      client,
    },
  });
});
