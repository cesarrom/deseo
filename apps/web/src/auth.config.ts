/// <reference types="node" />
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';
import { apiFetch } from '@/utils/api';

export default {
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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
          token: account.access_token || undefined,
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
          console.error('❌ SIGNIN SYNC FAILED:', response.status, text);
          return false;
        }
        
        const result = await response.json();
        const userData = result?.result?.data?.json || result?.result?.data;
        
        if (userData?.id) {
          // IMPORTANT: Mutate the user object ID so the 'jwt' callback uses the Database UUID
          user.id = userData.id;
          console.log('🔑 SYNC SUCCESS: Database UUID is', user.id);
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
      
      console.log('🛡️ PROXY AUTH CHECK:', { 
        path: nextUrl.pathname, 
        isLoggedIn, 
        userId: auth?.user?.id 
      });

      if (isDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to login
      }
      return true;
    },
    async jwt({ token, user }) {
      // During initial sign in, 'user' is the object we mutated in signIn()
      if (user && user.id) {
        console.log('🎫 JWT CALLBACK: Persisted Database UUID into Token:', user.id);
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
