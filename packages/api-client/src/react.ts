import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@deseo/api/src/router';

/**
 * Shared tRPC React hook factory.
 *
 * Both web and mobile import this singleton and wrap their app with
 * <trpc.Provider> + their own client config. React context scopes the client
 * per component tree, so each app uses its own auth strategy.
 */
export const trpc = createTRPCReact<AppRouter>();

// Re-export the router type so consumers don't need to reach into @deseo/api directly
export type { AppRouter };
