import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The API tests use the real database and INVITE_KEY from the root .env (CI copies .env.example).
const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

// One file at a time: sealDue() and remind() sweep every pair in the database, so a sweep in one file would
// seal or remind another file's pairs mid-test.
export default defineConfig({ test: { fileParallelism: false } });
