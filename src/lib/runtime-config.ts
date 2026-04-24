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
  // Use literals for NEXT_PUBLIC vars to ensure Next.js static replacement in browser bundles
  const modeVal = env === process.env ? process.env.NEXT_PUBLIC_RUNTIME_MODE : env.NEXT_PUBLIC_RUNTIME_MODE;
  const nodeEnv = env === process.env ? process.env.NODE_ENV : env.NODE_ENV;
  
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
    const url = env === process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env === process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
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

export function getSupabasePublicEnv(env: NodeJS.ProcessEnv = process.env): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  // Prioritize literal access for client-side static replacement
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fallback to argument for non-standard environments or tests
  if (env !== process.env) {
    supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  const missing: string[] = [];
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing Supabase public env vars: ${missing.join(', ')}`);
  }

  return { 
    supabaseUrl: supabaseUrl!, 
    supabaseAnonKey: supabaseAnonKey! 
  };
}

export function getSupabasePublicEnvError(env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    getSupabasePublicEnv(env);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Supabase environment variables are missing.';
  }
}

export function hasSupabasePublicEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSupabasePublicEnvError(env) == null;
}

export function getSupabaseServiceEnv(env: NodeJS.ProcessEnv = process.env): {
  supabaseUrl: string;
  serviceRoleKey: string;
} {
  const supabaseUrl = env === process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env === process.env ? process.env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing Supabase server env vars: ${missing.join(', ')}`);
  }

  return { 
    supabaseUrl: supabaseUrl!, 
    serviceRoleKey: serviceRoleKey! 
  };
}
