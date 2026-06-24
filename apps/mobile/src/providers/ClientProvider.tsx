import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useClients } from '@deseo/api-client';

type Client = {
  id: string;
  name: string;
  slug: string;
  aiModelPreference?: string | null;
};

interface ClientContextType {
  activeClientId: string | null;
  setActiveClientId: (id: string) => void;
  activeClient: Client | null;
  clients: Client[];
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const { data: clients = [], isLoading } = useClients();

  // Restore saved client id on mount
  useEffect(() => {
    AsyncStorage.getItem('active_client_id').then((saved) => {
      if (saved) setActiveClientIdState(saved);
    });
  }, []);

  // Auto-select first client once loaded, if none selected
  useEffect(() => {
    if (!isLoading && clients.length > 0 && !activeClientId) {
      const firstId = clients[0]!.id;
      setActiveClientIdState(firstId);
      AsyncStorage.setItem('active_client_id', firstId);
    }
  }, [clients, isLoading, activeClientId]);

  const setActiveClientId = (id: string) => {
    setActiveClientIdState(id);
    AsyncStorage.setItem('active_client_id', id);
  };

  const activeClient = clients.find((c) => c.id === activeClientId) ?? null;

  return (
    <ClientContext.Provider value={{ activeClientId, setActiveClientId, activeClient, clients, isLoading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}
