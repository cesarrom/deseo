import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@deseo/db', '@deseo/types'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default config;
