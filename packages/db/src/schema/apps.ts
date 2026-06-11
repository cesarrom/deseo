import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const appType = ['feature:git', 'feature:cms', 'feature:analytics'] as const;

export const apps = pgTable('apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  type: text('type', { enum: appType }).notNull(),
  baseUrl: text('base_url').notNull(), // The connector's root URL
  configUrl: text('config_url').notNull(), // Where to send users to configure (relative to baseUrl)
  webhookUrl: text('webhook_url'), // Where the hub sends events to the connector
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret').notNull(),
  isInternal: text('is_internal').notNull().default('false'), // Mark if it's our own connector
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const installations = pgTable(
  'installations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    config: jsonb('config'), // Store non-sensitive installation settings
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('installation_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      `,
      withCheck: sql`
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      `,
    }),
  ]
);

// For secure state exchange during handshakes
export const authGrants = pgTable(
  'auth_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .references(() => clients.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('grant_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        (current_setting('app.active_client_id', true) = '' AND 
         exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid))
        OR 
        (client_id = current_setting('app.active_client_id', true)::uuid)
      `,
      withCheck: sql`
        (client_id IS NULL AND user_id = current_setting('app.current_user_id', true)::uuid)
        OR
        client_id = current_setting('app.active_client_id', true)::uuid
        OR
        exists (select 1 from clients where id = client_id and user_id = current_setting('app.current_user_id', true)::uuid)
      `,
    }),
  ]
);
