import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

type MaybePromise<T> = T | Promise<T>;

export interface DeseoLinkOptions {
  /** Base URL for the tRPC endpoint, e.g. http://localhost:3001/trpc */
  url: string;
  /** Return auth/context headers. May be async (needed for mobile AsyncStorage). */
  headers?: () => MaybePromise<Record<string, string | undefined>>;
  /** Custom fetch implementation — useful for React Native or test environments. */
  fetch?: typeof globalThis.fetch;
}

/**
 * Creates a pre-configured tRPC HTTP batch link with superjson transformer.
 * Both web (cookie auth) and mobile (Bearer token) pass their own headers fn.
 */
export function createDeseoLink(options: DeseoLinkOptions) {
  return httpBatchLink({
    url: options.url,
    transformer: superjson,
    ...(options.headers && { headers: options.headers }),
    ...(options.fetch && { fetch: options.fetch }),
  });
}
