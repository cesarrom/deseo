import { BaseConnectorRepository } from './base';
import { GitProviderContract, GitRepository, GitPullRequest, GitDashboardData } from '@deseo/types';

export class GitRepositoryImpl extends BaseConnectorRepository implements GitProviderContract {
  async listRepositories(): Promise<GitRepository[]> {
    return this.request('GET', '/api/feature/git/repositories');
  }

  async createPullRequest(params: {
    repository: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }): Promise<GitPullRequest> {
    return this.request('POST', '/api/feature/git/pr', params);
  }

  async getDashboardData(repository: string): Promise<GitDashboardData> {
    return this.request('GET', '/api/feature/git/dashboard', { repository });
  }
}
