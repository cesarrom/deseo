import { pgTable, text, timestamp, uuid, pgPolicy, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    domain: text('domain').notNull(), // The GSC siteUrl or primary domain
    type: text('type').notNull().default('website'), // 'website', 'app', 'blog'
    config: jsonb('config').default({}), // Store connector-specific mapping (e.g., GSC siteUrl, CMS collection slug)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('products_client_domain_idx').on(table.clientId, table.domain),
    pgPolicy('product_client_isolation', {
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
