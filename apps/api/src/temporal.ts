import { Connection, Client } from '@temporalio/client';

let client: Client | null = null;

export async function getTemporalClient() {
  if (client) return client;

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_URL || '127.0.0.1:7233',
  });

  client = new Client({
    connection,
  });

  return client;
}
