import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

// Everything is same-origin: fonts are self-hosted by next/font, renders come through /api. Next's hydration
// needs inline scripts and styles ('unsafe-inline'); its dev runtime also needs eval. HSTS comes from Caddy.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@petty-tab/shared', '@petty-tab/reel'],
  // The floating dev badge would land in screenshot comparisons.
  devIndicators: false,
  // spec §12: the browser subscribes to Web Push with the API's public VAPID key (one variable, two readers).
  env: { VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? '' },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Same origin for the browser: the session cookie (M2) and SSE (M3) go through /api.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};

export default config;
