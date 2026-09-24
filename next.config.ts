import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Covers are pre-sized files in public/covers; serve them as-is.
  images: { unoptimized: true },
};

export default nextConfig;
