// Centralises client-side handling of the 402 / TRIAL_LIMIT_REACHED envelope
// returned by enforceTrialQuota in src/server/api/rate-limit.ts. Both
// src/lib/api-client.ts and src/lib/data/hooks.ts call dispatchTrialLimit
// before re-throwing, and <TrialLimitListener /> (mounted once in
// ClientLayout) consumes the event to show the toast.

const TRIAL_LIMIT_EVENT = 'recruitedai:trial-limit-reached';

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
