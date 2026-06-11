'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Button } from '@deseo/ui/button';
import { Github, FileCode, BarChart3, Loader2, Trash2 } from 'lucide-react';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

export default function SettingsPage() {
  const { data: installations, isLoading } = trpc.registry.listInstallations.useQuery();
  const optimizeMutation = trpc.registry.optimizeSite.useMutation({
    onSuccess: (data) => {
      alert(`SEO Workflow started! Workflow ID: ${data.workflowId}`);
    },
    onError: (err) => {
      alert(`Error starting workflow: ${err.message}`);
    }
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and active connections.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Active Connections</h2>
        <div className="grid gap-4">
          {installations?.map((inst) => {
            const Icon = iconMap[inst.app.type as keyof typeof iconMap] || FileCode;
            return (
              <Card key={inst.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900">{inst.app.name}</h3>
                    <p className="text-xs text-slate-500">Connected on {new Date(inst.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={inst.status === 'active' ? 'secondary' : 'outline'} className="bg-green-50 text-green-700 hover:bg-green-50">
                    {inst.status}
                  </Badge>

                  {inst.app.type === 'feature:git' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => optimizeMutation.mutate({ appSlug: inst.app.slug })}
                      disabled={optimizeMutation.isPending}
                    >
                      {optimizeMutation.isPending ? 'Starting...' : 'Optimize My Site'}
                    </Button>
                  )}

                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}

          {(!installations || installations.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-slate-500">You haven&apos;t connected any apps yet.</p>
                <Button variant="link" className="mt-2 text-blue-600" onClick={() => window.location.href='/dashboard/marketplace'}>
                  Go to Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-8">
        <h2 className="text-xl font-semibold text-slate-900">Danger Zone</h2>
        <Card className="border-red-100 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-900">Delete Account</CardTitle>
            <CardDescription className="text-red-700/70">
              Permanently remove your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
