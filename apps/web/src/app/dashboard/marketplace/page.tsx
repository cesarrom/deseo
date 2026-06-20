'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardFooter } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Button } from '@deseo/ui/button';
import { Github, FileCode, BarChart3, Loader2, Plus, CheckCircle2, ArrowRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

export default function MarketplacePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  
  const { data: apps, isLoading } = trpc.registry.listAvailableApps.useQuery();
  const { data: installations } = trpc.registry.listInstallations.useQuery();

  const installMutation = trpc.registry.installApp.useMutation({
    onSuccess: (data) => {
      // Open popup for config
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.redirectUrl,
        'deseo-install',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'DESEO_INSTALL_COMPLETE') {
          utils.registry.listInstallations.invalidate();
          window.removeEventListener('message', messageHandler);
        }
      };
      window.addEventListener('message', messageHandler);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
          <p className="text-slate-500">Discover and connect tools to automate your SEO workflow.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/developer')}>
          <Plus className="mr-2 h-4 w-4" />
          Build Your Own
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {apps?.map((app) => {
          const inst = installations?.find(i => i.app.id === app.id);
          const isInstalled = inst?.status === 'active';
          const Icon = iconMap[app.type as keyof typeof iconMap] || FileCode;

          return (
            <Card key={app.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 h-10 w-10 flex items-center justify-center overflow-hidden">
                    {app.iconUrl ? (
                      <img src={app.iconUrl} alt={app.name} className="h-full w-full object-contain" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  {isInstalled ? (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {app.type.split(':')[1]}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{app.name}</CardTitle>
                <div className="text-sm line-clamp-2 mt-2 text-slate-500 prose prose-slate prose-xs">
                   <ReactMarkdown>{app.description || `Automate your ${app.type.split(':')[1]} workflow with this integration.`}</ReactMarkdown>
                </div>
              </CardHeader>
              <div className="flex-1" />
              <CardFooter className="border-t bg-slate-50/50 pt-4 flex gap-2">
                {isInstalled && app.settingsUrl && (
                   <Button
                     className="flex-1 bg-white"
                     variant="outline"
                     onClick={() => {
                        const url = new URL(app.settingsUrl!, app.baseUrl);
                        const instId = inst?.id;
                        if (instId) {
                           url.searchParams.set('installationId', instId);
                        }
                        const width = 600;
                        const height = 700;
                        const left = window.screenX + (window.outerWidth - width) / 2;
                        const top = window.screenY + (window.outerHeight - height) / 2;
                        window.open(url.toString(), 'deseo-settings', `width=${width},height=${height},left=${left},top=${top}`);
                     }}
                   >
                     <Settings className="mr-2 h-4 w-4" />
                     Settings
                   </Button>
                )}
                <Button 
                  className={cn("w-full", isInstalled && app.settingsUrl ? "flex-1" : "")} 
                  variant={isInstalled ? "ghost" : "default"}
                  onClick={() => installMutation.mutate({ appId: app.id })}
                  disabled={installMutation.isPending}
                >
                  {isInstalled ? 'Reconnect' : 'Connect Now'}
                  {!isInstalled && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {(!apps || apps.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl">
           <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Store className="h-8 w-8 text-slate-400" />
           </div>
           <h3 className="text-lg font-semibold text-slate-900">No Connectors Found</h3>
           <p className="text-slate-500 max-w-sm mt-1">There are no public connectors yet. Head to Developer Settings to register your first one!</p>
           <Button className="mt-6" onClick={() => router.push('/dashboard/developer')}>
              Get Started as Developer
           </Button>
        </div>
      )}
    </div>
  );
}

import { Store } from 'lucide-react';
