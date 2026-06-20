'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from '@/utils/trpc';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trpc`,
          transformer: superjson,
          headers() {
            // Read active client ID from cookies
            const cookieValue = document.cookie
              .split('; ')
              .find((row) => row.startsWith('deseo_active_client_id='))
              ?.split('=')[1];
              
            return {
              'x-active-client-id': cookieValue,
            };
          },
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              credentials: 'include', // Ensures the browser sends the Auth.js JWT cookie cross-origin
            });
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
