import { pgTable, text, timestamp, uuid, primaryKey, integer, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AdapterAccountType } from '@auth/core/adapters';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    image: text('image'),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('user_self_access', {
      for: 'all',
      to: 'public',
      using: sql`id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.is_internal', true) = 'true'`,
      withCheck: sql`id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR current_setting('app.is_internal', true) = 'true'`,
    }),
  ]
);

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);
