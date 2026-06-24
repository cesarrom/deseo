'use client';

import { useInstallations, useExecuteAction, useGenerateAndPublish } from '@deseo/api-client';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@deseo/ui/table';
import { Badge } from '@deseo/ui/badge';
import { Loader2, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { useState } from 'react';

export default function IntelligencePage() {
  const [siteUrl, setSiteUrl] = useState('');
  
  // Fetch installations
  const { data: installations } = useInstallations();
  const gscInstalled = installations?.find(i => i.app.slug === 'gsc');
  const cmsInstallation = installations?.find(i => i.app.type === 'feature:cms');

  const performanceQuery = useExecuteAction();
  const createMutation = useGenerateAndPublish({
    onSuccess: (data) => {
      alert(`Article generation started! Workflow ID: ${data.workflowId}`);
    },
    onError: (err) => {
      alert(`Error starting workflow: ${err.message}`);
    }
  });

  const handleFetch = () => {
    performanceQuery.mutate({
      appSlug: 'gsc',
      actionPath: 'analytics/performance',
      method: 'POST',
      payload: {
        siteUrl: siteUrl || 'sc-domain:example.com',
        startDate: '2026-05-01',
        endDate: '2026-06-01',
      }
    });
  };

  const handleCreate = (topic: string) => {
    if (!cmsInstallation) {
      alert('Please connect a CMS (like Payload) in the Marketplace first.');
      return;
    }
    createMutation.mutate({
      topic,
      cmsAppSlug: cmsInstallation.app.slug,
    });
  };

  if (!gscInstalled) {
    return (
      <Card className="mt-12">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <TrendingUp className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold">Connect Google Search Console</h2>
          <p className="text-slate-500 max-w-md mt-2">
            To discover keyword opportunities, you first need to connect your GSC account in the marketplace.
          </p>
          <Button className="mt-6" onClick={() => window.location.href='/dashboard/marketplace'}>
            Go to Marketplace
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">SEO Intelligence</h1>
        <p className="text-slate-500">Discover &quot;low-hanging fruit&quot; keywords based on your search performance.</p>
      </div>

      <div className="flex gap-4">
        <input 
          className="flex h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          placeholder="sc-domain:example.com"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        />
        <Button onClick={handleFetch} disabled={performanceQuery.isPending}>
          {performanceQuery.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Analyze Performance
        </Button>
      </div>

      {performanceQuery.data?.success && (
        <Card>
          <CardHeader>
            <CardTitle>Keyword Opportunities</CardTitle>
            <CardDescription>Keywords with high impressions but low click-through rate (CTR).</CardDescription>
          </CardHeader>
          <CardContent>
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
                {performanceQuery.data.data.map((row: { keys: string[], ctr: number, impressions: number, clicks: number, position: number }, i: number) => {
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
                          onClick={() => handleCreate(row.keys[0] || '')}
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
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
