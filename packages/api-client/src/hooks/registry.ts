import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useInstallations = (options?: { enabled?: boolean }) =>
  trpc.registry.listInstallations.useQuery(undefined, options);

export const useAvailableApps = (options?: { enabled?: boolean }) =>
  trpc.registry.listAvailableApps.useQuery(undefined, options);

export const useUserApps = (options?: { enabled?: boolean }) =>
  trpc.registry.listUserApps.useQuery(undefined, options);

export const useAppBySlug = (slug: string, options?: { enabled?: boolean }) =>
  trpc.registry.getAppBySlug.useQuery({ slug }, options);

export const useInstallApp = (
  options?: MutOpts<typeof trpc.registry.installApp.useMutation>,
) => trpc.registry.installApp.useMutation(options);

export const useSyncInstallation = (
  options?: MutOpts<typeof trpc.registry.syncInstallation.useMutation>,
) => trpc.registry.syncInstallation.useMutation(options);

export const useOptimizeSite = (
  options?: MutOpts<typeof trpc.registry.optimizeSite.useMutation>,
) => trpc.registry.optimizeSite.useMutation(options);

export const useRegisterApp = (
  options?: MutOpts<typeof trpc.registry.registerApp.useMutation>,
) => trpc.registry.registerApp.useMutation(options);

export const useUpdateApp = (
  options?: MutOpts<typeof trpc.registry.updateApp.useMutation>,
) => trpc.registry.updateApp.useMutation(options);

export const useTogglePublishApp = (
  options?: MutOpts<typeof trpc.registry.togglePublishApp.useMutation>,
) => trpc.registry.togglePublishApp.useMutation(options);

export const useDeleteApp = (
  options?: MutOpts<typeof trpc.registry.deleteApp.useMutation>,
) => trpc.registry.deleteApp.useMutation(options);

export const useExecuteAction = (
  options?: MutOpts<typeof trpc.registry.executeAction.useMutation>,
) => trpc.registry.executeAction.useMutation(options);

export const useGenerateAndPublish = (
  options?: MutOpts<typeof trpc.registry.generateAndPublish.useMutation>,
) => trpc.registry.generateAndPublish.useMutation(options);

export const useRefreshAnalyticsData = (
  options?: MutOpts<typeof trpc.registry.refreshAnalyticsData.useMutation>,
) => trpc.registry.refreshAnalyticsData.useMutation(options);
