import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const githubTokens = pgTable('github_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  deseoUserId: uuid('deseo_user_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('github_user_id_idx').on(table.deseoUserId),
]);
