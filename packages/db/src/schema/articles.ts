import { pgTable, text, timestamp, uuid, jsonb, pgPolicy, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';
import { products } from './products';

export const articleStatus = ['draft', 'pending_review', 'approved', 'published', 'archived'] as const;

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'set null' }),
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
  (table) => [
    uniqueIndex('articles_client_slug_idx').on(table.clientId, table.slug),
    pgPolicy('article_client_isolation', {
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
