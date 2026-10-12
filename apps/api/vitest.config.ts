import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The API tests use the real database and INVITE_KEY from the root .env (CI copies .env.example).
const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({});
