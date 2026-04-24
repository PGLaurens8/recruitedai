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

export function validateRuntimeConfig(): RuntimeValidationResult {
  // Use direct literals for NEXT_PUBLIC vars to ensure Next.js static replacement
  const modeVal = process.env.NEXT_PUBLIC_RUNTIME_MODE;
  const nodeEnv = process.env.NODE_ENV;
  
  const mode = parseRuntimeMode(modeVal);
  const isProduction = nodeEnv === 'production';
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
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

export function getSupabasePublicEnv(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  // Prioritize direct literal access for client-side static replacement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(`Missing Supabase public env vars: ${missing.join(', ')}`);
  }

  return { 
    supabaseUrl, 
    supabaseAnonKey 
  };
}

export function getSupabasePublicEnvError(): string | null {
  try {
    getSupabasePublicEnv();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Supabase environment variables are missing.';
  }
}

export function hasSupabasePublicEnv(): boolean {
  return getSupabasePublicEnvError() == null;
}

export function getSupabaseServiceEnv(): {
  supabaseUrl: string;
  serviceRoleKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing Supabase server env vars: ${missing.join(', ')}`);
  }

  return { 
    supabaseUrl, 
    serviceRoleKey 
  };
}
