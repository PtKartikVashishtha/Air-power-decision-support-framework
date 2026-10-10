import type { NextConfig } from 'next';

const isPreview = process.env.BUILD_PREVIEW === 'true';
const isStandalone = process.env.BUILD_STANDALONE === 'true';

const nextConfig: NextConfig = {
  output: isPreview ? 'export' : isStandalone ? 'standalone' : undefined,
  trailingSlash: isPreview,
  images: {
    unoptimized: isPreview,
  },
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
