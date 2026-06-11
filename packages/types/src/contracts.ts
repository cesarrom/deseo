/**
 * Connector Contracts
 * Defines the standard interface for communication between 
 * the Deseo Hub and the specialized Connector Spokes.
 */

// --- Base Contract ---

export interface ConnectorResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// --- Git Contract (feature:git) ---

export interface GitRepository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface GitPullRequest {
  id: string;
  number: number;
  url: string;
  title: string;
  status: 'open' | 'merged' | 'closed';
}

export interface GitProviderContract {
  listRepositories(): Promise<GitRepository[]>;
  createPullRequest(params: {
    repository: string;
    title: string;
    body: string;
    head: string; // The branch with changes
    base: string; // The target branch (usually defaultBranch)
  }): Promise<GitPullRequest>;
  // Future: clone, commit, etc.
}

// --- CMS Contract (feature:cms) ---

export interface CMSCollection {
  slug: string;
  name: string;
  fields: string[];
}

export interface CMSProviderContract {
  listCollections(): Promise<CMSCollection[]>;
  publishArticle(params: {
    collection: string;
    title: string;
    slug: string;
    content: any; // AST Content
    metadata?: Record<string, any>;
  }): Promise<{ id: string; url?: string }>;
}

// --- Analytics Contract (feature:analytics) ---

export interface KeywordMetric {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export interface AnalyticsProviderContract {
  fetchKeywordPerformance(params: {
    startDate: string;
    endDate: string;
    siteUrl: string;
  }): Promise<KeywordMetric[]>;
}
