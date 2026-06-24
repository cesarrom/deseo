import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc, createDeseoLink } from '@deseo/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.51:3001';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        createDeseoLink({
          url: `${API_URL}/trpc`,
          headers: async () => {
            const token = await AsyncStorage.getItem('auth_token');
            const clientId = await AsyncStorage.getItem('active_client_id');
            return {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(clientId ? { 'x-active-client-id': clientId } : {}),
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
