import { pgTable, text, timestamp, uuid, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const gscTokens = pgTable('gsc_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  deseoUserId: uuid('deseo_user_id').notNull().unique(),
  tokens: jsonb('tokens').notNull(), // Stores access_token, refresh_token, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('gsc_user_id_idx').on(table.deseoUserId),
]);
