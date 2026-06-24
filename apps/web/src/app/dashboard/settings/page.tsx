'use client';

import { trpc, useInstallations, useUpdateClient, useSyncInstallation, useOptimizeSite, useExecuteAction, useRefreshAnalyticsData, useProducts } from '@deseo/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Github, FileCode, BarChart3, Loader2, Sparkles, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';
import { useClient } from '@/providers/client-provider';
import { ModelSelector } from '@/components/model-selector';
import { useState, useEffect } from 'react';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

type Feedback = { msg: string; ok: boolean };

export default function SettingsPage() {
  const { activeClientId, clients } = useClient();
  const activeClient = clients.find(c => c.id === activeClientId);

  const { data: installations, isLoading } = useInstallations();
  const { data: products } = useProducts({ enabled: !!activeClientId });
  const utils = trpc.useUtils();

  const [selectedModel, setSelectedModel] = useState(activeClient?.aiModelPreference || '');
  const [modelFeedback, setModelFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (activeClient?.aiModelPreference) setSelectedModel(activeClient.aiModelPreference);
  }, [activeClient]);

  const updateClientMutation = useUpdateClient({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setModelFeedback({ msg: 'Model preference saved.', ok: true });
    },
    onError: (err) => setModelFeedback({ msg: err.message, ok: false }),
  });

  // Per-installation sync feedback keyed by installation id
  const [syncFeedback, setSyncFeedback] = useState<Record<string, Feedback>>({});
  const syncMutation = useSyncInstallation({
    onSuccess: (_, { installationId }) =>
      setSyncFeedback(prev => ({ ...prev, [installationId]: { msg: 'Sync started — check back in a few minutes.', ok: true } })),
    onError: (err, { installationId }) =>
      setSyncFeedback(prev => ({ ...prev, [installationId]: { msg: err.message, ok: false } })),
  });

  const optimizeMutation = useOptimizeSite({
    onSuccess: () => {},
    onError: () => {},
  });

  // GSC-specific state
  const gscInstallation = installations?.find(i => i.app.slug === 'gsc');
  const firstProduct = products?.[0];

  const [sitemapUrl, setSitemapUrl] = useState('');
  const [sitemapFeedback, setSitemapFeedback] = useState<Feedback | null>(null);
  const submitSitemapMutation = useExecuteAction({
    onSuccess: () => setSitemapFeedback({ msg: 'Sitemap submitted to Google Search Console.', ok: true }),
    onError: (err) => setSitemapFeedback({ msg: err.message, ok: false }),
  });

  const [verifyUrl, setVerifyUrl] = useState('');
  const [verifyToken, setVerifyToken] = useState<{ token: string; metaTag: string } | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<Feedback | null>(null);
  const getTokenMutation = useExecuteAction({
    onSuccess: (data) => {
      if (data?.success && data.data) {
        setVerifyToken(data.data as { token: string; metaTag: string });
        setVerifyFeedback({ msg: 'Copy the meta tag below and add it to your site\'s <head>.', ok: true });
      }
    },
    onError: (err) => setVerifyFeedback({ msg: err.message, ok: false }),
  });
  const confirmVerifyMutation = useExecuteAction({
    onSuccess: () => setVerifyFeedback({ msg: 'Domain verified! It will appear in Google Search Console shortly.', ok: true }),
    onError: (err) => setVerifyFeedback({ msg: err.message, ok: false }),
  });

  const [analyticsRefreshFeedback, setAnalyticsRefreshFeedback] = useState<Feedback | null>(null);
  const refreshMutation = useRefreshAnalyticsData({
    onSuccess: (data) => setAnalyticsRefreshFeedback({ msg: `${data.synced} keywords refreshed.`, ok: true }),
    onError: (err) => setAnalyticsRefreshFeedback({ msg: err.message, ok: false }),
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

      {/* ── AI Model ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" /> AI Model Preference
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Content &amp; Analysis Model</CardTitle>
            <CardDescription>
              The AI model {activeClient?.name} uses for generating articles and analysing products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            {modelFeedback && (
              <p className={`text-xs mt-2 ${modelFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                {modelFeedback.msg}
              </p>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t flex justify-between items-center py-3">
            <p className="text-xs text-slate-500 italic">
              Current: <span className="font-mono font-bold">{activeClient?.aiModelPreference}</span>
            </p>
            <Button
              size="sm"
              onClick={() => {
                setModelFeedback(null);
                updateClientMutation.mutate({ id: activeClientId!, aiModelPreference: selectedModel });
              }}
              disabled={updateClientMutation.isPending || selectedModel === activeClient?.aiModelPreference}
            >
              {updateClientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Preference
            </Button>
          </CardFooter>
        </Card>
      </section>

      {/* ── Active Connections ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Active Connections</h2>
        <div className="grid gap-4">
          {installations?.map((inst) => {
            const Icon = iconMap[inst.app.type as keyof typeof iconMap] ?? FileCode;
            const fb = syncFeedback[inst.id];
            return (
              <Card key={inst.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="rounded-lg bg-slate-100 p-2 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">{inst.app.name}</h3>
                    <p className="text-xs text-slate-500">
                      Connected {new Date(inst.createdAt).toLocaleDateString()}
                    </p>
                    {fb && (
                      <p className={`text-xs mt-0.5 ${fb.ok ? 'text-green-600' : 'text-red-600'}`}>{fb.msg}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-50 shrink-0">
                    {inst.status}
                  </Badge>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSyncFeedback(prev => ({ ...prev, [inst.id]: { msg: '', ok: true } }));
                        syncMutation.mutate({ installationId: inst.id });
                      }}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Sync Resources
                    </Button>

                    {inst.app.type === 'feature:git' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => optimizeMutation.mutate({ appSlug: inst.app.slug })}
                        disabled={optimizeMutation.isPending}
                      >
                        {optimizeMutation.isPending ? 'Starting…' : 'Optimize My Site'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {(!installations || installations.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-slate-500">No apps connected yet.</p>
                <Button variant="link" className="mt-2 text-blue-600" onClick={() => window.location.href = '/dashboard/marketplace'}>
                  Go to Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ── GSC Features (only when GSC is installed) ───────────────────────── */}
      {gscInstallation && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Google Search Console Tools
          </h2>

          {/* Refresh Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Refresh Analytics Data</CardTitle>
              <CardDescription>
                Pull the last 30 days of keyword data from GSC into the database so AI suggestions stay current.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              {products && products.length > 0 ? (
                products.map(p => (
                  <Button
                    key={p.id}
                    variant="outline"
                    size="sm"
                    disabled={refreshMutation.isPending}
                    onClick={() => {
                      setAnalyticsRefreshFeedback(null);
                      refreshMutation.mutate({ appSlug: 'gsc', siteUrl: p.domain });
                    }}
                  >
                    {refreshMutation.isPending ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3 w-3" />
                    )}
                    {p.domain}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-slate-500">No products found. Sync your GSC connection first.</p>
              )}
              {analyticsRefreshFeedback && (
                <p className={`text-xs w-full ${analyticsRefreshFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {analyticsRefreshFeedback.msg}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Sitemap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit Sitemap</CardTitle>
              <CardDescription>
                Tell Google about your sitemap directly — no need to log into Search Console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={`${firstProduct?.domain ? `https://${firstProduct.domain}/sitemap.xml` : 'https://example.com/sitemap.xml'}`}
                  value={sitemapUrl}
                  onChange={e => setSitemapUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  disabled={!sitemapUrl || submitSitemapMutation.isPending}
                  onClick={() => {
                    if (!firstProduct?.domain) return;
                    setSitemapFeedback(null);
                    submitSitemapMutation.mutate({
                      appSlug: 'gsc',
                      actionPath: 'analytics/sitemaps/submit',
                      method: 'POST',
                      payload: { siteUrl: firstProduct.domain, feedpath: sitemapUrl },
                    });
                  }}
                >
                  {submitSitemapMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
                </Button>
              </div>
              {sitemapFeedback && (
                <p className={`text-xs ${sitemapFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {sitemapFeedback.msg}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Verify Domain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Verify a Domain
              </CardTitle>
              <CardDescription>
                Prove ownership of a new site to Google using a meta tag — then register it in Search Console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="https://new-site.com"
                  value={verifyUrl}
                  onChange={e => { setVerifyUrl(e.target.value); setVerifyToken(null); setVerifyFeedback(null); }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  disabled={!verifyUrl || getTokenMutation.isPending}
                  onClick={() => {
                    setVerifyFeedback(null);
                    setVerifyToken(null);
                    getTokenMutation.mutate({
                      appSlug: 'gsc',
                      actionPath: 'verify/token',
                      method: 'POST',
                      payload: { siteUrl: verifyUrl },
                    });
                  }}
                >
                  {getTokenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Tag'}
                </Button>
              </div>

              {verifyToken && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 font-medium">Add this to your site's &lt;head&gt;:</p>
                  <pre className="text-xs bg-slate-100 rounded p-2 overflow-x-auto select-all cursor-text">
                    {verifyToken.metaTag}
                  </pre>
                  <Button
                    size="sm"
                    disabled={confirmVerifyMutation.isPending}
                    onClick={() => {
                      setVerifyFeedback(null);
                      confirmVerifyMutation.mutate({
                        appSlug: 'gsc',
                        actionPath: 'verify/confirm',
                        method: 'POST',
                        payload: { siteUrl: verifyUrl },
                      });
                    }}
                  >
                    {confirmVerifyMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    I&apos;ve Added It — Verify Now
                  </Button>
                </div>
              )}

              {verifyFeedback && (
                <p className={`text-xs ${verifyFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {verifyFeedback.msg}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
