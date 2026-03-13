const allowedModes = ['supabase', 'mock'] as const;

export type RuntimeMode = (typeof allowedModes)[number];

function isRuntimeMode(value: string): value is RuntimeMode {
  return allowedModes.includes(value as RuntimeMode);
}

export function getRuntimeMode(): RuntimeMode {
  const rawMode = process.env.NEXT_PUBLIC_RUNTIME_MODE?.toLowerCase();

  if (rawMode && isRuntimeMode(rawMode)) {
    return rawMode;
  }

  return 'mock';
}

export function isSupabaseMode() {
  return getRuntimeMode() === 'supabase';
}

export function isMockMode() {
  return getRuntimeMode() === 'mock';
}
