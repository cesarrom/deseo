'use client';

import { useClient } from '@/providers/client-provider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@deseo/ui/card';
import { Loader2, Sparkles, CheckCircle2, Building2 } from 'lucide-react';
import { ModelSelector } from './model-selector';

type Step = 'INFO' | 'DONE';

export function InitialOnboarding() {
  const router = useRouter();
  const { clients, setActiveClientId, isCreateModalOpen, setCreateModalOpen } = useClient();
  const utils = trpc.useUtils();
  
  const [step, setStep] = useState<Step>('INFO');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [aiModelPreference, setAiModelPreference] = useState('openai/gpt-4o');

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      if (data?.id) {
        setActiveClientId(data.id);
        setStep('DONE');
        setTimeout(() => {
          setCreateModalOpen(false);
          router.push('/onboarding');
        }, 1500);
      }
    },
  });

  // If they have clients and aren't forcing the modal open, don't show it
  if (clients.length > 0 && !isCreateModalOpen) return null;

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, slug, aiModelPreference });
  };

  const isForced = clients.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-[600px] shadow-2xl animate-in fade-in zoom-in duration-300 relative my-auto">
        {!isForced && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-4 right-4 text-slate-400"
            onClick={() => setCreateModalOpen(false)}
          >
            ✕
          </Button>
        )}
        
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'INFO' && 'Create Your Project'}
            {step === 'DONE' && 'Client Created!'}
          </CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            {step === 'INFO' && 'Deseo organizes your SEO work by Client. Let\'s create your first one.'}
            {step === 'DONE' && 'Setting up your workspace...'}
          </p>
        </CardHeader>

        <CardContent className="py-6 overflow-y-auto max-h-[70vh]">
          {step === 'INFO' && (
            <form id="onboarding-info" onSubmit={handleInfoSubmit} className="space-y-6">
               <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Client/Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Acme Corp Blog"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      const generatedSlug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '');
                      setSlug(generatedSlug);
                    }}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Project Slug (URL friendly)</Label>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" /> 
                  Primary AI Model
                </Label>
                <p className="text-xs text-slate-500">Select the model that will drive your content generation and SEO analysis.</p>
                <ModelSelector value={aiModelPreference} onChange={setAiModelPreference} />
              </div>
            </form>
          )}

          {step === 'DONE' && (
            <div className="py-10 text-center space-y-4">
              <div className="mx-auto bg-green-100 p-4 rounded-full w-20 h-20 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Success!</h3>
              <p className="text-slate-500">
                Opening Setup Wizard...
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t bg-slate-50 rounded-b-xl px-6 py-4 flex justify-end">
           {step === 'INFO' && (
              <Button 
                type="submit" 
                form="onboarding-info"
                disabled={createMutation.isPending || !name || !slug}
                className="w-full sm:w-auto"
              >
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create & Continue
              </Button>
           )}
        </CardFooter>
      </Card>
    </div>
  );
}
