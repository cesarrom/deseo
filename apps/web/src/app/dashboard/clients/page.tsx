'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Loader2, Plus, Users, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ClientsPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  
  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery({});
  
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setName('');
      setSlug('');
    },
    onError: (err) => {
      alert(`Error creating client: ${err.message}`);
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, slug });
  };

  const updateSlug = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clients</h1>
        <p className="text-slate-500">Manage your business profiles and SEO targets.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add New Client</CardTitle>
            <CardDescription>Create a profile for a new site or business.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input 
                  id="name" 
                  placeholder="Acme Inc." 
                  value={name} 
                  onChange={(e) => updateSlug(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL friendly)</Label>
                <Input 
                  id="slug" 
                  placeholder="acme-inc" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Client
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Clients
          </h2>
          
          <div className="grid gap-4">
            {clients?.map((client) => (
              <Card key={client.id}>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-slate-900">{client.name}</h3>
                    <p className="text-xs text-slate-500">Slug: {client.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">Manage</Button>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {(!clients || clients.length === 0) && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-slate-500">No clients yet. Create one to start generating content.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
