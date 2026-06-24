'use client';

import { trpc, useInstallations, useExecuteAction, useGenerateAndPublish, useRefreshAnalyticsData, useProducts } from '@deseo/api-client';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@deseo/ui/table';
import { Badge } from '@deseo/ui/badge';
import { Loader2, TrendingUp, Sparkles, Plus, RefreshCw } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useClient } from '@/providers/client-provider';

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0]!,
    endDate: end.toISOString().split('T')[0]!,
  };
}

export default function IntelligencePage() {
  const { activeClientId } = useClient();
  const utils = trpc.useUtils();

  const { data: installations } = useInstallations();
  const { data: products } = useProducts({ enabled: !!activeClientId });

  const gscInstalled = installations?.find(i => i.app.slug === 'gsc');
  const cmsInstallation = installations?.find(i => i.app.type === 'feature:cms');

  const productOptions = useMemo(
    () => products?.filter(p => p.domain) ?? [],
    [products],
  );

  const [selectedDomain, setSelectedDomain] = useState('');
  const activeDomain = selectedDomain || productOptions[0]?.domain || '';

  const [performanceFeedback, setPerformanceFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [createFeedback, setCreateFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const performanceQuery = useExecuteAction({
    onSuccess: () => setPerformanceFeedback({ msg: 'Data loaded from GSC.', ok: true }),
    onError: (err) => setPerformanceFeedback({ msg: err.message, ok: false }),
  });

  const refreshMutation = useRefreshAnalyticsData({
    onSuccess: (data) => {
      setSyncFeedback({ msg: `${data.synced} keywords synced to database.`, ok: true });
      utils.intelligence.listSuggestions.invalidate();
    },
    onError: (err) => setSyncFeedback({ msg: err.message, ok: false }),
  });

  const createMutation = useGenerateAndPublish({
    onSuccess: () => setCreateFeedback({ msg: 'Article generation started.', ok: true }),
    onError: (err) => setCreateFeedback({ msg: err.message, ok: false }),
  });

  const handleFetch = () => {
    if (!activeDomain) return;
    setPerformanceFeedback(null);
    const { startDate, endDate } = getDateRange();
    performanceQuery.mutate({
      appSlug: 'gsc',
      actionPath: 'analytics/performance',
      method: 'POST',
      payload: { siteUrl: activeDomain, startDate, endDate },
    });
  };

  const handleSync = () => {
    if (!activeDomain) return;
    setSyncFeedback(null);
    refreshMutation.mutate({ appSlug: 'gsc', siteUrl: activeDomain });
  };

  const handleCreate = (topic: string) => {
    if (!cmsInstallation) {
      setCreateFeedback({ msg: 'Connect a CMS in the Marketplace first.', ok: false });
      return;
    }
    setCreateFeedback(null);
    createMutation.mutate({ topic, cmsAppSlug: cmsInstallation.app.slug });
  };

  if (!gscInstalled) {
    return (
      <Card className="mt-12">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold">Connect Google Search Console</h2>
          <p className="text-slate-500 max-w-md mt-2">
            To discover keyword opportunities, connect your GSC account in the Marketplace first.
          </p>
          <Button className="mt-6" onClick={() => window.location.href = '/dashboard/marketplace'}>
            Go to Marketplace
          </Button>
        </CardContent>
      </Card>
    );
  }

  const rows: Array<{ keys: string[]; ctr: number; impressions: number; clicks: number; position: number }> =
    performanceQuery.data?.success ? performanceQuery.data.data ?? [] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">SEO Intelligence</h1>
        <p className="text-slate-500">Discover low-hanging-fruit keywords based on your live search performance.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {productOptions.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">Site</label>
            <select
              value={activeDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {productOptions.map(p => (
                <option key={p.id} value={p.domain}>{p.domain}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">Site URL</label>
            <input
              className="h-10 w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              placeholder="example.com"
              value={activeDomain}
              onChange={e => setSelectedDomain(e.target.value)}
            />
          </div>
        )}

        <Button onClick={handleFetch} disabled={performanceQuery.isPending || !activeDomain}>
          {performanceQuery.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Analyze Performance
        </Button>

        <Button
          variant="outline"
          onClick={handleSync}
          disabled={refreshMutation.isPending || !activeDomain}
          title="Pull last 30 days into the database so AI features stay current"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync to Database
        </Button>
      </div>

      {performanceFeedback && (
        <p className={`text-xs ${performanceFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
          {performanceFeedback.msg}
        </p>
      )}
      {syncFeedback && (
        <p className={`text-xs ${syncFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
          {syncFeedback.msg}
        </p>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Opportunities</CardTitle>
            <CardDescription>
              Keywords with high impressions but low click-through rate — prime targets for new content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {createFeedback && (
              <p className={`text-xs mb-3 ${createFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                {createFeedback.msg}
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => {
                  const isOpportunity = row.ctr < 0.02 && row.impressions > 1000;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {row.keys[0]}
                        {isOpportunity && (
                          <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700">
                            <Sparkles className="mr-1 h-3 w-3" />
                            High Potential
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{row.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => handleCreate(row.keys[0] ?? '')}
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Create Article
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
