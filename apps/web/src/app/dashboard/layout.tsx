import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { ClientProvider } from '@/providers/client-provider';
import { InitialOnboarding } from '@/components/initial-onboarding';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientProvider>
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
    </ClientProvider>
  );
}
