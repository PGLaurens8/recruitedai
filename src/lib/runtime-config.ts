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

/**
 * Validates the runtime configuration using strict literal references.
 * In Next.js, NEXT_PUBLIC_ variables must be accessed as full literals 
 * (e.g., process.env.NEXT_PUBLIC_VAR) for reliable static replacement in the browser.
 */
export function validateRuntimeConfig(): RuntimeValidationResult {
  const mode = parseRuntimeMode(process.env.NEXT_PUBLIC_RUNTIME_MODE);
  const isProduction = process.env.NODE_ENV === 'production';
  
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mode) {
    if (isProduction) {
      errors.push('NEXT_PUBLIC_RUNTIME_MODE is not set. It must be "supabase" in production.');
    } else {
      warnings.push('NEXT_PUBLIC_RUNTIME_MODE is missing; defaulting to mock mode for local dev.');
    }
  }

  if (isProduction && mode && mode !== 'supabase') {
    errors.push('NEXT_PUBLIC_RUNTIME_MODE must be "supabase" in production environments.');
  }

  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (mode === 'supabase' || (isProduction && !mode)) {
    if (!hasUrl || !hasKey) {
      const missing = [];
      if (!hasUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!hasKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      
      const errorMessage = `Missing Supabase variables: ${missing.join(', ')}.`;
      
      if (isProduction) {
        errors.push(errorMessage + " These must be set in Vercel followed by a REDEPLOY.");
      } else {
        warnings.push(errorMessage);
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
  // Use direct literals for Next.js static replacement
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `Supabase environment variables are missing (${missing.join(', ')}). ` +
      `Ensure they are set in your provider (e.g. Vercel) and that you have triggered a NEW DEPLOYMENT after saving them.`
    );
  }

  return { 
    supabaseUrl: url, 
    supabaseAnonKey: key 
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing Supabase server env vars: ${missing.join(', ')}`);
  }

  return { 
    supabaseUrl: url, 
    serviceRoleKey: key 
  };
}
