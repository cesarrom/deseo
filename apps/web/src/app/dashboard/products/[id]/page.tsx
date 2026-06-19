'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { 
  BarChart3, 
  FileText, 
  Github, 
  Globe, 
  Loader2, 
  ArrowLeft, 
  ExternalLink, 
  Sparkles, 
  TrendingUp, 
  MousePointer2, 
  Eye, 
  Target,
  Plus,
  Search,
  BookOpen
} from 'lucide-react';
import { Button } from '@deseo/ui/button';
import { Badge } from '@deseo/ui/badge';
import Link from 'next/link';
import { useClient } from '@/providers/client-provider';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@deseo/ui/table';

export default function ProductConsolePage() {
  const { id } = useParams() as { id: string };
  const { activeClientId } = useClient();
  const [selectedItem, setSelectedItem] = useState<{
    type: 'article' | 'suggestion';
    id: string;
    data: any;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: product, isLoading: productLoading } = trpc.products.getById.useQuery(
    { id },
    { enabled: !!id && !!activeClientId }
  );

  const { data: suggestions, isLoading: suggestionsLoading } = trpc.intelligence.listSuggestions.useQuery(
    { productId: id },
    { enabled: !!id }
  );

  const { data: articles, isLoading: articlesLoading } = trpc.article.list.useQuery(
    { productId: id },
    { enabled: !!id }
  );

  // We fetch analytics dashboard if the product has a siteUrl configured
  const siteUrl = (product?.config as any)?.siteUrl;
  const { data: analytics, isLoading: analyticsLoading } = trpc.dashboard.getAnalyticsDashboard.useQuery(
    { appSlug: 'gsc', siteUrl },
    { enabled: !!siteUrl }
  );

  // Mutations
  const { data: installations } = trpc.registry.listInstallations.useQuery();
  const cmsInstallation = installations?.find(i => i.app.type === 'feature:cms');
  
  const generateMutation = trpc.registry.generateAndPublish.useMutation({
    onSuccess: (data) => {
      alert(`Article generation started! Workflow ID: ${data.workflowId}`);
    },
    onError: (err) => {
      alert(`Error starting workflow: ${err.message}`);
    }
  });

  const reevaluateMutation = trpc.products.reevaluate.useMutation({
    onSuccess: () => {
      alert('Product re-evaluation started! Check back in a few minutes.');
    },
    onError: (err) => {
      alert(`Error starting re-evaluation: ${err.message}`);
    }
  });

  const handleGenerate = (topic: string) => {
    if (!cmsInstallation) {
      alert('Please connect a CMS in the Marketplace first.');
      return;
    }
    generateMutation.mutate({
      topic,
      cmsAppSlug: cmsInstallation.app.slug,
      productId: id,
    });
  };

  if (productLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-slate-900">Product not found</h2>
        <p className="text-slate-500 mt-2">The product you are looking for does not exist or you don't have access.</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Product Console</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <Badge variant="outline" className="uppercase">{product.type}</Badge>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Globe className="h-4 w-4" />
            <a href={product.domain} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1">
              {product.domain} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => reevaluateMutation.mutate({ id })}
            disabled={reevaluateMutation.isPending}
          >
            {reevaluateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Reevaluate Product
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings2 className="h-4 w-4" /> Configure
          </Button>
          <Button className="gap-2" asChild>
            <Link href={`/dashboard/intelligence/generate?productId=${product.id}`}>
              <Plus className="h-4 w-4" /> New Article
            </Link>
          </Button>
        </div>
      </div>

      {/* Product Overview & SEO Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product Overview</CardTitle>
            <CardDescription>AI-generated summary of your product's value proposition.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-700 leading-relaxed">
              {(product.config as any)?.summary || "Product summary is being generated by AI..."}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {(product.config as any)?.valueProps?.map((prop: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">
                  {prop}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>SEO Health</CardTitle>
            <CardDescription>Assessment based on discovered pages.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-4 mb-4">
                <div className="relative h-16 w-16 flex items-center justify-center">
                   <svg className="h-full w-full" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100" stroke="currentColor" strokeWidth="3" />
                      <circle 
                        cx="18" cy="18" r="16" fill="none" 
                        className="text-blue-600" 
                        stroke="currentColor" strokeWidth="3" 
                        strokeDasharray={`${(product.config as any)?.seoAssessment?.score || 0}, 100`}
                        transform="rotate(-90 18 18)"
                      />
                   </svg>
                   <span className="absolute text-lg font-bold">{(product.config as any)?.seoAssessment?.score || 0}</span>
                </div>
                <div>
                   <p className="font-semibold">{(product.config as any)?.seoAssessment?.score > 70 ? 'Good' : 'Needs Work'}</p>
                   <p className="text-xs text-slate-500">AI Score</p>
                </div>
             </div>
             <div className="space-y-2">
                {(product.config as any)?.seoAssessment?.advice?.slice(0, 3).map((a: string, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <span className="text-slate-600">{a}</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Clicks" 
          value={analytics?.summary.totalClicks.toLocaleString() || '0'} 
          icon={MousePointer2} 
          description="Last 30 days"
          loading={analyticsLoading}
        />
        <StatCard 
          title="Impressions" 
          value={analytics?.summary.totalImpressions.toLocaleString() || '0'} 
          icon={Eye} 
          description="Last 30 days"
          loading={analyticsLoading}
        />
        <StatCard 
          title="Avg. Position" 
          value={analytics?.summary.averagePosition.toFixed(1) || '0.0'} 
          icon={Target} 
          description="Across all keywords"
          loading={analyticsLoading}
        />
        <StatCard 
          title="Avg. CTR" 
          value={`${(analytics?.summary.averageCTR * 100).toFixed(2) || '0.00'}%`} 
          icon={TrendingUp} 
          description="Click-through rate"
          loading={analyticsLoading}
        />
      </div>

      {/* Keywords Table */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Performing Keywords</CardTitle>
            <CardDescription>Search queries driving traffic to {product.domain}.</CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-slate-400" />
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="flex py-12 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.topKeywords.map((kw: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-slate-900">{kw.query}</TableCell>
                    <TableCell className="text-right">{kw.clicks}</TableCell>
                    <TableCell className="text-right">{kw.impressions}</TableCell>
                    <TableCell className="text-right">{kw.position.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {(!analytics?.topKeywords || analytics.topKeywords.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-400">
                      No keyword data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Content & Suggestions Hub */}
      <Card className="w-full overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Content & Suggestions Hub
              </CardTitle>
              <CardDescription>Manage articles, review synced posts, and generate content from AI recommendations.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                {articles?.length || 0} Total Posts
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                {suggestions?.length || 0} AI Recs
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x min-h-[500px]">
            {/* Sidebar Pane (List) */}
            <div className="lg:col-span-1 flex flex-col h-[500px] overflow-hidden bg-slate-50/20">
              <div className="p-4 border-b space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    className="w-full pl-8 pr-4 py-1.5 text-sm bg-white border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* AI Suggestions Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-purple-500" /> Top AI Suggestions
                  </h3>
                  {suggestionsLoading ? (
                    <div className="flex py-4 justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                    </div>
                  ) : suggestions && suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {suggestions.slice(0, 3).map((s) => {
                        const isSelected = selectedItem?.type === 'suggestion' && selectedItem.id === s.id;
                        return (
                          <button
                            key={s.id}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex flex-col gap-1.5 ${
                              isSelected
                                ? 'bg-purple-50 border-purple-300 shadow-sm ring-1 ring-purple-300 font-medium'
                                : 'bg-gradient-to-r from-purple-50/40 to-blue-50/40 hover:from-purple-50/80 hover:to-blue-50/80 border-purple-100 hover:border-purple-200'
                            }`}
                            onClick={() => setSelectedItem({ type: 'suggestion', id: s.id, data: s })}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 truncate pr-2">{s.title}</span>
                              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[9px] px-1 py-0 h-4 font-bold uppercase">Idea</Badge>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">No AI suggestions available.</p>
                  )}
                </div>

                {/* Synced/Generated Articles Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-slate-400" /> Synced & Generated Posts
                  </h3>
                  {articlesLoading ? (
                    <div className="flex py-4 justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                    </div>
                  ) : articles && articles.length > 0 ? (
                    <div className="space-y-2">
                      {articles
                        .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((article) => {
                          const isSelected = selectedItem?.type === 'article' && selectedItem.id === article.id;
                          const badge = getSourceBadge(article);
                          return (
                            <button
                              key={article.id}
                              className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex flex-col gap-2 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-300'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                              onClick={() => setSelectedItem({ type: 'article', id: article.id, data: article })}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-slate-950 line-clamp-1">{article.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">/{article.slug}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge className={`text-[9px] px-1 py-0 h-4 font-normal ${badge.className}`} variant={badge.variant}>
                                  {badge.label}
                                </Badge>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(article.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      {articles.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">No matching posts found.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">No synced or generated posts yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Reader Pane (Details) */}
            <div className="lg:col-span-2 flex flex-col h-[500px] bg-white overflow-hidden">
              {selectedItem ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Reader Header */}
                  <div className="p-4 border-b flex items-start justify-between bg-slate-50/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {selectedItem.type === 'suggestion' ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold text-[10px]" variant="outline">
                            AI Recommendation
                          </Badge>
                        ) : (
                          <>
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[10px]" variant="outline">
                              Existing Article
                            </Badge>
                            {(() => {
                              const badge = getSourceBadge(selectedItem.data);
                              return (
                                <Badge className={`text-[10px] font-normal ${badge.className}`} variant={badge.variant}>
                                  Source: {badge.label}
                                </Badge>
                              );
                            })()}
                          </>
                        )}
                        {selectedItem.type === 'article' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 uppercase bg-slate-100 text-slate-700">
                            {selectedItem.data.status}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 leading-tight">
                        {selectedItem.data.title}
                      </h2>
                      {selectedItem.type === 'article' && (
                        <p className="text-xs text-slate-400 font-mono">Slug: /{selectedItem.data.slug}</p>
                      )}
                    </div>

                    {selectedItem.type === 'article' && selectedItem.data.cmsPublishedId && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" asChild>
                        <a href={`${(product?.config as any)?.siteUrl || ''}/${selectedItem.data.slug}`} target="_blank" rel="noopener noreferrer">
                          View Live <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Reader Content Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {selectedItem.type === 'suggestion' ? (
                      <div className="space-y-6 max-w-xl">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-500">Recommendation Details</h4>
                          <p className="text-slate-700 text-sm leading-relaxed">{selectedItem.data.description}</p>
                        </div>

                        {selectedItem.data.context && (
                          <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Analysis Metadata</h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-slate-400 block">Suggested Topic</span>
                                <span className="font-semibold text-slate-700">{(selectedItem.data.context as any).topic || selectedItem.data.title}</span>
                              </div>
                              {selectedItem.data.context.keywords && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block mb-1">Target Keywords</span>
                                  <div className="flex flex-wrap gap-1">
                                    {(selectedItem.data.context.keywords as string[]).map((kw, i) => (
                                      <Badge key={i} variant="outline" className="bg-white text-[10px]">
                                        {kw}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t flex flex-col sm:flex-row items-center gap-4">
                          <Button
                            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-md"
                            onClick={() => handleGenerate((selectedItem.data.context as any)?.topic || selectedItem.data.title)}
                            disabled={generateMutation.isPending}
                          >
                            {generateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            Generate and Publish Article
                          </Button>
                          <span className="text-xs text-slate-400">
                            Uses configured model and connector presets
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none">
                        <ArticleRenderer content={selectedItem.data.astContent} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">Content Reader</h3>
                  <p className="text-sm text-slate-400 max-w-sm mt-1">
                    Select an AI recommendation or an article from the sidebar to read it and check its sync status.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, loading }: { title: string; value: string; icon: any; description: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-7 w-16 bg-slate-100 animate-pulse rounded" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function Settings2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}

function getSourceBadge(article: any) {
  if (article.cmsPublishedId) {
    return {
      label: article.targetCms ? `${article.targetCms.charAt(0).toUpperCase() + article.targetCms.slice(1)}` : 'CMS',
      variant: 'outline' as const,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  
  if (article.targetCms) {
    return {
      label: `Draft: ${article.targetCms.charAt(0).toUpperCase() + article.targetCms.slice(1)}`,
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }

  return {
    label: 'Deseo AI',
    variant: 'secondary' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  };
}

interface LexicalNode {
  type: string;
  text?: string;
  children?: LexicalNode[];
  tag?: string;
  listType?: string;
  url?: string;
  format?: number;
}

function LexicalRenderer({ node }: { node: LexicalNode }) {
  if (!node) return null;

  if (node.type === 'text' || !node.children) {
    const text = node.text || '';
    if (!text) return null;

    const isBold = node.format ? (node.format & 1) !== 0 : false;
    const isItalic = node.format ? (node.format & 2) !== 0 : false;
    const isCode = node.format ? (node.format & 16) !== 0 : false;

    if (isCode) {
      return <code className="bg-slate-100 px-1 rounded text-sm font-mono text-red-600">{text}</code>;
    }

    let element: React.ReactNode = text;
    if (isBold) element = <strong>{element}</strong>;
    if (isItalic) element = <em>{element}</em>;
    return <>{element}</>;
  }

  const children = node.children.map((child, i) => (
    <LexicalRenderer key={i} node={child} />
  ));

  switch (node.type) {
    case 'root':
      return <div className="space-y-4">{children}</div>;
    case 'paragraph':
      return <p className="text-slate-700 leading-relaxed my-2">{children}</p>;
    case 'heading': {
      const Tag = (node.tag as any) || 'h2';
      const classes = {
        h1: 'text-2xl font-bold mt-6 mb-2 text-slate-900',
        h2: 'text-xl font-bold mt-5 mb-2 text-slate-900',
        h3: 'text-lg font-semibold mt-4 mb-2 text-slate-900',
      }[Tag] || 'text-base font-semibold mt-3 mb-1 text-slate-900';
      return <Tag className={classes}>{children}</Tag>;
    }
    case 'list': {
      const Tag = node.listType === 'number' ? 'ol' : 'ul';
      const listClass = node.listType === 'number' ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1';
      return <Tag className={listClass}>{children}</Tag>;
    }
    case 'listitem':
      return <li className="text-slate-700">{children}</li>;
    case 'quote':
      return (
        <blockquote className="border-l-4 border-slate-200 pl-4 italic my-3 text-slate-500 bg-slate-50 py-1 rounded-r">
          {children}
        </blockquote>
      );
    case 'link':
      return (
        <a href={node.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {children}
        </a>
      );
    default:
      return <>{children}</>;
  }
}

function ContentNodeRenderer({ nodes }: { nodes: any[] }) {
  return (
    <div className="space-y-4">
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'heading': {
            const Tag = `h${node.level || 2}` as any;
            const classes = {
              h1: 'text-2xl font-bold mt-6 mb-2 text-slate-900',
              h2: 'text-xl font-bold mt-5 mb-2 text-slate-900',
              h3: 'text-lg font-semibold mt-4 mb-2 text-slate-900',
            }[Tag] || 'text-base font-semibold mt-3 mb-1 text-slate-900';
            return <Tag key={i} className={classes}>{node.text}</Tag>;
          }
          case 'paragraph':
            return <p key={i} className="text-slate-700 leading-relaxed my-2">{node.text}</p>;
          case 'list': {
            const Tag = node.ordered ? 'ol' : 'ul';
            const listClass = node.ordered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1';
            return (
              <Tag key={i} className={listClass}>
                {node.items?.map((item: string, j: number) => (
                  <li key={j} className="text-slate-700">{item}</li>
                ))}
              </Tag>
            );
          }
          case 'image':
            return (
              <figure key={i} className="my-4">
                <img src={node.url} alt={node.alt} className="rounded-lg max-h-[300px] object-cover" />
                {node.caption && <figcaption className="text-xs text-slate-400 mt-1">{node.caption}</figcaption>}
              </figure>
            );
          case 'code':
            return (
              <pre key={i} className="bg-slate-50 p-3 rounded-lg overflow-x-auto font-mono text-sm border my-3">
                <code className={`language-${node.language}`}>{node.code}</code>
              </pre>
            );
          case 'blockquote':
            return (
              <blockquote key={i} className="border-l-4 border-slate-200 pl-4 italic my-3 text-slate-500 bg-slate-50 py-1 rounded-r">
                {node.text}
                {node.author && <cite className="block text-xs text-slate-400 mt-1">— {node.author}</cite>}
              </blockquote>
            );
          case 'callout':
            return (
              <div key={i} className="p-3 bg-blue-50 border-l-4 border-blue-500 text-sm text-blue-700 rounded-r my-3">
                {node.text}
              </div>
            );
          case 'divider':
            return <hr key={i} className="my-4 border-slate-200" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function ArticleRenderer({ content }: { content: any }) {
  if (!content) return <p className="text-slate-400 text-sm">No content available.</p>;

  if (Array.isArray(content)) {
    return <ContentNodeRenderer nodes={content} />;
  }

  if (content.root) {
    return <LexicalRenderer node={content.root} />;
  }

  return <p className="text-slate-700 whitespace-pre-wrap">{String(content)}</p>;
}
