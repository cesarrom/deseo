'use client';

import { trpc } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@deseo/ui/card';
import { Users, FileText, Activity, Sparkles, Loader2, CheckCircle2, Circle, ArrowRight, Github, BarChart3, Layout, Globe, Package, Settings2, Plus } from 'lucide-react';
import { Button } from '@deseo/ui/button';
import { Badge } from '@deseo/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useClient } from '@/providers/client-provider';
import { useState } from 'react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { activeClientId, clients } = useClient();
  const activeClient = clients.find(c => c.id === activeClientId);

  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery(
    undefined, 
    { enabled: !!activeClientId }
  );

  const { data: articles } = trpc.article.list.useQuery({}, { enabled: !!session?.user?.id });
  const { data: jobs } = trpc.job.list.useQuery({}, { enabled: !!session?.user?.id });
  const { data: suggestions } = trpc.intelligence.listSuggestions.useQuery({}, { enabled: !!activeClientId });

  const utils = trpc.useUtils();
  const convertMutation = trpc.intelligence.convertDiscovery.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.intelligence.listSuggestions.invalidate();
      alert('New product registered and analysis started!');
    }
  });

  if (productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {activeClient ? `${activeClient.name} Portfolio` : `Welcome back, ${session?.user?.name || 'User'}!`}
          </h1>
          <p className="text-slate-500">
            {activeClient ? `Managing ${products?.length || 0} discovered products.` : 'Select a client to see their SEO landscape.'}
          </p>
        </div>
        {!activeClient && (
          <Button asChild>
            <Link href="/dashboard/clients">Select or Create a Client</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value={products?.length.toString() || '0'} icon={Package} />
        <StatCard title="Content Syncs" value={articles?.length.toString() || '0'} icon={FileText} />
        <StatCard title="Active Jobs" value={jobs?.filter(j => j.status === 'running').length.toString() || '0'} icon={Activity} />
        <StatCard title="SEO Opportunities" value="24" icon={Sparkles} />
      </div>

      {activeClient && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Your Discovered Products</h2>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Discover New
            </Button>
          </div>
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {(!products || products.length === 0) && (
              <Card className="md:col-span-3 border-dashed bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                  </div>
                  <CardTitle className="text-slate-700">Deep Sync in Progress</CardTitle>
                  <CardDescription className="max-w-xs mx-auto mt-2">
                    We are currently discovering your domains and syncing content from your connected providers.
                  </CardDescription>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeClient && suggestions && suggestions.filter(s => s.status === 'pending').length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" /> AI Suggestions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.filter(s => s.status === 'pending').map((s) => (
              <Card key={s.id} className="border-blue-100 bg-blue-50/30">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 uppercase text-[9px]">{s.type}</Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{s.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{s.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  {s.type === 'discovery' ? (
                    <Button 
                      size="sm" 
                      className="w-full text-xs" 
                      onClick={() => convertMutation.mutate({ suggestionId: s.id })}
                      disabled={convertMutation.isPending}
                    >
                      {convertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                      Register Product
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full text-xs" asChild>
                      <Link href={s.productId ? `/dashboard/products/${s.productId}` : '#'}>View Details</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
            <CardDescription>Updates from your CMS and Git connectors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs?.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{job.type.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Context</CardTitle>
            <CardDescription>Active settings for {activeClient?.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">AI Model</span>
              <Badge variant="secondary">{activeClient?.aiModelPreference}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Last Deep Sync</span>
              <span className="font-medium">Just now</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-xs" asChild>
               <Link href="/dashboard/settings">Manage Account Connections</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-2 bg-blue-600" />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-[10px] uppercase">{product.type}</Badge>
          <Globe className="h-4 w-4 text-slate-400" />
        </div>
        <CardTitle className="text-lg mt-2">{product.name}</CardTitle>
        <CardDescription className="truncate text-xs">{product.domain}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-4 mt-2">
           <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold">SEO Health</p>
              <div className="flex items-center gap-1">
                 <div className="h-2 w-2 rounded-full bg-green-500" />
                 <span className="text-sm font-semibold">92/100</span>
              </div>
           </div>
           <div className="space-y-1 text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Total Clicks</p>
              <span className="text-sm font-semibold">1.2k</span>
           </div>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 border-t p-2">
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs" asChild>
          <Link href={`/dashboard/products/${product.id}`}>
            Open Product Console <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
