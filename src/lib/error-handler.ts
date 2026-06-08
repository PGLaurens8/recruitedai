// Centralises client-side handling of the 402 / TRIAL_LIMIT_REACHED envelope
// returned by enforceTrialQuota in src/server/api/rate-limit.ts. Both
// src/lib/api-client.ts and src/lib/data/hooks.ts call dispatchTrialLimit
// before re-throwing, and <TrialLimitListener /> (mounted once in
// ClientLayout) consumes the event to show the toast.

export const AI_PROVIDER_UNAVAILABLE_CODE = 'AI_PROVIDER_UNAVAILABLE';

// Error thrown by the fetch helpers (src/lib/api-client.ts) that preserves the
// API envelope's error code and HTTP status, so page-level code can react to a
// specific failure (e.g. show an inline retry card for an AI provider outage)
// rather than parsing the message string.
export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// True when an error (or envelope) represents a 503 AI provider outage.
export function isProviderUnavailableResponse(status: number, code?: string) {
  return status === 503 || code === AI_PROVIDER_UNAVAILABLE_CODE;
}

export function isProviderUnavailableError(error: unknown): boolean {
  return error instanceof ApiError && isProviderUnavailableResponse(error.status, error.code);
}

const TRIAL_LIMIT_EVENT = 'recruitedai:trial-limit-reached';
const PROVIDER_OUTAGE_EVENT = 'recruitedai:ai-provider-unavailable';

export interface ProviderOutageDetail {
  message?: string;
  retryAfterSeconds?: number;
}

export function dispatchProviderOutage(detail: ProviderOutageDetail) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent<ProviderOutageDetail>(PROVIDER_OUTAGE_EVENT, { detail }));
}

export function subscribeProviderOutage(listener: (detail: ProviderOutageDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ProviderOutageDetail>;
    listener(custom.detail ?? {});
  };
  window.addEventListener(PROVIDER_OUTAGE_EVENT, handler);
  return () => window.removeEventListener(PROVIDER_OUTAGE_EVENT, handler);
}

export interface TrialLimitDetail {
  feature?: string;
  plan?: string;
  limit?: number;
  current?: number;
  message?: string;
}

export function dispatchTrialLimit(detail: TrialLimitDetail) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent<TrialLimitDetail>(TRIAL_LIMIT_EVENT, { detail }));
}

export function subscribeTrialLimit(listener: (detail: TrialLimitDetail) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = (event: Event) => {
    const custom = event as CustomEvent<TrialLimitDetail>;
    listener(custom.detail ?? {});
  };
  window.addEventListener(TRIAL_LIMIT_EVENT, handler);
  return () => window.removeEventListener(TRIAL_LIMIT_EVENT, handler);
}

// Returns true when an API envelope represents a hit trial limit so callers
// (api-client, requestApi) can dispatch the event before re-throwing.
export function isTrialLimitResponse(status: number, code?: string) {
  return status === 402 || code === 'TRIAL_LIMIT_REACHED';
}
