import { Router } from 'express';
import { encode } from 'next-auth/jwt';
import { withRLS, users } from '@deseo/db';
import { eq } from 'drizzle-orm';

export const authRouter = Router();

interface GoogleTokenInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  aud: string;
  exp: string;
  iss: string;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) throw new Error('Invalid Google ID token');
  const info = await res.json() as GoogleTokenInfo;

  // Verify the token is for our iOS client
  const validAudiences = [
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ].filter(Boolean);

  if (validAudiences.length > 0 && !validAudiences.includes(info.aud)) {
    throw new Error('ID token audience mismatch');
  }

  const now = Math.floor(Date.now() / 1000);
  if (parseInt(info.exp) < now) throw new Error('ID token expired');

  return info;
}

async function syncUser(input: {
  email: string;
  name?: string;
  image?: string;
  providerAccountId: string;
}) {
  return withRLS({ isInternal: true }, async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existing) {
      const [updated] = await tx
        .update(users)
        .set({
          name: input.name ?? existing.name,
          image: input.image ?? existing.image,
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated!;
    }

    const [inserted] = await tx
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        image: input.image,
      })
      .returning();
    return inserted!;
  });
}

authRouter.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    // 1. Verify the Google ID token
    const googleUser = await verifyGoogleIdToken(idToken);

    // 2. Upsert user in DB (same logic as NextAuth signIn callback)
    const dbUser = await syncUser({
      email: googleUser.email,
      name: googleUser.name,
      image: googleUser.picture,
      providerAccountId: googleUser.sub,
    });

    // 3. Issue a NextAuth-compatible JWT so the existing context.ts decodes it correctly
    const secret = process.env.AUTH_SECRET ?? 'development_secret_123';
    const token = await encode({
      token: {
        sub: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.image,
      },
      secret,
      salt: 'authjs.session-token',
    });

    res.json({ token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    console.error('❌ Mobile Google auth error:', message);
    res.status(401).json({ error: message });
  }
});
