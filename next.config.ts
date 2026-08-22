import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

const version = fs.readFileSync(path.resolve(__dirname, 'version.txt'), 'utf-8').trim();

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;