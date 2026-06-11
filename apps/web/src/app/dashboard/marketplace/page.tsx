'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Github, FileCode, BarChart3, Loader2 } from 'lucide-react';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

export default function MarketplacePage() {
  const { data: apps, isLoading } = trpc.registry.listAvailableApps.useQuery();
  const installMutation = trpc.registry.installApp.useMutation({
    onSuccess: (data) => {
      window.location.href = data.redirectUrl;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Marketplace</h1>
        <p className="text-slate-500">Connect Deseo to your favorite tools and platforms.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {apps?.map((app) => {
          const Icon = iconMap[app.type as keyof typeof iconMap] || FileCode;
          return (
            <Card key={app.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-900">
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant={app.isInternal === 'true' ? 'secondary' : 'outline'}>
                    {app.isInternal === 'true' ? 'Official' : 'Community'}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{app.name}</CardTitle>
                <CardDescription>{app.description || 'Seamlessly integrate your workflow.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-slate-500">
                  <p>Type: <span className="capitalize">{app.type.split(':')[1]}</span></p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-50 pt-6">
                <Button 
                  className="w-full" 
                  onClick={() => installMutation.mutate({ appId: app.id })}
                  disabled={installMutation.isPending}
                >
                  {installMutation.isPending ? 'Connecting...' : 'Connect'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {(!apps || apps.length === 0) && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-12 text-center">
            <p className="text-slate-500">No apps available in the marketplace yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
