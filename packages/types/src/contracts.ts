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

export interface GitDashboardData {
  recentCommits: {
    sha: string;
    message: string;
    author: string;
    date: string;
  }[];
  openPullRequests: GitPullRequest[];
  activityOverTime: { date: string; count: number }[];
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
  getDashboardData(repository: string): Promise<GitDashboardData>;
import { ArticleAST } from './article';

// --- Domain Objects (Standardized across all connectors) ---

export interface UnifiedPost {
  externalId: string;
  title: string;
  slug: string;
  content: ArticleAST; // Strict Deseo AST
  status: 'draft' | 'published' | 'scheduled';
  author?: string;
  publishedAt?: string;
  updatedAt: string;
  excerpt?: string;
  featuredImage?: string;
  categories?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UnifiedKeywordData {
  query: string;
  date: string; // ISO format
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

// --- Git Contract (feature:git) ---
...
// --- CMS Contract (feature:cms) ---

export interface CMSCollection {
  slug: string;
  name: string;
  fields: string[];
}

export interface CMSDashboardData {
  stats: {
    published: number;
    drafts: number;
    scheduled: number;
  };
  recentArticles: {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
  }[];
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
  getDashboardData(): Promise<CMSDashboardData>;
  /**
   * Deep Sync: Fetch all existing posts in a unified format
   */
  syncPosts(params: { collection: string; limit?: number; offset?: number }): Promise<UnifiedPost[]>;
}

// --- Analytics Contract (feature:analytics) ---

export interface KeywordMetric {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

export interface AnalyticsDashboardData {
  summary: {
    totalClicks: number;
    totalImpressions: number;
    averagePosition: number;
    averageCTR: number;
  };
  topKeywords: KeywordMetric[];
  trend: { date: string; clicks: number; impressions: number }[];
}

export interface AnalyticsProviderContract {
  listSites(): Promise<{ siteUrl: string; permissionLevel: string }[]>;
  fetchKeywordPerformance(params: {
    startDate: string;
    endDate: string;
    siteUrl: string;
  }): Promise<KeywordMetric[]>;
  getDashboardData(siteUrl: string): Promise<AnalyticsDashboardData>;
  /**
   * Deep Sync: Fetch historical keyword data in a unified format
   */
  syncKeywords(params: { siteUrl: string; startDate: string; endDate: string }): Promise<UnifiedKeywordData[]>;
}

