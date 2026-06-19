import { pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const payloadConfigs = pgTable('payload_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  deseoUserId: uuid('deseo_user_id').notNull().unique(),
  instanceUrl: text('instance_url').notNull(),
  apiKey: text('api_key').notNull(),
  collection: text('collection').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('deseo_user_id_idx').on(table.deseoUserId),
]);
