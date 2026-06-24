'use client';

import {
  trpc,
  useProducts,
  useArticles,
  useJobs,
  useSuggestions,
  useConvertDiscovery,
} from '@deseo/api-client';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@deseo/ui/card';
import { FileText, Activity, Sparkles, Loader2, ArrowRight, Globe, Package, Plus } from 'lucide-react';
import { Button } from '@deseo/ui/button';
import { Badge } from '@deseo/ui/badge';
import Link from 'next/link';
import { useClient } from '@/providers/client-provider';
import { useState } from 'react';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { activeClientId, clients } = useClient();
  const activeClient = clients.find(c => c.id === activeClientId);

  const { data: products, isLoading: productsLoading } = useProducts({ enabled: !!activeClientId });
  const { data: articles } = useArticles({}, { enabled: !!session?.user?.id });
  const { data: jobs } = useJobs({}, { enabled: !!session?.user?.id });
  const { data: suggestions } = useSuggestions({}, { enabled: !!activeClientId });

  const utils = trpc.useUtils();
  const [convertFeedback, setConvertFeedback] = useState<string | null>(null);
  const convertMutation = useConvertDiscovery({
    onSuccess: () => {
      utils.products.list.invalidate();
      utils.intelligence.listSuggestions.invalidate();
      setConvertFeedback('Product registered and analysis started.');
    },
    onError: (err) => setConvertFeedback(err.message),
  });

  if (productsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') ?? [];
  const activeJobs = jobs?.filter(j => j.status === 'running') ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {activeClient ? `${activeClient.name} Portfolio` : `Welcome back, ${session?.user?.name || 'User'}!`}
          </h1>
          <p className="text-slate-500">
            {activeClient
              ? `Managing ${products?.length || 0} discovered product${products?.length === 1 ? '' : 's'}.`
              : 'Select a client to see their SEO landscape.'}
          </p>
        </div>
        {!activeClient && (
          <Button asChild>
            <Link href="/dashboard/clients">Select or Create a Client</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Products" value={products?.length.toString() ?? '0'} icon={Package} />
        <StatCard title="Synced Content" value={articles?.length.toString() ?? '0'} icon={FileText} />
        <StatCard title="Active Jobs" value={activeJobs.length.toString()} icon={Activity} />
        <StatCard title="SEO Opportunities" value={pendingSuggestions.length.toString()} icon={Sparkles} />
      </div>

      {activeClient && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Your Discovered Products</h2>
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
                    We are discovering your domains and syncing content from your connected providers.
                  </CardDescription>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeClient && pendingSuggestions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" /> AI Suggestions
          </h2>
          {convertFeedback && (
            <p className="text-xs text-green-600">{convertFeedback}</p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingSuggestions.map((s) => (
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
                      {convertMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-3 w-3 mr-2" />
                      )}
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
            {jobs && jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${job.status === 'completed' ? 'bg-green-500' : job.status === 'running' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{job.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{job.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">No recent activity.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Context</CardTitle>
            <CardDescription>Active settings for {activeClient?.name ?? 'your account'}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">AI Model</span>
              <Badge variant="secondary">{activeClient?.aiModelPreference ?? '—'}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Products tracked</span>
              <span className="font-medium">{products?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Pending suggestions</span>
              <span className="font-medium">{pendingSuggestions.length}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-xs" asChild>
              <Link href="/dashboard/settings">Manage Connections</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: { id: string; name: string; domain: string; type: string; updatedAt: string | Date } }) {
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
        <p className="text-xs text-slate-400">
          Last updated {new Date(product.updatedAt).toLocaleDateString()}
        </p>
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
