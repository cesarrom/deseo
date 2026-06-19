import { pgTable, text, timestamp, uuid, jsonb, pgPolicy, integer, real, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';
import { articles } from './articles';
import { products } from './products';

export const suggestionType = ['new_article', 'remix', 'update', 'seo_fix', 'discovery'] as const;
export const suggestionStatus = ['pending', 'approved', 'rejected', 'converted'] as const;

export const suggestions = pgTable(
  'suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' }),
    type: text('type', { enum: suggestionType }).notNull(),
    status: text('status', { enum: suggestionStatus }).notNull().default('pending'),
    title: text('title').notNull(),
    description: text('description'),
    context: jsonb('context'), // Stores keywords, source article ID for remixes, etc.
    aiReasoning: text('ai_reasoning'),
    targetArticleId: uuid('target_article_id') // For updates/remixes
      .references(() => articles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    pgPolicy('suggestion_client_isolation', {
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

export const performanceMetrics = pgTable(
  'performance_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .references(() => articles.id, { onDelete: 'cascade' }),
    keyword: text('keyword'), // The query string
    date: timestamp('date').notNull(),
    clicks: integer('clicks').notNull().default(0),
    impressions: integer('impressions').notNull().default(0),
    position: real('position'), // Store as number for math
    ctr: real('ctr'), 
    source: text('source').notNull().default('gsc'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('perf_idx').on(table.clientId, table.productId, table.articleId, table.keyword, table.date),
    pgPolicy('performance_client_isolation', {
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
