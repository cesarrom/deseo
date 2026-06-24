import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useClients = (options?: { enabled?: boolean }) =>
  trpc.clients.list.useQuery({}, options);

export const useClientById = (id: string, options?: { enabled?: boolean }) =>
  trpc.clients.getById.useQuery({ id }, options);

export const useCreateClient = (
  options?: MutOpts<typeof trpc.clients.create.useMutation>,
) => trpc.clients.create.useMutation(options);

export const useUpdateClient = (
  options?: MutOpts<typeof trpc.clients.update.useMutation>,
) => trpc.clients.update.useMutation(options);
