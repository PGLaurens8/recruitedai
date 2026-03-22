import { validateRuntimeConfig, type RuntimeMode } from '@/lib/runtime-config';

export function getRuntimeMode(): RuntimeMode {
  const { mode } = validateRuntimeConfig();
  if (mode) {
    return mode;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'supabase';
  }

  return 'mock';
}

export function isSupabaseMode() {
  return getRuntimeMode() === 'supabase';
}

export function isMockMode() {
  return getRuntimeMode() === 'mock';
}
