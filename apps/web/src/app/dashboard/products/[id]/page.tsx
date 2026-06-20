'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle
} from '@deseo/ui/dialog';
import { 
  FileText,
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
  BookOpen,
  Flame,
  Settings,
  Zap,
  Trash2
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
import dynamic from 'next/dynamic';
import { Save } from 'lucide-react';

const LexicalArticleEditor = dynamic(
  () => import('@/components/lexical-editor').then((m) => m.LexicalArticleEditor),
  { ssr: false, loading: () => <div className="min-h-[400px] animate-pulse bg-slate-50 rounded-xl" /> },
);

export default function ProductConsolePage() {
  const { id } = useParams() as { id: string };
  const { activeClientId } = useClient();
  const utils = trpc.useUtils();
  const [selectedItem, setSelectedItem] = useState<{
    type: 'article' | 'suggestion';
    id: string;
    data: any;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCms, setSelectedCms] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'article' | 'stats'>('article');
  const [showOverview, setShowOverview] = useState(false);
  const [suggestionPrompt, setSuggestionPrompt] = useState('');
  const [articleEditPrompt, setArticleEditPrompt] = useState('');
  const [editorRoot, setEditorRoot] = useState<unknown>(null);
  const [verticalUrl, setVerticalUrl] = useState('');

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
  const { data: analytics } = trpc.dashboard.getAnalyticsDashboard.useQuery(
    { appSlug: 'gsc', siteUrl },
    { enabled: !!siteUrl }
  );

  // Mutations
  const { data: installations } = trpc.registry.listInstallations.useQuery();
  const cmsInstallation = installations?.find(i => i.app.type === 'feature:cms' && i.status === 'active');
  const cmsInstallations = installations?.filter(i => i.app.type === 'feature:cms' && i.status === 'active') || [];

  const generateDraftMutation = trpc.job.create.useMutation({
    onSuccess: (data) => {
      alert(`Article generation started! Job ID: ${data.id}`);
      utils.article.list.invalidate({ productId: id });
    },
    onError: (err) => {
      alert(`Error starting draft generation: ${err.message}`);
    }
  });

  const publishMutation = trpc.article.publishToCms.useMutation({
    onSuccess: (data) => {
      const successes = data.filter(r => r.success);
      const errors = data.filter(r => !r.success);
      if (successes.length > 0) {
        alert(`Successfully published to: ${successes.map(s => s.appSlug).join(', ')}`);
      }
      if (errors.length > 0) {
        alert(`Failed to publish to: ${errors.map(e => `${e.appSlug} (${e.error})`).join(', ')}`);
      }
      utils.article.list.invalidate({ productId: id });
      
      // refresh reader state if showing the published article
      if (selectedItem?.type === 'article') {
        utils.article.getById.fetch({ id: selectedItem.id }).then((updatedArticle) => {
          if (updatedArticle) {
            setSelectedItem({
              type: 'article',
              id: updatedArticle.id,
              data: updatedArticle
            });
            setSelectedCms(updatedArticle.targetCms ? [updatedArticle.targetCms] : (cmsInstallation ? [cmsInstallation.app.slug] : []));
          }
        });
      }
    },
    onError: (err) => {
      alert(`Publishing failed: ${err.message}`);
    }
  });

  const updateStatusMutation = trpc.article.updateStatus.useMutation({
    onSuccess: (updatedArticle) => {
      utils.article.list.invalidate({ productId: id });
      alert('Article status updated!');
      if (selectedItem?.type === 'article' && updatedArticle) {
        setSelectedItem({
          type: 'article',
          id: updatedArticle.id,
          data: updatedArticle
        });
      }
    },
    onError: (err) => {
      alert(`Failed to update status: ${err.message}`);
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

  const customSuggestionsMutation = trpc.intelligence.generateCustomSuggestions.useMutation({
    onSuccess: () => {
      alert('Custom suggestions generated!');
      utils.intelligence.listSuggestions.invalidate({ productId: id });
      setSuggestionPrompt('');
    },
    onError: (err) => {
      alert(`Failed to generate custom suggestions: ${err.message}`);
    }
  });

  const articleEditMutation = trpc.article.updateWithPrompt.useMutation({
    onSuccess: (updatedArticle) => {
      alert('Article updated by AI!');
      setArticleEditPrompt('');
      utils.article.list.invalidate({ productId: id });
      if (selectedItem?.type === 'article' && updatedArticle) {
        setSelectedItem({ type: 'article', id: updatedArticle.id, data: updatedArticle });
      }
    },
    onError: (err) => {
      alert(`Failed to update article: ${err.message}`);
    }
  });

  const saveContentMutation = trpc.article.updateContent.useMutation({
    onSuccess: (updatedArticle) => {
      utils.article.list.invalidate({ productId: id });
      if (selectedItem?.type === 'article' && updatedArticle) {
        setSelectedItem({ type: 'article', id: updatedArticle.id, data: updatedArticle });
      }
    },
    onError: (err) => {
      alert(`Failed to save: ${err.message}`);
    },
  });

  const rejectSuggestionMutation = trpc.intelligence.rejectSuggestion.useMutation({
    onSuccess: () => utils.intelligence.listSuggestions.invalidate({ productId: id }),
  });

  const trendingKeywordsMutation = trpc.intelligence.discoverTrendingKeywords.useMutation({
    onSuccess: () => {
      utils.products.getById.invalidate({ id });
    },
    onError: (err) => {
      alert(`Failed to discover trending keywords: ${err.message}`);
    }
  });

  const handleGenerate = (
    topic: string,
    keywords?: string[],
    suggestionId?: string,
    suggestionContext?: { title: string; description: string; angle?: string; hook?: string; targetAudience?: string; keySubheadings?: string[]; whyNow?: string; productVertical?: string; productVerticalUrl?: string; callToAction?: string },
    resolvedVerticalUrl?: string,
  ) => {
    if (!cmsInstallation) {
      alert('Please connect a CMS in the Marketplace first.');
      return;
    }
    generateDraftMutation.mutate({
      clientId: product!.clientId,
      type: 'article_generation',
      input: {
        payload: topic,
        keywords: keywords ?? [],
        suggestionId,
        verticalUrl: resolvedVerticalUrl || undefined,
        suggestionContext,
        clientId: product!.clientId,
        targetCMS: cmsInstallation.app.slug,
        productId: id,
      },
    });
  };

  const handlePublish = (articleId: string, appSlugs: string[]) => {
    publishMutation.mutate({
      articleId,
      cmsAppSlugs: appSlugs,
    });
  };

  // listSuggestions already filters to status='pending' server-side
  const activeSuggestions = suggestions ?? [];

  const isHighlyRecommended = (kw: string) => {
    return analytics?.topKeywords?.some((topKw: any) => topKw.query.toLowerCase() === kw.toLowerCase());
  };

  const getArticleKeywordStats = (articleKeywords: string[] | null) => {
    if (!articleKeywords || !analytics?.topKeywords) return { clicks: 0, impressions: 0, avgPosition: 0 };
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalPosition = 0;
    let count = 0;
    for (const kw of articleKeywords) {
      const match = analytics.topKeywords.find((tk: any) => tk.query.toLowerCase() === kw.toLowerCase());
      if (match) {
        totalClicks += match.clicks;
        totalImpressions += match.impressions;
        totalPosition += match.position;
        count++;
      }
    }
    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      avgPosition: count > 0 ? (totalPosition / count) : 0
    };
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

  const seoScore = (product.config as any)?.seoAssessment?.score || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors font-medium">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Product Console</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <Badge variant="outline" className="uppercase font-semibold bg-slate-50 text-slate-700">{product.type}</Badge>
            
            {/* SEO Health Score Circle in Header */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full py-0.5 px-2 text-xs text-blue-700 font-semibold shadow-sm">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="text-slate-100" stroke="currentColor" strokeWidth="4" />
                  <circle 
                    cx="18" cy="18" r="16" fill="none" 
                    className="text-blue-600" 
                    stroke="currentColor" strokeWidth="4" 
                    strokeDasharray={`${seoScore}, 100`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="absolute text-[7px] font-bold text-blue-900">{seoScore}</span>
              </div>
              <span className="text-[10px]">SEO Health</span>
            </div>

            {/* Hover Overview Icon */}
            <div className="relative inline-block">
              <button
                onMouseEnter={() => setShowOverview(true)}
                onMouseLeave={() => setShowOverview(false)}
                onClick={() => setShowOverview(!showOverview)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                aria-label="Product Overview"
              >
                <BookOpen className="h-4 w-4" />
              </button>
              {showOverview && (
                <div className="absolute left-0 mt-2 w-80 p-4 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl z-50 transition-all text-xs text-slate-600 leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-900 text-sm">Product Overview</p>
                  <p>{(product.config as any)?.summary || "Product summary is being generated by AI..."}</p>
                  {(product.config as any)?.valueProps && (product.config as any).valueProps.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
                      {((product.config as any).valueProps as string[]).map((prop, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] bg-slate-50 text-slate-700 font-normal hover:bg-slate-50">
                          {prop}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Globe className="h-4 w-4" />
            <a href={product.domain} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1 font-medium">
              {product.domain} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 bg-white text-slate-700 border-slate-200 shadow-sm"
            onClick={() => trendingKeywordsMutation.mutate({ productId: id })}
            disabled={trendingKeywordsMutation.isPending}
            title="Discover AI-powered trending keywords for this product"
          >
            {trendingKeywordsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-amber-500" />}
            Trending Keywords
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 bg-white text-slate-700 border-slate-200 shadow-sm"
            onClick={() => reevaluateMutation.mutate({ id })}
            disabled={reevaluateMutation.isPending}
          >
            {reevaluateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-purple-500" />}
            Reevaluate Product
          </Button>
          <Button variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 shadow-sm">
            <Settings className="h-4 w-4" /> Configure
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm" asChild>
            <Link href={`/dashboard/intelligence/generate?productId=${product.id}`}>
              <Plus className="h-4 w-4" /> New Article
            </Link>
          </Button>
        </div>
      </div>

      {/* Content & Suggestions Hub */}
      <Card className="w-full overflow-hidden border border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2 font-bold text-slate-900">
              <FileText className="h-5 w-5 text-blue-600" /> Content & Suggestions Hub
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Manage articles, review synced posts, and generate content from AI recommendations.
            </CardDescription>
          </div>
          
          {/* Integrated Global GSC Summary Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <MousePointer2 className="h-3.5 w-3.5 text-blue-500" />
              Clicks: <strong className="text-slate-950">{analytics?.summary ? analytics.summary.totalClicks.toLocaleString() : '0'}</strong>
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1.5 font-medium">
              <Eye className="h-3.5 w-3.5 text-purple-500" />
              Impressions: <strong className="text-slate-950">{analytics?.summary ? analytics.summary.totalImpressions.toLocaleString() : '0'}</strong>
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1.5 font-medium">
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              Position: <strong className="text-slate-950">{analytics?.summary ? analytics.summary.averagePosition.toFixed(1) : '0.0'}</strong>
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              CTR: <strong className="text-slate-950">{analytics?.summary ? `${(analytics.summary.averageCTR * 100).toFixed(2)}%` : '0.00%'}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x min-h-[550px]">
            
            {/* Suggestions Column (Left) */}
            <div className="lg:col-span-5 flex flex-col h-[550px] overflow-hidden bg-slate-50/10 p-6">
              <div className="pb-4 mb-4 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" /> AI Suggestions
                </h3>
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-[10px] font-bold border border-purple-100">
                  {activeSuggestions.length} Remaining
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {suggestionsLoading ? (
                  <div className="flex py-12 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : activeSuggestions.length > 0 ? (
                  activeSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedItem({ type: 'suggestion', id: s.id, data: s });
                        setVerticalUrl((s.context as any)?.productVerticalUrl ?? '');
                        setIsDialogOpen(true);
                      }}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col gap-2.5 shadow-sm hover:shadow"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 text-sm line-clamp-1">{s.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] px-1.5 py-0 h-4 font-bold uppercase">Idea</Badge>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rejectSuggestionMutation.mutate({ id: s.id });
                            }}
                            className="h-4 w-4 rounded flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                            title="Discard suggestion"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{s.description}</p>
                      {s.context && (s.context as any).keywords && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((s.context as any).keywords as string[]).slice(0, 3).map((kw, i) => {
                            const highlyRec = isHighlyRecommended(kw);
                            return (
                              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                highlyRec ? 'bg-amber-50 text-amber-800 border-amber-200 border' : 'bg-slate-55 text-slate-500 border border-slate-100'
                              }`}>
                                {highlyRec && <Flame className="h-2 w-2 text-amber-500 fill-amber-500" />}
                                {kw}
                              </span>
                            );
                          })}
                          {((s.context as any).keywords as string[]).length > 3 && (
                            <span className="text-[9px] text-slate-400 px-1 py-0.5 font-medium">
                              +{((s.context as any).keywords as string[]).length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs">No active suggestions available.</p>
                  </div>
                )}
              </div>

              {/* Always-visible prompt input */}
              <div className="pt-4 border-t mt-4 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Generate article ideas</label>
                <textarea
                  placeholder="e.g. Focus on halloween theme invite cards, case studies for enterprise... or click a trending keyword above ↑"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 min-h-[56px] resize-none placeholder:text-slate-400"
                  value={suggestionPrompt}
                  onChange={(e) => setSuggestionPrompt(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (suggestionPrompt.trim()) {
                      customSuggestionsMutation.mutate({ productId: id, prompt: suggestionPrompt });
                    } else {
                      reevaluateMutation.mutate({ id });
                    }
                  }}
                  disabled={customSuggestionsMutation.isPending || reevaluateMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold h-8 text-xs gap-1.5"
                >
                  {(customSuggestionsMutation.isPending || reevaluateMutation.isPending) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {suggestionPrompt.trim() ? 'Generate Ideas' : 'Re-evaluate Product'}
                </Button>
              </div>
            </div>

            {/* Articles Column (Right) */}
            <div className="lg:col-span-7 flex flex-col h-[550px] overflow-hidden p-6 bg-white">
              <div className="pb-4 mb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-500" /> Articles & Synced Posts
                </h3>
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="Search posts..."
                    className="w-full pl-8 pr-4 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                </div>
              </div>

              {/* Trending Keywords Row */}
              <TrendingKeywordsRow
                product={product}
                onKeywordClick={(title) => setSuggestionPrompt(title)}
              />

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {articlesLoading ? (
                  <div className="flex py-12 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : articles && articles.length > 0 ? (
                  articles
                    .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((article) => {
                      const badge = getSourceBadge(article);
                      const keywords = (article.keywords as string[] | null) || [];
                      const stats = getArticleKeywordStats(keywords);
                      return (
                        <button
                          key={article.id}
                          onClick={() => {
                            setSelectedItem({ type: 'article', id: article.id, data: article });
                            setSelectedCms(article.targetCms ? [article.targetCms] : (cmsInstallation ? [cmsInstallation.app.slug] : []));
                            setIsDialogOpen(true);
                            setActiveTab('article');
                          }}
                          className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col gap-3 shadow-sm hover:shadow"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-950 text-sm line-clamp-1">{article.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">/{article.slug}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                              <Badge className={`text-[9px] px-1.5 py-0 h-4 font-normal ${badge.className}`} variant={badge.variant}>
                                {badge.label}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 uppercase bg-slate-100 text-slate-700">
                                {article.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Keyword Stats Row */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                            <span className="flex items-center gap-1">
                              <MousePointer2 className="h-3 w-3 text-blue-500" />
                              {stats.clicks} Clicks
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-purple-500" />
                              {stats.impressions} Imps
                            </span>
                            {stats.avgPosition > 0 && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3 text-emerald-500" />
                                  Pos: {stats.avgPosition.toFixed(1)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Keywords Target Row */}
                          {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {keywords.slice(0, 4).map((kw: string, idx: number) => {
                                const highlyRec = isHighlyRecommended(kw);
                                return (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className={`text-[9px] py-0 px-1.5 flex items-center gap-0.5 ${
                                      highlyRec ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50/80 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {highlyRec && <Flame className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                                    {kw}
                                  </Badge>
                                );
                              })}
                              {keywords.length > 4 && (
                                <span className="text-[9px] text-slate-400 px-1 font-medium self-center">
                                  +{keywords.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <FileText className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs">No synced or generated posts yet.</p>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Centered Popup Radix Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-xl shadow-2xl border border-slate-200">
          {selectedItem && (
            <>
              {/* Dialog Header */}
              <div className="px-6 py-4 border-b bg-slate-50 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
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
                    <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
                      {selectedItem.data.title}
                    </DialogTitle>
                    {selectedItem.type === 'article' && (
                      <p className="text-xs text-slate-400 font-mono">Slug: /{selectedItem.data.slug}</p>
                    )}
                  </div>
                  {selectedItem.type === 'article' && selectedItem.data.cmsPublishedId && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0 bg-white" asChild>
                      <a href={`${(product?.config as any)?.siteUrl || ''}/${selectedItem.data.slug}`} target="_blank" rel="noopener noreferrer">
                        View Live <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>

                {/* Dialog Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/60 pt-3">
                  {selectedItem.type === 'suggestion' ? (
                    <div className="flex flex-col gap-3 w-full">
                      {/* Editable vertical URL — agents fetch this page to enrich context */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Product page to link to
                        </label>
                        <input
                          type="text"
                          value={verticalUrl}
                          onChange={(e) => setVerticalUrl(e.target.value)}
                          placeholder={`${product?.domain ?? 'https://yoursite.com'}/features/...`}
                          className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                        />
                        <p className="text-[10px] text-slate-400">
                          {verticalUrl
                            ? "The agent will fetch this page and use it as context for the article's product reference."
                            : 'Leave blank to use the general product overview. Set a path (e.g. /features/ai-writing) to anchor the article to a specific feature.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Article stored in DB for review.</span>
                        <Button
                          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-sm"
                          onClick={() => {
                            handleGenerate(
                              (selectedItem.data.context as any)?.topic || selectedItem.data.title,
                              (selectedItem.data.context as any)?.keywords ?? [],
                              selectedItem.id,
                              {
                                title: selectedItem.data.title,
                                description: selectedItem.data.description ?? '',
                                angle: (selectedItem.data.context as any)?.angle,
                                hook: (selectedItem.data.context as any)?.hook,
                                targetAudience: (selectedItem.data.context as any)?.targetAudience,
                                keySubheadings: (selectedItem.data.context as any)?.keySubheadings,
                                whyNow: (selectedItem.data.context as any)?.whyNow,
                                productVertical: (selectedItem.data.context as any)?.productVertical,
                                productVerticalUrl: verticalUrl || (selectedItem.data.context as any)?.productVerticalUrl,
                                callToAction: (selectedItem.data.context as any)?.callToAction,
                              },
                              verticalUrl || undefined,
                            );
                            setIsDialogOpen(false);
                          }}
                          disabled={generateDraftMutation.isPending}
                        >
                          {generateDraftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          Generate Draft Article
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4 w-full">
                      {/* Status controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Status:</span>
                        <Badge className="capitalize font-semibold bg-slate-100 text-slate-800">{selectedItem.data.status}</Badge>
                        
                        <div className="flex gap-1 ml-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateStatusMutation.mutate({ id: selectedItem.data.id, status: 'pending_review' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs h-8 px-2.5 bg-white"
                          >
                            Hold
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateStatusMutation.mutate({ id: selectedItem.data.id, status: 'approved' })}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs h-8 px-2.5 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>

                      {/* CMS Publish controls */}
                      <div className="flex items-center gap-2">
                        {cmsInstallations.length === 0 ? (
                          <span className="text-xs text-slate-400">No CMS connected in Marketplace</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              {cmsInstallations.map((inst) => {
                                const isSelected = selectedCms.includes(inst.app.slug);
                                return (
                                  <button
                                    key={inst.id}
                                    onClick={() => {
                                      setSelectedCms(prev =>
                                        prev.includes(inst.app.slug)
                                          ? prev.filter(slug => slug !== inst.app.slug)
                                          : [...prev, inst.app.slug]
                                      );
                                    }}
                                    className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                                      isSelected 
                                        ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    {inst.app.name}
                                  </button>
                                );
                              })}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handlePublish(selectedItem.data.id, selectedCms)}
                              disabled={selectedCms.length === 0 || publishMutation.isPending}
                              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                              {publishMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              Publish
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dialog Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[300px]">
                {selectedItem.type === 'suggestion' ? (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recommendation Details</h4>
                      <p className="text-slate-700 text-sm leading-relaxed">{selectedItem.data.description}</p>
                    </div>

                    {selectedItem.data.context && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Analysis Metadata</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Suggested Topic</span>
                            <span className="font-semibold text-slate-800">{(selectedItem.data.context as any).topic || selectedItem.data.title}</span>
                          </div>
                          {selectedItem.data.context.keywords && (
                            <div className="col-span-1 md:col-span-2">
                              <span className="text-slate-400 block mb-1.5">Target Keywords</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(selectedItem.data.context.keywords as string[]).map((kw, i) => {
                                  const highlyRec = isHighlyRecommended(kw);
                                  return (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className={`text-[10px] py-0.5 px-2 flex items-center gap-0.5 ${
                                        highlyRec ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white text-slate-650 border-slate-200'
                                      }`}
                                    >
                                      {highlyRec && <Flame className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                                      {kw}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Tab Selector */}
                    <div className="flex border-b border-slate-200">
                      <button
                        className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
                          activeTab === 'article'
                            ? 'border-blue-600 text-blue-600 font-bold'
                            : 'border-transparent text-slate-505 hover:text-slate-800'
                        }`}
                        onClick={() => setActiveTab('article')}
                      >
                        Article Content
                      </button>
                      <button
                        className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
                          activeTab === 'stats'
                            ? 'border-blue-600 text-blue-600 font-bold'
                            : 'border-transparent text-slate-505 hover:text-slate-800'
                        }`}
                        onClick={() => setActiveTab('stats')}
                      >
                        GSC Search Metrics
                      </button>
                    </div>

                    {/* Tab Contents */}
                    {activeTab === 'article' ? (
                      <div className="space-y-3 px-2 py-4">
                        {/* AI prompt bar */}
                        <div className="flex gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl items-center">
                          <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                          <input
                            type="text"
                            placeholder="Ask AI to refine, expand, fix tone, add a section..."
                            className="flex-1 bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                            value={articleEditPrompt}
                            onChange={(e) => setArticleEditPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && articleEditPrompt.trim()) {
                                articleEditMutation.mutate({ articleId: selectedItem.id, prompt: articleEditPrompt });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => articleEditMutation.mutate({ articleId: selectedItem.id, prompt: articleEditPrompt })}
                            disabled={!articleEditPrompt.trim() || articleEditMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-3 h-8 shrink-0"
                          >
                            {articleEditMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refine with AI'}
                          </Button>
                        </div>

                        {/* Lexical editor */}
                        <LexicalArticleEditor
                          key={selectedItem.id}
                          initialRoot={(() => {
                            const ast = selectedItem.data.astContent as any;
                            return ast?.root ?? ast;
                          })()}
                          onChange={setEditorRoot}
                        />

                        {/* Save bar */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (editorRoot) {
                                saveContentMutation.mutate({ id: selectedItem.id, lexicalRoot: editorRoot });
                              }
                            }}
                            disabled={!editorRoot || saveContentMutation.isPending}
                            className="gap-1.5 text-xs"
                          >
                            {saveContentMutation.isPending
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Save className="h-3.5 w-3.5" />}
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 px-2 py-4">
                        <h4 className="text-sm font-semibold text-slate-900">
                          Keyword Search Performance (GSC)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Organic search metrics matched with this article's target keywords.
                        </p>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50">
                                <TableHead className="font-semibold text-xs">Keyword</TableHead>
                                <TableHead className="text-right font-semibold text-xs">Clicks</TableHead>
                                <TableHead className="text-right font-semibold text-xs">Impressions</TableHead>
                                <TableHead className="text-right font-semibold text-xs">CTR</TableHead>
                                <TableHead className="text-right font-semibold text-xs">Position</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedItem.data.keywords && selectedItem.data.keywords.length > 0 ? (
                                (selectedItem.data.keywords as string[]).map((kw, idx) => {
                                  const highlyRec = isHighlyRecommended(kw);
                                  const match = analytics?.topKeywords?.find((tk: any) => tk.query.toLowerCase() === kw.toLowerCase());
                                  const ctr = match && match.impressions > 0 ? ((match.clicks / match.impressions) * 100).toFixed(2) + '%' : '0.00%';
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium text-slate-900 flex items-center gap-1 text-sm py-3">
                                        {highlyRec && <Flame className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                                        {kw}
                                      </TableCell>
                                      <TableCell className="text-right text-sm py-3">{match ? match.clicks : 0}</TableCell>
                                      <TableCell className="text-right text-sm py-3">{match ? match.impressions : 0}</TableCell>
                                      <TableCell className="text-right text-sm py-3">{match ? ctr : '0.00%'}</TableCell>
                                      <TableCell className="text-right text-sm py-3">{match ? match.position.toFixed(1) : 'N/A'}</TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                                    No target keywords defined for this article.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
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



// ---------------------------------------------------------------------------
// Trending Keywords with rich context hover
// ---------------------------------------------------------------------------

interface EnrichedKeyword {
  keyword: string;
  secondaryKeywords?: string[];
  suggestedTitle: string;
  productRelevance: string;
  currentContext: string;
  whyNow: string;
  searchIntent: string;
  trendSignal: string;
  difficulty: 'low' | 'medium' | 'high';
}

function buildKeywordPrompt(kw: EnrichedKeyword): string {
  const secondaries = kw.secondaryKeywords?.length
    ? kw.secondaryKeywords
    : [];
  const secondaryLine = secondaries.length > 0
    ? `, the secondary ones are ${secondaries.slice(0, 4).join(', ')}`
    : '';
  return `I found a keyword that's trending right now for this product — the primary one is "${kw.keyword}"${secondaryLine}. The idea is to generate an article with this title: "${kw.suggestedTitle}". Here's why it matters: ${kw.productRelevance} ${kw.whyNow}`.trim();
}

function KeywordChip({ kw, onClick }: { kw: EnrichedKeyword; onClick: (prompt: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const difficultyColor = kw.difficulty === 'low' ? 'text-emerald-600' : kw.difficulty === 'medium' ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => onClick(buildKeywordPrompt(kw))}
        className="text-[9px] px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200 font-medium flex items-center gap-0.5 shadow-sm hover:bg-amber-50 hover:border-amber-300 transition-colors cursor-pointer"
      >
        <Flame className="h-2 w-2 text-amber-500 fill-amber-400 shrink-0" />
        {kw.keyword}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2.5 text-left pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-900 text-xs leading-snug">{kw.keyword}</p>
            <span className={`text-[8px] font-bold uppercase shrink-0 ${difficultyColor}`}>{kw.difficulty}</span>
          </div>

          <p className="text-[10px] text-slate-500 italic leading-relaxed border-l-2 border-amber-200 pl-2">{kw.trendSignal}</p>

          {kw.secondaryKeywords && kw.secondaryKeywords.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1">Secondary keywords</p>
              <div className="flex flex-wrap gap-1">
                {kw.secondaryKeywords.map((sk, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{sk}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-[10px]">
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Why it fits your product</span>
              <span className="text-slate-500 leading-relaxed">{kw.productRelevance}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">What's happening now</span>
              <span className="text-slate-500 leading-relaxed">{kw.currentContext}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Why write it this month</span>
              <span className="text-slate-500 leading-relaxed">{kw.whyNow}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[9px] text-slate-400 mb-0.5">Suggested title</p>
            <p className="text-[10px] font-semibold text-slate-700 leading-snug">{kw.suggestedTitle}</p>
            <p className="text-[8px] text-purple-500 mt-1.5 font-medium">Click to fill prompt ↓</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingKeywordsRow({
  product,
  onKeywordClick,
}: {
  product: any;
  onKeywordClick: (title: string) => void;
}) {
  const rawKeywords = (product?.config as any)?.trendingKeywords as EnrichedKeyword[] | string[] | undefined;
  const updatedAt = (product?.config as any)?.trendingKeywordsUpdatedAt as string | undefined;

  if (!rawKeywords || rawKeywords.length === 0) return null;

  // Support both legacy string[] and new EnrichedKeyword[]
  const keywords: EnrichedKeyword[] = rawKeywords.map((kw) =>
    typeof kw === 'string'
      ? { keyword: kw, suggestedTitle: kw, productRelevance: '', currentContext: '', whyNow: '', searchIntent: 'informational', trendSignal: '', difficulty: 'medium' as const }
      : kw
  );

  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 uppercase tracking-wider">
          <Zap className="h-3 w-3 fill-amber-500 text-amber-500" /> Trending Keywords
          <span className="font-normal text-amber-600 normal-case tracking-normal ml-1">— hover for context, click to generate</span>
        </span>
        {updatedAt && (
          <span className="text-[9px] text-amber-600 font-medium">
            {new Date(updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <KeywordChip key={i} kw={kw} onClick={onKeywordClick} />
        ))}
      </div>
    </div>
  );
}

