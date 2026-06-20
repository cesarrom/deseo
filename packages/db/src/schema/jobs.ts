import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';
import { articles } from './articles';

export const jobStatus = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'generate_article', 'keyword_research', 'optimize_seo'
    status: text('status', { enum: jobStatus }).notNull().default('pending'),
    temporalWorkflowId: text('temporal_workflow_id'),
    temporalRunId: text('temporal_run_id'),
    inputPayload: jsonb('input_payload'),
    outputPayload: jsonb('output_payload'),
    errorDetails: text('error_details'),
    relatedArticleId: uuid('related_article_id')
      .references(() => articles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    pgPolicy('job_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = ${table.clientId} and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        (${table.clientId} = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      `,
      withCheck: sql`
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = ${table.clientId} and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        (${table.clientId} = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      `,
    }),
  ]
);
