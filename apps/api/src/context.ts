import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { withRLS, type DbTransaction, apiKeys } from '@deseo/db';
import { getTemporalClient } from './temporal';
import { decode } from 'next-auth/jwt';
import { eq } from 'drizzle-orm';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const temporal = await getTemporalClient();
  
  // 1. Check for Internal Server-to-Server Requests
  const internalSecretHeader = req.headers['x-internal-secret'];
  const expectedInternalSecret = process.env.AUTH_SECRET || 'development_secret_123_fallback';
  const isInternal = internalSecretHeader === expectedInternalSecret;

  // 2. Extract Token (Bearer header takes precedence, fallback to NextAuth cookie for direct client calls)
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  let rawToken = null;
  let user: { id: string; name?: string | null; email?: string | null; role?: string } | null = null;

  if (apiKeyHeader) {
    // API Key Authentication
    const result = await withRLS({ isInternal: true }, async (tx) => {
      const [keyEntry] = await tx
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.key, apiKeyHeader))
        .limit(1);
      
      if (keyEntry) {
        // Update last used
        await tx.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyEntry.id));
        return { id: keyEntry.userId };
      }
      return null;
    });

    if (result) {
      user = result;
    }
  }

  if (!user) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.split(' ')[1];
    } else {
      // Check for both NextAuth v4 and v5 (Auth.js) cookie names
      rawToken = 
        req.cookies['authjs.session-token'] || 
        req.cookies['__Secure-authjs.session-token'] ||
        req.cookies['next-auth.session-token'] ||
        req.cookies['__Secure-next-auth.session-token'];
    }

    if (rawToken) {
      try {
        const decoded = await decode({
          token: rawToken,
          secret: process.env.AUTH_SECRET || 'development_secret_123',
          salt: 'authjs.session-token', // Auth.js v5 default
        });
        
        if (decoded && decoded.sub) {
          user = {
            id: decoded.sub as string,
            name: decoded.name,
            email: decoded.email,
          };
        } else if (isInternal) {
          user = { id: rawToken, role: 'internal_sync' };
        }
      } catch (error) {
        if (isInternal) {
          user = { id: rawToken, role: 'internal_sync' };
        } else {
          console.error('Failed to decode session token:', error);
        }
      }
    }
  }

  const activeClientId = req.headers['x-active-client-id'] as string | undefined;

  return {
    withDB: <T>(cb: (tx: DbTransaction) => Promise<T>) => 
      withRLS({ userId: user?.id, activeClientId, isInternal }, cb),
    temporal,
    user,
    activeClientId,
    isInternal,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
