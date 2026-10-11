import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@petty-tab/shared'],
  // Same origin for the browser: the session cookie (M2) and SSE (M3) go through /api.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
