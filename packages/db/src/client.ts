import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgres://deseo:deseo_dev_password@localhost:5432/deseo_dev';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

type ExtractTx<T> = T extends (cb: (tx: infer Tx) => any) => any ? Tx : never;
export type DbTransaction = ExtractTx<typeof db.transaction>;

export async function withRLS<T>(
  context: { userId?: string | null; activeClientId?: string | null; isInternal?: boolean },
  callback: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    try {
      if (context.userId) {
        await tx.execute(sql`set local app.current_user_id = ${context.userId}`);
      } else {
        await tx.execute(sql`set local app.current_user_id = ''`);
      }

      if (context.activeClientId) {
        await tx.execute(sql`set local app.active_client_id = ${context.activeClientId}`);
      } else {
        await tx.execute(sql`set local app.active_client_id = ''`);
      }

      if (context.isInternal) {
        await tx.execute(sql`set local app.is_internal = 'true'`);
      } else {
        await tx.execute(sql`set local app.is_internal = 'false'`);
      }

      return await callback(tx);
    } finally {
      // Clean up variables is handled automatically by Postgres at the end of the transaction
      // because we used "set local"
    }
  });
}
