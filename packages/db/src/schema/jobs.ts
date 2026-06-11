import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const jobType = ['article_generation', 'seo_optimization', 'keyword_research'] as const;
export const jobStatus = ['pending', 'running', 'completed', 'failed'] as const;

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    type: text('type', { enum: jobType }).notNull(),
    status: text('status', { enum: jobStatus }).notNull().default('pending'),
    workflowId: text('workflow_id'),
    runId: text('run_id'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (_table) => [
    pgPolicy('job_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = jobs.client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      `,
      withCheck: sql`
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = jobs.client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      `,
    }),
  ]
);
