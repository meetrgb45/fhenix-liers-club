'use client';
import { WagmiProvider, createConfig, http, fallback } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const ARBNOVA_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://arbitrum-sepolia-rpc.publicnode.com';

const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  multiInjectedProviderDiscovery: false,
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: fallback([
      http(ARBNOVA_RPC),
      http('https://arbitrum-sepolia-rpc.publicnode.com'),
    ]),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
