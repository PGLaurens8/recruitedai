export type RuntimeMode = 'supabase' | 'mock';

interface RuntimeValidationResult {
  ok: boolean;
  mode: RuntimeMode | null;
  errors: string[];
  warnings: string[];
}

function parseRuntimeMode(value: string | undefined): RuntimeMode | null {
  const normalized = value?.toLowerCase();
  if (normalized === 'supabase' || normalized === 'mock') {
    return normalized;
  }
  return null;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeValidationResult {
  const mode = parseRuntimeMode(env.NEXT_PUBLIC_RUNTIME_MODE);
  const isProduction = env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mode) {
    if (isProduction) {
      errors.push('NEXT_PUBLIC_RUNTIME_MODE must be set to "supabase" in production.');
    } else {
      warnings.push('NEXT_PUBLIC_RUNTIME_MODE is missing or invalid; defaulting to mock mode.');
    }
  }

  if (isProduction && mode && mode !== 'supabase') {
    errors.push('NEXT_PUBLIC_RUNTIME_MODE must be "supabase" in production.');
  }

  if (mode === 'supabase') {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      if (isProduction) {
        errors.push(
          'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required when runtime mode is supabase.'
        );
      } else {
        warnings.push('Supabase runtime selected but NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are missing.');
      }
    }
  }

  return {
    ok: errors.length === 0,
    mode,
    errors,
    warnings,
  };
}

export function getSupabasePublicEnv(env: NodeJS.ProcessEnv = process.env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseServiceEnv(env: NodeJS.ProcessEnv = process.env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role environment variables are missing.');
  }

  return { supabaseUrl, serviceRoleKey };
}
