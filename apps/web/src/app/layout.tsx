import type { Metadata } from 'next';
import { TRPCProvider } from '@/providers/trpc-provider';
import { SessionProvider } from '@/providers/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deseo - SEO Platform',
  description: 'AI-powered SEO content generation and optimization',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
