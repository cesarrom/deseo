'use client';

import { trpc } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Users, FileText, Activity, Sparkles, Loader2, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@deseo/ui/button';
import { Badge } from '@deseo/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: clients, isLoading: clientsLoading } = trpc.clients.list.useQuery(
    { userId: session?.user?.id || '' },
    { enabled: !!session?.user?.id }
  );
  
  const { data: installations, isLoading: installationsLoading } = trpc.registry.listInstallations.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const { data: articles } = trpc.article.list.useQuery({}, { enabled: !!session?.user?.id });
  const { data: jobs } = trpc.job.list.useQuery({}, { enabled: !!session?.user?.id });

  if (clientsLoading || installationsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasClient = clients && clients.length > 0;
  const hasGitConnector = installations && installations.some(i => i.app.type === 'feature:git');
  const hasCmsConnector = installations && installations.some(i => i.app.type === 'feature:cms');
  const isFullyOnboarded = hasClient && hasGitConnector && hasCmsConnector;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {session?.user?.name || 'User'}!</h1>
        <p className="text-slate-500">Here is what&apos;s happening with your SEO projects.</p>
      </div>

      {!isFullyOnboarded && (
        <OnboardingChecklist 
          hasClient={!!hasClient} 
          hasGit={!!hasGitConnector} 
          hasCms={!!hasCmsConnector} 
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clients" value={clients?.length.toString() || '0'} icon={Users} />
        <StatCard title="Articles" value={articles?.length.toString() || '0'} icon={FileText} />
        <StatCard title="Active Jobs" value={jobs?.filter(j => j.status === 'running').length.toString() || '0'} icon={Activity} />
        <StatCard title="Opportunities" value="12" icon={Sparkles} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {clients && clients.length > 0 ? (
              <div className="space-y-4">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-slate-900">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.aiModelPreference}</p>
                    </div>
                    <Button variant="ghost" size="sm">Manage</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-slate-500">No clients found.</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/dashboard/clients">Create First Client</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
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
              {(!jobs || jobs.length === 0) && (
                <p className="text-center text-sm text-slate-500 py-8">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OnboardingChecklist({ hasClient, hasGit, hasCms }: { hasClient: boolean, hasGit: boolean, hasCms: boolean }) {
  return (
    <Card className="border-blue-100 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-blue-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Complete Your Setup
        </CardTitle>
        <CardDescription className="text-blue-700/70">
          Follow these steps to unlock the full power of Deseo SEO Platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <OnboardingStep 
          title="Create a Client" 
          description="Define your target domain and audience."
          isCompleted={hasClient}
          href="/dashboard/clients"
        />
        <OnboardingStep 
          title="Connect Git" 
          description="Allow Deseo to scan and optimize your code."
          isCompleted={hasGit}
          href="/dashboard/marketplace"
        />
        <OnboardingStep 
          title="Connect CMS" 
          description="Enable one-click article publishing."
          isCompleted={hasCms}
          href="/dashboard/marketplace"
        />
      </CardContent>
    </Card>
  );
}

function OnboardingStep({ title, description, isCompleted, href }: { title: string, description: string, isCompleted: boolean, href: string }) {
  return (
    <div className={cn(
      "relative flex flex-col justify-between rounded-lg border p-4 transition-all",
      isCompleted ? "bg-white/50 border-green-100" : "bg-white border-slate-200 shadow-sm"
    )}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className={cn("font-semibold text-sm", isCompleted ? "text-green-700" : "text-slate-900")}>{title}</h3>
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-50" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300" />
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">{description}</p>
      </div>
      {!isCompleted && (
        <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50" asChild>
          <Link href={href}>
            Configure <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      )}
    </div>
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
