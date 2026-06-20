'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useClient } from '@/providers/client-provider';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { status } = useSession();
  const { clients, isLoading } = useClient();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading' || isLoading) return;

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (clients.length === 0) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  }, [status, clients, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-slate-400 font-medium animate-pulse">Initializing Deseo...</p>
      </div>
    </div>
  );
}
