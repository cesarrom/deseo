'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { InitialOnboarding } from '@/components/initial-onboarding';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('🔄 CLIENT GUARD: No session, redirecting to signin');
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null; // Let the useEffect handle the redirect
  }

  return (
    <>
      <InitialOnboarding />
      <div className="min-h-screen bg-slate-50">
        <DashboardSidebar />
        <div className="pl-64">
          <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-8">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-500">Workspace</span>
            </div>
          </header>
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
