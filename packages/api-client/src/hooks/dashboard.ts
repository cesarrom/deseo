import { trpc } from '../react';

export const useAnalyticsDashboard = (
  input: { appSlug: string; siteUrl: string },
  options?: { enabled?: boolean },
) => trpc.dashboard.getAnalyticsDashboard.useQuery(input, options);
