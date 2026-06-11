import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const articleStatus = ['draft', 'pending_review', 'approved', 'published', 'archived'] as const;

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    status: text('status', { enum: articleStatus }).notNull().default('draft'),
    astContent: jsonb('ast_content').notNull(),
    targetCms: text('target_cms'),
    cmsPublishedId: text('cms_published_id'),
    keywords: jsonb('keywords'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (_table) => [
    pgPolicy('article_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = articles.client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      `,
      withCheck: sql`
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = articles.client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      `,
    }),
  ]
);
