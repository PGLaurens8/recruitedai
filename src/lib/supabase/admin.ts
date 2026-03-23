import { createClient } from '@supabase/supabase-js';

import { getSupabaseServiceEnv } from '@/lib/runtime-config';

export function createSupabaseAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseServiceEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
