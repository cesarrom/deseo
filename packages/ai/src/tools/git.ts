import { tool } from 'ai';
import { z } from 'zod';
import axios from 'axios';

interface ConnectorActionParams {
  userId: string;
  appSlug: string;
  actionPath: string;
  method: 'GET' | 'POST';
  payload?: any;
}

// Implement callConnectorAction inside AI package to keep it independent
async function callConnectorAction(params: ConnectorActionParams): Promise<any> {
  const HUB_URL = process.env.HUB_URL || 'http://localhost:3001/trpc';
  const internalSecret = process.env.AUTH_SECRET || 'development_secret_123_fallback';

  try {
    const response = await axios.post(
      `${HUB_URL}/registry.executeAction`,
      {
        json: {
          appSlug: params.appSlug,
          actionPath: params.actionPath,
          method: params.method,
          payload: params.payload,
        },
      },
      {
        headers: {
          'x-internal-secret': internalSecret,
          Authorization: `Bearer ${params.userId}`,
        },
      }
    );

    if (response.data.error) {
      throw new Error(`Hub error: ${response.data.error.json.message}`);
    }

    return response.data.result.data.json;
  } catch (error: any) {
    throw new Error(`Failed to execute connector action: ${error.message}`);
  }
}

export function createGitTools(config: { userId: string; appSlug: string }) {
  return {
    createBranch: tool({
      description: 'Creates a new git branch from a base branch.',
      parameters: z.object({
        repository: z.string().describe('The repository name, e.g., owner/repo'),
        branchName: z.string().describe('The name of the new branch to create'),
        baseBranch: z.string().optional().describe('The base branch to branch off from (optional)'),
      }),
      execute: async ({ repository, branchName, baseBranch }) => {
        return callConnectorAction({
          userId: config.userId,
          appSlug: config.appSlug,
          actionPath: '/feature/git/branch',
          method: 'POST',
          payload: { repository, branchName, baseBranch },
        });
      },
    }),

    commitFiles: tool({
      description: 'Commits multiple files to a git branch in a single operation.',
      parameters: z.object({
        repository: z.string().describe('The repository name, e.g., owner/repo'),
        branchName: z.string().describe('The branch to commit to'),
        message: z.string().describe('The commit message'),
        files: z.array(z.object({
          path: z.string().describe('The file path in the repository'),
          content: z.string().describe('The file content'),
          encoding: z.enum(['utf-8', 'base64']).optional().describe('Encoding of the content'),
        })).describe('List of files to commit'),
      }),
      execute: async ({ repository, branchName, message, files }) => {
        return callConnectorAction({
          userId: config.userId,
          appSlug: config.appSlug,
          actionPath: '/feature/git/commit',
          method: 'POST',
          payload: { repository, branchName, message, files },
        });
      },
    }),

    readFileOrTree: tool({
      description: 'Reads a file content or lists a directory tree from a git repository.',
      parameters: z.object({
        repository: z.string().describe('The repository name, e.g., owner/repo'),
        branch: z.string().optional().describe('The branch to read from'),
        path: z.string().optional().describe('The specific file or directory path'),
      }),
      execute: async ({ repository, branch, path }) => {
        const query = new URLSearchParams();
        query.set('repository', repository);
        if (branch) query.set('branch', branch);
        if (path) query.set('path', path);

        return callConnectorAction({
          userId: config.userId,
          appSlug: config.appSlug,
          actionPath: `/feature/git/files?${query.toString()}`,
          method: 'GET',
        });
      },
    }),

    createPullRequest: tool({
      description: 'Creates a Pull Request.',
      parameters: z.object({
        repository: z.string().describe('The repository name, e.g., owner/repo'),
        title: z.string().describe('The PR title'),
        body: z.string().describe('The PR body description'),
        head: z.string().describe('The branch containing the changes'),
        base: z.string().describe('The branch to merge into'),
      }),
      execute: async ({ repository, title, body, head, base }) => {
        return callConnectorAction({
          userId: config.userId,
          appSlug: config.appSlug,
          actionPath: '/feature/git/pr',
          method: 'POST',
          payload: { repository, title, body, head, base },
        });
      },
    }),
  };
}
