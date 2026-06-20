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
      const isUuid = (id: string | null | undefined) => 
        id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const userId = isUuid(context.userId) ? context.userId : '';
      const activeClientId = isUuid(context.activeClientId) ? context.activeClientId : '';

      console.log('🔒 withRLS: Setting session variables...', { 
        userId, 
        activeClientId,
        isInternal: context.isInternal 
      });

      // Use set_config function as it supports parameters unlike "SET LOCAL"
      await tx.execute(
        sql`SELECT set_config('app.current_user_id', ${userId}, true)`
      );

      await tx.execute(
        sql`SELECT set_config('app.active_client_id', ${activeClientId}, true)`
      );

      await tx.execute(
        sql`SELECT set_config('app.is_internal', ${context.isInternal ? 'true' : 'false'}, true)`
      );

      const verify = await tx.execute(
        sql`SELECT current_setting('app.current_user_id', true) as user_id, current_setting('app.is_internal', true) as is_internal`
      );
      console.log('🛡️ RLS SESSION VERIFIED:', verify[0]);

      console.log('🔓 withRLS: Session variables set. Executing callback...');
      return await callback(tx);
    } catch (e) {
      console.error('💥 withRLS error:', e);
      throw e;
    } finally {
      // Postgres handles cleanup automatically for session variables at end of transaction
      // because we used "set local" (third param true in set_config)
    }
  });
}
