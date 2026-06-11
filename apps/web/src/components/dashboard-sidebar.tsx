'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText, 
  Activity, 
  Settings,
  Sparkles,
  LogOut
} from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Intelligence', href: '/dashboard/intelligence', icon: Sparkles },
  { name: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Articles', href: '/dashboard/articles', icon: FileText },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Activity },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

import { useSession } from 'next-auth/react';
import { ClientSwitcher } from '@/components/client-switcher';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-200 bg-white shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-blue-600">Deseo</span>
          </Link>
        </div>
        
        <div className="px-4 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Active Client
          </p>
          <ClientSwitcher />
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Connected Account
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {session?.user?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-xs font-medium text-slate-900">{session?.user?.name || 'User'}</p>
                  <p className="truncate text-[10px] text-slate-500">{session?.user?.email || 'No email'}</p>
                </div>
              </div>
              <Link 
                href="/auth/signout" 
                className="shrink-0 p-2 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}