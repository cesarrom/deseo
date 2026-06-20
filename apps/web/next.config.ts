import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
transpilePackages: ['@deseo/db', '@deseo/types'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default config;
