import { pgTable, text, timestamp, uuid, jsonb, pgPolicy, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const apps = pgTable(
  'apps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(), // e.g., 'payload-cms'
    name: text('name').notNull(), // e.g., 'Payload CMS Connector'
    type: text('type').notNull(), // 'feature:cms', 'feature:git', 'feature:analytics'
    baseUrl: text('base_url').notNull(), // URL of the connector API
    configUrl: text('config_url'), // URL for UI configuration
    settingsUrl: text('settings_url'), // URL for UI settings after installation
    webhookUrl: text('webhook_url'), // Hub URL to receive events
    description: text('description'),
    iconUrl: text('icon_url'),
    clientId: text('client_id').notNull(), // API Client ID for the connector
    clientSecret: text('client_secret').notNull(), // API Secret for the connector
    userId: uuid('user_id') // Developer who registered the app
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isPublished: boolean('is_published').default(false).notNull(), // Public vs Private
    isInternal: boolean('is_internal').default(false).notNull(), // Built-in apps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const installations = pgTable(
  'installations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    userId: uuid('user_id') // The Deseo user who installed it
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id') // Optional: scope installation to a specific client/workspace
      .references(() => clients.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending', 'active', 'error'
    config: jsonb('config'), // Store user-specific app config locally if needed
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('installation_user_app_client_idx').on(table.userId, table.appId, table.clientId),
    pgPolicy('installation_client_isolation', {
      for: 'all',
      to: 'public',
      using: sql`
        (${table.clientId} IS NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        OR
        (NULLIF(current_setting('app.active_client_id', true), '') IS NULL AND 
         exists (select 1 from clients where id = ${table.clientId} and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        OR 
        (${table.clientId} = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
      `,
      withCheck: sql`
        (${table.clientId} IS NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        OR
        (${table.clientId} = NULLIF(current_setting('app.active_client_id', true), '')::uuid)
        OR
        exists (select 1 from clients where id = ${table.clientId} and user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      `,
    }),
  ]
);

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
  }
);
