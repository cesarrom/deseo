import { callConnectorAction } from './connector';

export interface GitBranchParams {
  appSlug: string;
  userId: string;
  repository: string;
  branchName: string;
  baseBranch?: string;
}

export interface GitCommitParams {
  appSlug: string;
  userId: string;
  repository: string;
  branchName: string;
  message: string;
  files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>;
}

export interface GitFilesParams {
  appSlug: string;
  userId: string;
  repository: string;
  branch?: string;
  path?: string;
}

export interface GitPRParams {
  appSlug: string;
  userId: string;
  repository: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export async function createGitBranchActivity(params: GitBranchParams): Promise<{ branchName: string; sha: string }> {
  return callConnectorAction({
    userId: params.userId,
    appSlug: params.appSlug,
    actionPath: '/feature/git/branch',
    method: 'POST',
    payload: {
      repository: params.repository,
      branchName: params.branchName,
      baseBranch: params.baseBranch,
    },
  });
}

export async function commitGitFilesActivity(params: GitCommitParams): Promise<{ commitSha: string }> {
  return callConnectorAction({
    userId: params.userId,
    appSlug: params.appSlug,
    actionPath: '/feature/git/commit',
    method: 'POST',
    payload: {
      repository: params.repository,
      branchName: params.branchName,
      message: params.message,
      files: params.files,
    },
  });
}

export async function readGitFilesActivity(params: GitFilesParams): Promise<any> {
  const query = new URLSearchParams();
  query.set('repository', params.repository);
  if (params.branch) query.set('branch', params.branch);
  if (params.path) query.set('path', params.path);

  return callConnectorAction({
    userId: params.userId,
    appSlug: params.appSlug,
    actionPath: `/feature/git/files?${query.toString()}`,
    method: 'GET',
  });
}

export async function createGitPRActivity(params: GitPRParams): Promise<{ prUrl: string; prNumber: number }> {
  return callConnectorAction({
    userId: params.userId,
    appSlug: params.appSlug,
    actionPath: '/feature/git/pr',
    method: 'POST',
    payload: {
      repository: params.repository,
      title: params.title,
      body: params.body,
      head: params.head,
      base: params.base,
    },
  });
}
