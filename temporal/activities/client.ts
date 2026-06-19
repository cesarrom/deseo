import { db, clients } from '@deseo/db';
import { eq } from 'drizzle-orm';

export async function getClientModelPreference(clientId: string): Promise<string> {
  console.log(`🔍 [Client] Fetching model preference for client: ${clientId}`);
  if (!clientId) {
    console.warn('⚠️ [Client] No clientId provided to getClientModelPreference, using default.');
    return 'openai/gpt-4o';
  }

  const [client] = await db
    .select({ aiModelPreference: clients.aiModelPreference })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  const model = client?.aiModelPreference || 'openai/gpt-4o';
  console.log(`✅ [Client] Model preference for ${clientId}: ${model}`);
  return model;
}
