'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

type Client = {
  id: string;
  name: string;
  slug: string;
};

interface ClientContextType {
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  clients: Client[];
  isLoading: boolean;
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const { data: clients, isLoading } = trpc.clients.list.useQuery(
    { userId: session?.user?.id || '' },
    { enabled: !!session?.user?.id }
  );

  useEffect(() => {
    // Auto-select first client if none selected
    if (clients && clients.length > 0 && !activeClientId && clients[0]?.id) {
      setActiveClientId(clients[0].id);
    }
  }, [clients, activeClientId]);

  useEffect(() => {
    if (activeClientId) {
      document.cookie = `deseo_active_client_id=${activeClientId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [activeClientId]);

  // Only block the UI if we are loading AND we expect to have clients
  // (Or if the user is authenticated and we haven't checked for clients yet)
  if (isLoading && !clients) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ClientContext.Provider
      value={{
        activeClientId,
        setActiveClientId,
        clients: clients || [],
        isLoading,
        isCreateModalOpen,
        setCreateModalOpen,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
