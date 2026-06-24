'use client';

import { useAvailableApps } from '@deseo/api-client';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Github, FileCode, BarChart3, Loader2, Store } from 'lucide-react';
import Link from 'next/link';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

export default function PublicMarketplacePage() {
  const { data: apps, isLoading } = useAvailableApps();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Deseo Marketplace</h1>
          <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto">
            Discover official and community-built connectors to integrate Deseo with your favorite tools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-8">
          {apps?.map((app) => {
            const Icon = iconMap[app.type as keyof typeof iconMap] || FileCode;
            return (
              <Card key={app.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant={app.isInternal ? 'secondary' : 'outline'}>
                      {app.isInternal ? 'Official' : 'Community'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">{app.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{app.description || 'Seamlessly integrate your workflow with this connector.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm font-medium text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded-md">
                    <span className="capitalize">{app.type.split(':')[1]}</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-slate-100 pt-6">
                  <Link href={`/marketplace/${app.slug}`} className="w-full">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white">View Details</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}

          {(!apps || apps.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
              <Store className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No apps available yet</h3>
              <p className="mt-1 text-slate-500">Check back later for new integrations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
