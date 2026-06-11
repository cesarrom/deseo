/// <reference types="node" />
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

import { apiFetch } from '@/utils/api';

// Notice this is a plain object, not a call to NextAuth()
export default {
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // GitHub({
    //   clientId: process.env.GITHUB_CLIENT_ID,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false;
      
      try {
        const response = await apiFetch('/trpc/auth.syncUser', {
          method: 'POST',
          isTrpc: true,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          // Since this is during signIn, we don't have a session ID yet.
          // We pass the raw access token so the backend can verify us if needed.
          token: account.access_token,
          body: {
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Failed to sync user with backend:', response.status, text);
          return false; // Reject sign in
        }
        
        const result = await response.json();
        // Attach the backend database ID to the JWT user
        if (result?.result?.data?.[0]?.id) {
          user.id = result.result.data[0].id;
        }

        return true;
      } catch (error) {
        console.error('Error syncing user:', error);
        return false;
      }
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
