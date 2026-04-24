import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabasePublicEnv } from '@/lib/runtime-config';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const config = getSupabasePublicEnv();

  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieItems: { name: string; value: string; options: CookieOptions }[]) {
        cookieItems.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
