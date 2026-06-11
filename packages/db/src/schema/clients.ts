import { pgTable, text, timestamp, uuid, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    aiModelPreference: text('ai_model_preference').default('gpt-4o'),
    customData: jsonb('custom_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('client_owner_isolation', {
      for: 'all',
      to: 'public',
      using: sql`user_id = current_setting('app.current_user_id', true)::uuid`,
      withCheck: sql`user_id = current_setting('app.current_user_id', true)::uuid`,
    }),
  ]
);
