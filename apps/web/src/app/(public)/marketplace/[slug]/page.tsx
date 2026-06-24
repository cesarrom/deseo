'use client';

import { useParams } from 'next/navigation';
import { useAppBySlug } from '@deseo/api-client';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Github, FileCode, BarChart3, Loader2, ArrowLeft, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const iconMap = {
  'feature:git': Github,
  'feature:cms': FileCode,
  'feature:analytics': BarChart3,
};

export default function PublicMarketplaceDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  
  const { data: app, isLoading, error } = useAppBySlug(slug, { enabled: !!slug });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">App Not Found</h2>
        <p className="text-slate-500 mb-6">We couldn't find the connector you're looking for.</p>
        <Link href="/marketplace">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const Icon = iconMap[app.type as keyof typeof iconMap] || FileCode;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-slate-100 flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="flex gap-6 items-center">
              <div className="rounded-2xl bg-blue-50 p-6 text-blue-600 shrink-0">
                <Icon className="h-12 w-12" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900">{app.name}</h1>
                  <Badge variant={app.isInternal ? 'secondary' : 'outline'} className="text-xs">
                    {app.isInternal ? 'Official' : 'Community'}
                  </Badge>
                </div>
                <p className="text-lg text-slate-500 capitalize">{app.type.split(':')[1]} Connector</p>
              </div>
            </div>
            <div className="w-full md:w-auto shrink-0">
              <Link href={`/dashboard/marketplace?install=${app.slug}`}>
                <Button size="lg" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white text-md px-8 h-14">
                  Install in Deseo
                </Button>
              </Link>
              <p className="text-xs text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Requires Deseo Account
              </p>
            </div>
          </div>

          <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Overview</h3>
                <p className="text-slate-600 leading-relaxed">
                  {app.description || `The ${app.name} connector seamlessly integrates your Deseo workspace with ${app.name}. By installing this connector, you enable Deseo to automatically orchestrate SEO strategies, generate content, and push updates directly to your environment.`}
                </p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Capabilities</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                     <div className="bg-green-100 p-1 rounded mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-700" /></div>
                     <span className="text-slate-600">Secure OAuth 2.0 Identity Handshake</span>
                  </li>
                  {app.type === 'feature:cms' && (
                    <>
                      <li className="flex items-start gap-3">
                         <div className="bg-green-100 p-1 rounded mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-700" /></div>
                         <span className="text-slate-600">Directly publish AI-generated articles as Drafts</span>
                      </li>
                      <li className="flex items-start gap-3">
                         <div className="bg-green-100 p-1 rounded mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-700" /></div>
                         <span className="text-slate-600">Maintain SEO metadata formatting</span>
                      </li>
                    </>
                  )}
                  {app.type === 'feature:git' && (
                    <>
                      <li className="flex items-start gap-3">
                         <div className="bg-green-100 p-1 rounded mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-700" /></div>
                         <span className="text-slate-600">Clone and audit repositories for SEO improvements</span>
                      </li>
                      <li className="flex items-start gap-3">
                         <div className="bg-green-100 p-1 rounded mt-0.5"><CheckCircle2 className="w-4 h-4 text-green-700" /></div>
                         <span className="text-slate-600">Automatically open Pull Requests with code changes</span>
                      </li>
                    </>
                  )}
                </ul>
              </section>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-50 border-slate-100 shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Developer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="block text-slate-500 mb-1">Base URL</span>
                    <a href={app.baseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 break-all">
                      {app.baseUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {app.webhookUrl && (
                    <div>
                      <span className="block text-slate-500 mb-1">Webhook Events</span>
                      <span className="text-slate-900 break-all">{app.webhookUrl}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-slate-500 mb-1">Added</span>
                    <span className="text-slate-900">{new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
