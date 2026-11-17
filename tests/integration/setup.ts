import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';
import { readLocalSupabase } from '../../scripts/create-test-user.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    localSecretKey: string;
  }
}

const ENV_FILE = fileURLToPath(new URL('../../.env.local', import.meta.url));

const HOW_TO_START = 'Start the local Supabase with `npm run db:start` and run again.';

function loadEnv(): { url: string; publishableKey: string } {
  if (!existsSync(ENV_FILE)) {
    throw new Error('Integration: .env.local not found. Copy .env.example and fill it in.');
  }
  process.loadEnvFile(ENV_FILE);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Integration: .env.local needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return { url, publishableKey };
}

async function ensureRunning(url: string, publishableKey: string): Promise<void> {
  try {
    const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: publishableKey } });
    if (response.ok) return;
    throw new Error(`HTTP status ${response.status}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Integration: the local Supabase did not respond at ${url} (${reason}). ${HOW_TO_START}`,
    );
  }
}

function readSecretKey(url: string): string {
  let local: { url: string; secretKey: string };
  try {
    local = readLocalSupabase();
  } catch {
    throw new Error(`Integration: \`supabase status\` failed. ${HOW_TO_START}`);
  }
  if (local.url !== url) {
    throw new Error(
      `Integration: NEXT_PUBLIC_SUPABASE_URL (${url}) differs from the local Supabase API (${local.url}).`,
    );
  }
  return local.secretKey;
}

export default async function setup(project: TestProject): Promise<void> {
  const { url, publishableKey } = loadEnv();
  await ensureRunning(url, publishableKey);
  project.provide('localSecretKey', readSecretKey(url));
}
