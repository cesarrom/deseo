export type JobType = 'article_generation' | 'seo_optimization' | 'keyword_research';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  clientId: string;
  type: JobType;
  status: JobStatus;
  workflowId?: string;
  runId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
