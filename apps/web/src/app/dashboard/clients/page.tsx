'use client';

import { trpc } from '@/utils/trpc';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@deseo/ui/card';
import { Badge } from '@deseo/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@deseo/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@deseo/ui/tabs';
import { Loader2, Plus, Users, Trash2, Settings2, Cpu } from 'lucide-react';
import { useState } from 'react';
import { ModelSelector } from '@/components/model-selector';

const MODEL_ROLES = [
  {
    key: 'aiSmartModel' as const,
    label: 'Orchestrator',
    description: 'Plans the article blueprint and does the final editorial review. Use your best model here.',
    defaultModel: 'anthropic/claude-sonnet-4-6',
    imageOnly: false,
  },
  {
    key: 'aiModelPreference' as const,
    label: 'Writer',
    description: 'Writes each section. This runs once per section in parallel — balance quality vs. cost.',
    defaultModel: 'openai/gpt-4o',
    imageOnly: false,
  },
  {
    key: 'aiFastModel' as const,
    label: 'Planner',
    description: 'Handles quick structured tasks like visual planning. A fast, cheap model works well here.',
    defaultModel: 'openai/gpt-4o-mini',
    imageOnly: false,
  },
  {
    key: 'aiImageModel' as const,
    label: 'Images',
    description: 'Generates article images. Must be an image model (e.g. dall-e-3, flux, recraft).',
    defaultModel: 'openai/dall-e-3',
    imageOnly: true,
  },
] as const;

type ModelConfig = {
  aiSmartModel: string;
  aiModelPreference: string;
  aiFastModel: string;
  aiImageModel: string;
};

function ModelConfigDialog({
  client,
  open,
  onClose,
}: {
  client: { id: string; name: string; aiSmartModel?: string | null; aiModelPreference?: string | null; aiFastModel?: string | null; aiImageModel?: string | null };
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [models, setModels] = useState<ModelConfig>({
    aiSmartModel: client.aiSmartModel ?? 'anthropic/claude-sonnet-4-6',
    aiModelPreference: client.aiModelPreference ?? 'openai/gpt-4o',
    aiFastModel: client.aiFastModel ?? 'openai/gpt-4o-mini',
    aiImageModel: client.aiImageModel ?? 'openai/dall-e-3',
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      onClose();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ id: client.id, ...models });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            AI Models — {client.name}
          </DialogTitle>
          <DialogDescription>
            Each pipeline stage uses a different model. Pick the right tradeoff for each role.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="aiSmartModel" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            {MODEL_ROLES.map((role) => (
              <TabsTrigger key={role.key} value={role.key}>{role.label}</TabsTrigger>
            ))}
          </TabsList>

          {MODEL_ROLES.map((role) => (
            <TabsContent key={role.key} value={role.key} className="mt-4 space-y-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-slate-600">
                {role.description}
              </div>
              <ModelSelector
                value={models[role.key] ?? role.defaultModel}
                onChange={(val) => setModels((prev) => ({ ...prev, [role.key]: val }))}
                imageOnly={role.imageOnly}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Models
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [managingClient, setManagingClient] = useState<string | null>(null);

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
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, slug });
  };

  const updateSlug = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const activeClient = managingClient ? clients?.find((c) => c.id === managingClient) : null;

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
        <p className="text-slate-500">Manage your business profiles and AI model configuration.</p>
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
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="acme-inc"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
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
                  <div className="space-y-1">
                    <h3 className="font-medium text-slate-900">{client.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{client.slug}</p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <ModelBadge label="Orchestrator" modelId={client.aiSmartModel} />
                      <ModelBadge label="Writer" modelId={client.aiModelPreference} />
                      <ModelBadge label="Planner" modelId={client.aiFastModel} />
                      <ModelBadge label="Images" modelId={client.aiImageModel} />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setManagingClient(client.id)}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Models
                    </Button>
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

      {activeClient && (
        <ModelConfigDialog
          client={activeClient}
          open={!!managingClient}
          onClose={() => setManagingClient(null)}
        />
      )}
    </div>
  );
}

function ModelBadge({ label, modelId }: { label: string; modelId?: string | null }) {
  if (!modelId) return null;
  const shortId = modelId.split('/').pop() ?? modelId;
  return (
    <Badge variant="outline" className="text-[10px] gap-1 font-normal border-slate-200 text-slate-500">
      <span className="font-medium text-slate-700">{label}:</span>
      {shortId}
    </Badge>
  );
}
