import axios, { type AxiosInstance } from 'axios';

export interface GitLabConfig {
  accessToken: string;
  baseURL?: string;
}

export class GitLabClient {
  private client: AxiosInstance;

  constructor(config: GitLabConfig) {
    this.client = axios.create({
      baseURL: config.baseURL || 'https://gitlab.com/api/v4',
      headers: {
        'PRIVATE-TOKEN': config.accessToken,
      },
    });
  }

  async createMergeRequest(params: {
    projectId: number;
    sourceBranch: string;
    targetBranch: string;
    title: string;
    description?: string;
  }) {
    const { data } = await this.client.post(
      `/projects/${params.projectId}/merge_requests`,
      {
        source_branch: params.sourceBranch,
        target_branch: params.targetBranch,
        title: params.title,
        description: params.description,
      }
    );
    return data;
  }

  async createBranch(params: {
    projectId: number;
    branchName: string;
    ref?: string;
  }) {
    const { data } = await this.client.post(
      `/projects/${params.projectId}/repository/branches`,
      {
        branch: params.branchName,
        ref: params.ref || 'main',
      }
    );
    return data;
  }

  async updateFile(params: {
    projectId: number;
    filePath: string;
    branch: string;
    content: string;
    commitMessage: string;
  }) {
    const { data } = await this.client.put(
      `/projects/${params.projectId}/repository/files/${encodeURIComponent(params.filePath)}`,
      {
        branch: params.branch,
        content: params.content,
        commit_message: params.commitMessage,
      }
    );
    return data;
  }

  async getProject(projectId: number) {
    const { data } = await this.client.get(`/projects/${projectId}`);
    return data;
  }

  async listProjects() {
    const { data } = await this.client.get('/projects', {
      params: { membership: true, per_page: 100 },
    });
    return data;
  }
}
