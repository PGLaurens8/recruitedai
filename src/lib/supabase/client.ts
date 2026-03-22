'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicEnv } from '@/lib/runtime-config';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();

    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
