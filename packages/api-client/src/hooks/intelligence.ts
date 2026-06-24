import { trpc } from '../react';

type MutOpts<T extends (...args: never[]) => unknown> = Parameters<T>[0];

export const useSuggestions = (
  input?: { productId?: string },
  options?: { enabled?: boolean },
) => trpc.intelligence.listSuggestions.useQuery(input ?? {}, options);

export const useModels = (options?: { enabled?: boolean }) =>
  trpc.intelligence.listModels.useQuery(undefined, options);

export const useConvertDiscovery = (
  options?: MutOpts<typeof trpc.intelligence.convertDiscovery.useMutation>,
) => trpc.intelligence.convertDiscovery.useMutation(options);

export const useGenerateCustomSuggestions = (
  options?: MutOpts<typeof trpc.intelligence.generateCustomSuggestions.useMutation>,
) => trpc.intelligence.generateCustomSuggestions.useMutation(options);

export const useRejectSuggestion = (
  options?: MutOpts<typeof trpc.intelligence.rejectSuggestion.useMutation>,
) => trpc.intelligence.rejectSuggestion.useMutation(options);

export const useDiscoverTrendingKeywords = (
  options?: MutOpts<typeof trpc.intelligence.discoverTrendingKeywords.useMutation>,
) => trpc.intelligence.discoverTrendingKeywords.useMutation(options);
