'use client';

import { useState } from 'react';
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useUserApps,
  useRegisterApp,
  useUpdateApp,
  useTogglePublishApp,
  useDeleteApp,
} from '@deseo/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@deseo/ui/card';
import { Button } from '@deseo/ui/button';
import { Input } from '@deseo/ui/input';
import { Label } from '@deseo/ui/label';
import { Badge } from '@deseo/ui/badge';
import { 
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  CheckCircle2,
  Code, 
  Github,
  FileCode,
  BarChart3,
  Loader2,
  Edit3
} from 'lucide-react';
import { RichEditor } from '@/components/rich-editor';
import ReactMarkdown from 'react-markdown';

export default function DeveloperPage() {
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [createdApp, setCreatedApp] = useState<{ clientId: string, clientSecret: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  // API Key Queries/Mutations
  const { data: apiKeys, refetch: refetchKeys } = useApiKeys();
  const createKeyMutation = useCreateApiKey({
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setNewKeyName('');
      refetchKeys();
    }
  });
  const deleteKeyMutation = useDeleteApiKey({
    onSuccess: () => refetchKeys()
  });

  const defaultApp = {
    name: '',
    slug: '',
    description: '',
    iconUrl: '',
    type: 'feature:git' as 'feature:git' | 'feature:cms' | 'feature:analytics',
    baseUrl: '',
    configUrl: '/ui/configure',
    settingsUrl: '',
  };

  const [newApp, setNewApp] = useState(defaultApp);

  // Connector Queries/Mutations
  const { data: myApps, refetch: refetchApps, isLoading: isLoadingApps } = useUserApps();
  const registerAppMutation = useRegisterApp({
    onSuccess: (data) => {
      setCreatedApp({ clientId: data.clientId, clientSecret: data.clientSecret });
      refetchApps();
      setNewApp(defaultApp);
    }
  });
  const updateAppMutation = useUpdateApp({
    onSuccess: () => {
      refetchApps();
      setNewApp(defaultApp);
      setEditingAppId(null);
    }
  });
  const togglePublishMutation = useTogglePublishApp({
    onSuccess: () => refetchApps()
  });
  const deleteAppMutation = useDeleteApp({
    onSuccess: () => refetchApps()
  });

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Developer Settings</h1>
        <p className="text-slate-500">Manage API keys and register your custom connectors.</p>
      </div>

      {/* API Keys Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">API Keys</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Generate New Key</CardTitle>
            <CardDescription>Use these keys to authenticate with the Deseo CLI or API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input 
                  id="key-name" 
                  placeholder="e.g. CLI Laptop" 
                  value={newKeyName || ''}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => createKeyMutation.mutate({ name: newKeyName })}
                  disabled={!newKeyName || createKeyMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Key
                </Button>
              </div>
            </div>

            {createdKey && (
              <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Your New API Key</p>
                    <p className="text-sm font-mono text-blue-900 break-all">{createdKey}</p>
                    <p className="text-xs text-blue-600 mt-2">Make sure to copy it now. You won&apos;t be able to see it again!</p>
                  </div>
                  <Button size="icon" variant="ghost" className="text-blue-700 hover:bg-blue-100" onClick={handleCopyKey}>
                    {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 border-t pt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-4">Your Active Keys</h3>
              <div className="space-y-3">
                {apiKeys?.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-slate-200">
                        <Key className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{key.name}</p>
                        <p className="text-xs text-slate-500">
                          Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => deleteKeyMutation.mutate({ id: key.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {apiKeys?.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No API keys generated yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Connectors Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Your Connectors</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{editingAppId ? 'Edit Connector' : 'Register Connector'}</CardTitle>
              <CardDescription>{editingAppId ? 'Update your connector details.' : 'Manually register a new integration.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="app-name">Display Name</Label>
                <Input 
                  id="app-name" 
                  placeholder="e.g. GitLab" 
                  value={newApp.name || ''}
                  onChange={(e) => setNewApp({...newApp, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="app-slug">Slug (Unique ID)</Label>
                <Input 
                  id="app-slug" 
                  placeholder="e.g. gitlab" 
                  value={newApp.slug || ''}
                  onChange={(e) => setNewApp({...newApp, slug: e.target.value.toLowerCase().replace(/\\s+/g, '-')})}
                />
              </div>
              <div className="grid gap-2">
                <RichEditor 
                  label="Description (Rich Text)"
                  placeholder="## Features\n- Direct publishing\n- Automated SEO fixes"
                  value={newApp.description}
                  onChange={(val) => setNewApp({...newApp, description: val})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="app-icon">Icon URL (SVG/PNG)</Label>
                <Input 
                  id="app-icon" 
                  placeholder="https://cdn.example.com/icon.svg" 
                  value={newApp.iconUrl || ''}
                  onChange={(e) => setNewApp({...newApp, iconUrl: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newApp.type}
                  onChange={(e) => setNewApp({...newApp, type: e.target.value as any})}
                >
                  <option value="feature:git">Git Provider</option>
                  <option value="feature:cms">CMS Provider</option>
                  <option value="feature:analytics">Analytics Provider</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="base-url">Base URL (Internal Endpoint)</Label>
                <Input 
                  id="base-url" 
                  placeholder="https://your-connector.app" 
                  value={newApp.baseUrl || ''}
                  onChange={(e) => setNewApp({...newApp, baseUrl: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-url">Settings URL (Relative to Base URL, Optional)</Label>
                <Input 
                  id="settings-url" 
                  placeholder="/ui/settings" 
                  value={newApp.settingsUrl || ''}
                  onChange={(e) => setNewApp({...newApp, settingsUrl: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                {editingAppId ? (
                  <>
                    <Button 
                      className="flex-1" 
                      onClick={() => updateAppMutation.mutate({ id: editingAppId, ...newApp })}
                      disabled={updateAppMutation.isPending || !newApp.name || !newApp.slug || !newApp.baseUrl}
                    >
                      {updateAppMutation.isPending ? 'Updating...' : 'Update Connector'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setNewApp(defaultApp);
                        setEditingAppId(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => registerAppMutation.mutate(newApp)}
                    disabled={registerAppMutation.isPending || !newApp.name || !newApp.slug || !newApp.baseUrl}
                  >
                    {registerAppMutation.isPending ? 'Registering...' : 'Register Connector'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {createdApp && (
            <div className="md:col-span-2 rounded-xl border border-green-100 bg-green-50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-green-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Connector Registered!
                  </h3>
                  <p className="text-sm text-green-700">Copy these credentials into your connector&apos;s <code>.env</code> file. The secret will not be shown again.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCreatedApp(null)} className="text-green-800 hover:bg-green-100">Dismiss</Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-green-800">Client ID</Label>
                  <div className="flex items-center gap-2 bg-white border border-green-200 rounded-md p-2">
                    <code className="text-xs font-mono text-slate-800 flex-1 truncate">{createdApp.clientId}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-700" onClick={() => navigator.clipboard.writeText(createdApp.clientId)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-green-800">Client Secret</Label>
                  <div className="flex items-center gap-2 bg-white border border-green-200 rounded-md p-2">
                    <code className="text-xs font-mono text-slate-800 flex-1 truncate">{createdApp.clientSecret}</code>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-700" onClick={() => {
                      navigator.clipboard.writeText(createdApp.clientSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}>
                      {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700">My Registered Apps</h3>
            {isLoadingApps ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {myApps?.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-blue-50 text-blue-600 h-10 w-10 flex items-center justify-center overflow-hidden">
                            {app.iconUrl ? (
                              <img src={app.iconUrl} alt={app.name} className="h-full w-full object-contain" />
                            ) : (
                              app.type === 'feature:git' ? <Github className="h-5 w-5" /> : 
                              app.type === 'feature:cms' ? <FileCode className="h-5 w-5" /> : 
                              <BarChart3 className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{app.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{app.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-blue-600"
                            onClick={() => {
                              setNewApp({
                                name: app.name,
                                slug: app.slug,
                                description: app.description || '',
                                iconUrl: app.iconUrl || '',
                                type: app.type as any,
                                baseUrl: app.baseUrl,
                                configUrl: app.configUrl || '',
                                settingsUrl: app.settingsUrl || '',
                              });
                              setEditingAppId(app.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-red-600"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this connector? This cannot be undone.')) {
                                deleteAppMutation.mutate({ id: app.id });
                              }
                            }}
                            disabled={deleteAppMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Badge variant="secondary" className="capitalize ml-2">
                            {app.type.split(':')[1]}
                          </Badge>
                        </div>
                      </div>

                      {app.description && (
                        <div className="mt-4 text-xs text-slate-600 prose prose-slate prose-xs max-w-none border-l-2 border-slate-100 pl-3">
                          <ReactMarkdown>{app.description}</ReactMarkdown>
                        </div>
                      )}
                      
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className={`h-2 w-2 rounded-full ${app.isPublished ? 'bg-green-500' : 'bg-slate-300'}`} />
                           <span className="text-xs font-medium text-slate-600">
                             {app.isPublished ? 'Published' : 'Private'}
                           </span>
                         </div>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="h-7 text-[10px]"
                           onClick={() => togglePublishMutation.mutate({ id: app.id })}
                           disabled={togglePublishMutation.isPending}
                         >
                           {app.isPublished ? 'Make Private' : 'Publish to Marketplace'}
                         </Button>
                      </div>

                      <div className="mt-4 space-y-2 border-t pt-4">
                        <div className="grid gap-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Client ID</p>
                          <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-50 border border-slate-100">
                             <p className="text-xs font-mono truncate flex-1">{app.clientId}</p>
                             <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(app.clientId)}>
                               <Copy className="h-3 w-3" />
                             </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <Code className="h-3 w-3" />
                          <span>Base: {app.baseUrl}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {myApps?.length === 0 && (
                  <p className="text-sm text-slate-500 italic text-center py-8">No connectors registered yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
