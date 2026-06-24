import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useApiKeys = (options?: { enabled?: boolean }) =>
  trpc.auth.listApiKeys.useQuery(undefined, options);

export const useCreateApiKey = (
  options?: MutOpts<typeof trpc.auth.createApiKey.useMutation>,
) => trpc.auth.createApiKey.useMutation(options);

export const useDeleteApiKey = (
  options?: MutOpts<typeof trpc.auth.deleteApiKey.useMutation>,
) => trpc.auth.deleteApiKey.useMutation(options);
