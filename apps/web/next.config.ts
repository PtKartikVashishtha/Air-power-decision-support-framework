import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  transpilePackages: ['@air-power/shared', '@air-power/sim', '@air-power/optimizer'],
};

export default nextConfig;
