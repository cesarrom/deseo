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
    aiModelPreference: text('ai_model_preference').default('openai/gpt-4o'),
    aiSmartModel: text('ai_smart_model').default('anthropic/claude-sonnet-4-6'),
    aiFastModel: text('ai_fast_model').default('openrouter/free'),
    aiImageModel: text('ai_image_model').default('openai/dall-e-3'),
    customData: jsonb('custom_data'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    pgPolicy('client_owner_isolation', {
      for: 'all',
      to: 'public',
      using: sql`${table.userId} = NULLIF(current_setting('app.current_user_id', true), '')::uuid`,
      withCheck: sql`${table.userId} = NULLIF(current_setting('app.current_user_id', true), '')::uuid`,
    }),
  ]
);
