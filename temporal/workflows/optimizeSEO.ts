import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/index';

const { callConnectorAction } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
});

export interface OptimizeSEOInput {
  userId: string;
  appSlug: string; // e.g., 'github'
}

export async function optimizeSEOWorkflow(input: OptimizeSEOInput): Promise<string> {
  // 1. Fetch repositories from the connector to verify access
  const reposResponse = await callConnectorAction({
    userId: input.userId,
    appSlug: input.appSlug,
    actionPath: 'git/repositories',
    method: 'GET',
  });

  if (!reposResponse.success) {
    throw new Error('Failed to fetch repositories from connector');
  }

  const targetRepo = reposResponse.data[0];
  if (!targetRepo) throw new Error('No repositories found');

  // 2. Trigger the automated scan and fix
  const scanResponse = await callConnectorAction({
    userId: input.userId,
    appSlug: input.appSlug,
    actionPath: 'git/scan-and-fix',
    method: 'POST',
    payload: {
      repository: targetRepo.fullName,
    },
  });

  if (!scanResponse.success) {
    throw new Error(`Scan and Fix failed: ${scanResponse.error}`);
  }

  return scanResponse.data.prUrl;
}
