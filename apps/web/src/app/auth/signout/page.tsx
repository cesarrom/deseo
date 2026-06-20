'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function SignOutPage() {
  useEffect(() => {
    // Perform deep cleanup of the session and strictly redirect to sign in
    signOut({ callbackUrl: '/auth/signin', redirect: true });
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-600 font-medium">Cleaning up session and signing out...</p>
    </div>
  );
}
