import { describe, expect, it } from 'vitest';

import { validateRuntimeConfig } from './runtime-config';

describe('runtime-config', () => {
  it('rejects production when runtime mode is not set', () => {
    const result = validateRuntimeConfig({
      NODE_ENV: 'production',
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('NEXT_PUBLIC_RUNTIME_MODE');
  });

  it('rejects production mock mode', () => {
    const result = validateRuntimeConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_RUNTIME_MODE: 'mock',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('supabase');
  });

  it('rejects production supabase mode without required env vars', () => {
    const result = validateRuntimeConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_RUNTIME_MODE: 'supabase',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('accepts production supabase mode with required env vars', () => {
    const result = validateRuntimeConfig({
      NODE_ENV: 'production',
      NEXT_PUBLIC_RUNTIME_MODE: 'supabase',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('allows missing mode in development with warning', () => {
    const result = validateRuntimeConfig({
      NODE_ENV: 'development',
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
