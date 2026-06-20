import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const protectedRoutesRegexes = [/^\/dashboard\/.*/];

export const proxy = auth((req) => {
  const session = req.auth;
  const url = req.nextUrl;
  if (!session && protectedRoutesRegexes.some((regex) => regex.test(url.pathname))) {
    return Response.redirect(new URL('/auth/signin', url));
  }

  return NextResponse.next();

  // The 'authorized' callback in auth.config.ts will handle the logic
});

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
