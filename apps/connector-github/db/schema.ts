import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const githubTokens = pgTable('github_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  deseoUserId: uuid('deseo_user_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  installationId: text('installation_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('github_user_id_idx').on(table.deseoUserId),
]);

export const repoConfig = pgTable('repo_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  deseoUserId: uuid('deseo_user_id').notNull().unique(),
  repository: text('repository'),
  branch: text('branch'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
