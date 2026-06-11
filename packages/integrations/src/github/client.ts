import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  accessToken: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.accessToken,
    });
  }

  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
  }) {
    const { data } = await this.octokit.pulls.create(params);
    return data;
  }

  async createBranch(params: {
    owner: string;
    repo: string;
    branchName: string;
    fromBranch?: string;
  }) {
    const { owner, repo, branchName, fromBranch = 'main' } = params;

    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  }

  async updateFile(params: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch: string;
  }) {
    const { owner, repo, path, content, message, branch } = params;

    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, create new
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha,
    });
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data;
  }

  async listRepositories() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
    });
    return data;
  }
}
