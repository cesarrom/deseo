import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useProducts = (options?: { enabled?: boolean }) =>
  trpc.products.list.useQuery(undefined, options);

export const useProduct = (id: string, options?: { enabled?: boolean }) =>
  trpc.products.getById.useQuery({ id }, options);

export const useReevaluateProduct = (
  options?: MutOpts<typeof trpc.products.reevaluate.useMutation>,
) => trpc.products.reevaluate.useMutation(options);
