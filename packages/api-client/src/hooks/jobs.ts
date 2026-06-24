import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useJobs = (
  input?: { clientId?: string; productId?: string },
  options?: { enabled?: boolean },
) => trpc.job.list.useQuery(input ?? {}, options);

export const useCreateJob = (
  options?: MutOpts<typeof trpc.job.create.useMutation>,
) => trpc.job.create.useMutation(options);
