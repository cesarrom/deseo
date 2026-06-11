import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { withRLS, type DbTransaction } from '@deseo/db';
import { getTemporalClient } from './temporal';
import { decode } from 'next-auth/jwt';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const temporal = await getTemporalClient();
  
  // 1. Check for Internal Server-to-Server Requests
  const internalSecretHeader = req.headers['x-internal-secret'];
  const expectedInternalSecret = process.env.AUTH_SECRET || 'development_secret_123_fallback';
  const isInternal = internalSecretHeader === expectedInternalSecret;

  // 2. Extract Token (Bearer header takes precedence, fallback to NextAuth cookie for direct client calls)
  const authHeader = req.headers.authorization;
  let rawToken = null;
  let user: { id: string; name?: string | null; email?: string | null; role?: string } | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.split(' ')[1];
  } else {
    rawToken = req.cookies['authjs.session-token'] || req.cookies['__Secure-authjs.session-token'];
  }

  if (rawToken) {
    try {
      // First, try decoding it as a standard Auth.js JWT
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
        // If it failed to decode as JWT, but it's an internal request, 
        // it might be a raw Provider Access Token (passed during signIn)
        // or a raw DB ID. We trust internal requests.
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
