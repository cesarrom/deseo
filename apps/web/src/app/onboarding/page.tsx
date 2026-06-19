'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { useClient } from '@/providers/client-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@deseo/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Github, FileCode, BarChart3, CheckCircle2, ChevronRight, ChevronLeft, ExternalLink, Loader2, Info, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@deseo/ui/dialog';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';

type OnboardingStep = 'CLIENT' | 'CMS' | 'ANALYTICS' | 'GIT' | 'SUMMARY';

export default function OnboardingPage() {
  const router = useRouter();
  const { activeClientId, setActiveClientId, clients } = useClient();
  const utils = trpc.useUtils();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('CLIENT');
  const [clientForm, setClientForm] = useState({ name: '', slug: '' });

  // Sync current step with existing clients
  useEffect(() => {
    if (clients && clients.length > 0 && currentStep === 'CLIENT') {
      if (!activeClientId) {
        setActiveClientId(clients[0].id);
      }
      setCurrentStep('CMS');
    }
  }, [clients, currentStep, activeClientId, setActiveClientId]);
  
  // Queries
  const { data: availableApps, isLoading: isLoadingApps } = trpc.registry.listAvailableApps.useQuery();
  const { data: installations, isLoading: isLoadingInst } = trpc.registry.listInstallations.useQuery();

  // Filter apps by category
  const gitApps = availableApps?.filter(app => app.type === 'feature:git') || [];
  const cmsApps = availableApps?.filter(app => app.type === 'feature:cms') || [];
  const analyticsApps = availableApps?.filter(app => app.type === 'feature:analytics') || [];

  // Check completion per category
  const hasGit = installations?.some(i => i.app.type === 'feature:git' && i.status === 'active');
  const hasCms = installations?.some(i => i.app.type === 'feature:cms' && i.status === 'active');
  const hasAnalytics = installations?.some(i => i.app.type === 'feature:analytics' && i.status === 'active');

  const steps: { id: OnboardingStep; title: string; icon: any; isComplete: boolean; isOptional?: boolean }[] = [
    { id: 'CLIENT', title: 'Create Client', icon: Building2, isComplete: !!(clients && clients.length > 0) },
    { id: 'CMS', title: 'Content Management', icon: FileCode, isComplete: !!hasCms },
    { id: 'ANALYTICS', title: 'SEO & Analytics', icon: BarChart3, isComplete: !!hasAnalytics },
    { id: 'GIT', title: 'Developer Tools', icon: Github, isComplete: !!hasGit, isOptional: true },
    { id: 'SUMMARY', title: 'Finish', icon: CheckCircle2, isComplete: !!(hasCms && hasAnalytics) },
  ];

  const createClientMutation = trpc.clients.create.useMutation({
    onSuccess: (newClient) => {
      utils.clients.list.invalidate();
      setActiveClientId(newClient.id);
      setCurrentStep('CMS');
    },
  });

  const installMutation = trpc.registry.installApp.useMutation({
    onSuccess: (data) => {
      // Open connector config in a popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.redirectUrl,
        'deseo-install',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'DESEO_INSTALL_COMPLETE') {
          utils.registry.listInstallations.invalidate();
          window.removeEventListener('message', messageHandler);
        }
      };
      window.addEventListener('message', messageHandler);
    },
  });

  const nextStep = () => {
    if (currentStep === 'CLIENT') return; // Handled by mutation
    if (currentStep === 'CMS') setCurrentStep('ANALYTICS');
    else if (currentStep === 'ANALYTICS') setCurrentStep('GIT');
    else if (currentStep === 'GIT') setCurrentStep('SUMMARY');
    else router.push('/dashboard');
  };

  const prevStep = () => {
    if (currentStep === 'CMS') setCurrentStep('CLIENT');
    else if (currentStep === 'ANALYTICS') setCurrentStep('CMS');
    else if (currentStep === 'GIT') setCurrentStep('ANALYTICS');
    else if (currentStep === 'SUMMARY') setCurrentStep('GIT');
  };

  const canGoNext = () => {
    if (currentStep === 'CLIENT') return false; // Must click create
    if (currentStep === 'CMS') return hasCms;
    if (currentStep === 'ANALYTICS') return hasAnalytics;
    if (currentStep === 'GIT') return true; // Optional
    return true;
  };

  if (isLoadingApps || isLoadingInst) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentCategoryApps = 
    currentStep === 'CMS' ? cmsApps : 
    currentStep === 'ANALYTICS' ? analyticsApps : 
    currentStep === 'GIT' ? gitApps : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center px-8 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-blue-600">Deseo</span>
          <span className="text-slate-300 mx-2">|</span>
          <span className="font-semibold text-slate-700">Setup Wizard</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500 font-medium">Progress</p>
          <div className="flex gap-1.5">
            {steps.map((s) => (
              <div 
                key={s.id} 
                className={cn(
                  "h-1.5 w-10 rounded-full transition-all",
                  s.isComplete ? "bg-green-500" : (currentStep === s.id ? "bg-blue-600" : "bg-slate-200")
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full py-12 px-6">
        <div className="flex gap-12">
          {/* Sidebar Nav */}
          <div className="w-64 space-y-2 hidden md:block">
            {steps.map((s, idx) => (
              <div 
                key={s.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
                  currentStep === s.id ? "bg-white border-blue-100 shadow-sm" : "border-transparent text-slate-400"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  s.isComplete ? "bg-green-100 text-green-600" : (currentStep === s.id ? "bg-blue-100 text-blue-600" : "bg-slate-100")
                )}>
                  {s.isComplete ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs font-bold uppercase tracking-wider", currentStep === s.id ? "text-blue-600" : "text-slate-400")}>Step {idx + 1}</p>
                    {s.isOptional && <Badge variant="outline" className="text-[8px] h-3 px-1 border-slate-200 text-slate-400">Optional</Badge>}
                  </div>
                  <p className={cn("text-sm font-semibold", currentStep === s.id ? "text-slate-900" : "text-slate-500")}>{s.title}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 space-y-8">
            {currentStep === 'CLIENT' && (
              <div className="max-w-md space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900">Let&apos;s start with a Client</h2>
                  <p className="text-slate-500">Deseo organizes work by Client. Create your first one to continue.</p>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Client Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. Acme Corp" 
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Project Slug (URL friendly)</Label>
                      <Input 
                        id="slug" 
                        placeholder="acme-corp" 
                        value={clientForm.slug}
                        onChange={(e) => setClientForm({ ...clientForm, slug: e.target.value })}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => createClientMutation.mutate({ ...clientForm })}
                      disabled={!clientForm.name || !clientForm.slug || createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                      Create Client & Continue
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {currentStep !== 'SUMMARY' && currentStep !== 'CLIENT' ? (
              <>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {currentStep === 'GIT' && 'Automate Code Fixes'}
                    {currentStep === 'CMS' && 'Link Your Content Management'}
                    {currentStep === 'ANALYTICS' && 'Setup SEO Tracking'}
                  </h2>
                  <p className="text-slate-500">
                    {currentStep === 'GIT' && 'Connecting GitHub or GitLab allows Deseo to automatically create Pull Requests with meta-tag fixes and performance optimizations directly in your code.'}
                    {currentStep === 'CMS' && 'Connect your blog or CMS to enable one-click publishing of AI-generated articles.'}
                    {currentStep === 'ANALYTICS' && 'Link your search data to help Deseo identify high-impact keyword opportunities.'}
                  </p>
                  {currentStep === 'GIT' && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>Developer Note:</strong> If you are not a developer or don&apos;t have access to the repository, you can skip this step. You&apos;ll still be able to generate content and track SEO, but you&apos;ll have to apply code-level fixes manually.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentCategoryApps.map((app) => {
                    const inst = installations?.find(i => i.app.id === app.id);
                    const isInstalled = inst?.status === 'active';
                    return (
                      <Dialog key={app.id}>
                        <Card className={cn("flex flex-col hover:shadow-lg transition-all border-2 relative group", isInstalled ? "border-green-500 bg-green-50/20" : "border-transparent")}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors overflow-hidden p-2">
                                {app.iconUrl ? (
                                  <img src={app.iconUrl} alt={app.name} className="h-full w-full object-contain" />
                                ) : (
                                  app.type === 'feature:git' ? <Github className="h-6 w-6" /> : 
                                  app.type === 'feature:cms' ? <FileCode className="h-6 w-6" /> : 
                                  <BarChart3 className="h-6 w-6" />
                                )}
                              </div>
                              {isInstalled ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">Connected</Badge>
                              ) : (
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                    <Info className="h-5 w-5" />
                                  </Button>
                                </DialogTrigger>
                              )}
                            </div>
                            <CardTitle className="mt-4 text-xl">{app.name}</CardTitle>
                            <div className="text-sm line-clamp-2 mt-2 text-slate-500 prose prose-slate prose-xs">
                              <ReactMarkdown>{app.description || `Integrate ${app.name} with Deseo to automate your ${currentStep.toLowerCase()} workflow.`}</ReactMarkdown>
                            </div>
                          </CardHeader>
                          <div className="flex-1" />
                          <CardFooter className="pt-4">
                            <Button 
                              className="w-full" 
                              variant={isInstalled ? "outline" : "default"}
                              onClick={() => installMutation.mutate({ appId: app.id })}
                              disabled={installMutation.isPending}
                            >
                              {isInstalled ? 'Reconnect' : 'Install'}
                            </Button>
                          </CardFooter>
                        </Card>

                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <div className="flex items-center gap-4 mb-4">
                              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden p-3">
                                {app.iconUrl ? (
                                  <img src={app.iconUrl} alt={app.name} className="h-full w-full object-contain" />
                                ) : (
                                  app.type === 'feature:git' ? <Github className="h-10 w-10" /> : 
                                  app.type === 'feature:cms' ? <FileCode className="h-10 w-10" /> : 
                                  <BarChart3 className="h-10 w-10" />
                                )}
                              </div>
                              <div>
                                <DialogTitle className="text-2xl">{app.name}</DialogTitle>
                                <Badge variant="outline" className="mt-1 capitalize">
                                  {app.type.split(':')[1]} Provider
                                </Badge>
                              </div>
                            </div>
                            <div className="text-base leading-relaxed text-slate-600 prose prose-slate max-w-none">
                              <ReactMarkdown>
                                {app.description || `Connecting ${app.name} allows Deseo to interact with your ${currentStep.toLowerCase()} data. This integration is essential for automated SEO workflows.`}
                              </ReactMarkdown>
                            </div>
                          </DialogHeader>
                          
                          <div className="py-6 space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Permissions</h4>
                            <ul className="space-y-3">
                              {[
                                'Read-only access to basic account info',
                                `Full access to ${currentStep.toLowerCase()} management`,
                                'Automated updates and synchronization'
                              ].map((p, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <DialogFooter>
                            <Button 
                              className="w-full h-12 text-base font-bold" 
                              onClick={() => installMutation.mutate({ appId: app.id })}
                              disabled={installMutation.isPending}
                            >
                              {installMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                              Authorize & Install
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    );
                  })}
                </div>
              </>
            ) : null}

            {currentStep === 'SUMMARY' && (
              <div className="text-center py-12 space-y-6">
                <div className="mx-auto h-24 w-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900">Setup Complete!</h2>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Awesome! You&apos;ve connected your Git, CMS, and Analytics providers. 
                    Deseo is now ready to take your SEO to the next level.
                  </p>
                </div>
                <Button size="lg" className="px-12" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Nav Footer */}
            <div className="pt-8 border-t flex justify-between items-center">
              <Button 
                variant="ghost" 
                onClick={prevStep} 
                disabled={currentStep === 'CLIENT'}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-4">
                {!canGoNext() && currentStep !== 'CLIENT' && (
                  <p className="text-xs text-amber-600 font-medium animate-pulse">
                    Please connect at least one {currentStep} integration
                  </p>
                )}
                {currentStep !== 'CLIENT' && (
                  <Button 
                    onClick={nextStep} 
                    disabled={!canGoNext() || currentStep === 'SUMMARY'}
                    className="px-8"
                  >
                    {currentStep === 'ANALYTICS' ? 'Finish' : 'Next'} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
