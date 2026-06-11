'use client';

import { useClient } from '@/providers/client-provider';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

export function InitialOnboarding() {
  const { clients, setActiveClientId, isCreateModalOpen, setCreateModalOpen } = useClient();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: (data) => {
      utils.clients.list.invalidate();
      if (data?.id) {
        setActiveClientId(data.id);
        setCreateModalOpen(false);
      }
    },
    onError: (err) => {
      alert(`Error creating client: ${err.message}`);
    }
  });

  // If they have clients and aren't forcing the modal open, don't show it
  if (clients.length > 0 && !isCreateModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    createMutation.mutate({ name, slug });
  };

  const isForced = clients.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <Card className="w-[450px] shadow-2xl animate-in fade-in zoom-in duration-300 relative">
        {!isForced && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute top-2 right-2 text-slate-400"
            onClick={() => setCreateModalOpen(false)}
          >
            ✕
          </Button>
        )}
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to Deseo</CardTitle>
          <CardDescription className="text-base mt-2">
            Let's set up your workspace. 
            <br/><br/>
            <strong>Step 1:</strong> Create a Client (Project).<br/>
            <strong>Step 2:</strong> Install Integrations (Git, CMS, etc).<br/>
            <strong>Step 3:</strong> Configure AI Models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g., Acme Plumbing"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Auto-generate slug
                  if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                  }
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Project Slug (URL friendly)</Label>
              <Input
                id="slug"
                placeholder="acme-plumbing"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={createMutation.isPending || !name || !slug}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Project
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
