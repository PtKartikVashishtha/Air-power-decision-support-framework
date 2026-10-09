import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['@air-power/shared', '@air-power/sim', '@air-power/optimizer'],
  serverExternalPackages: ['highs'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        module: false,
        'node:module': false,
      };
    }
    return config;
  },
};

export default nextConfig;
