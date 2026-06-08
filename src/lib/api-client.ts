import {
  ApiError,
  dispatchProviderOutage,
  dispatchTrialLimit,
  isProviderUnavailableResponse,
  isTrialLimitResponse,
} from '@/lib/error-handler';

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (response.ok === false || body?.ok !== true) {
    const code = body?.error?.code;
    const message = body?.error?.message || `Request failed: ${response.status}`;
    if (isTrialLimitResponse(response.status, code)) {
      const details = body?.error?.details as Record<string, unknown> | undefined;
      dispatchTrialLimit({
        feature: details?.feature as string | undefined,
        plan: details?.plan as string | undefined,
        limit: details?.limit as number | undefined,
        current: details?.current as number | undefined,
        message,
      });
    } else if (isProviderUnavailableResponse(response.status, code)) {
      const details = body?.error?.details as Record<string, unknown> | undefined;
      dispatchProviderOutage({
        message,
        retryAfterSeconds: details?.retryAfterSeconds as number | undefined,
      });
    }
    // Throw a typed error so page-level code can branch on the error code
    // (e.g. show an inline retry card) without parsing the message string.
    throw new ApiError(message, response.status, code);
  }

  return body.data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
  });
  return parseEnvelope<T>(response);
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseEnvelope<T>(response);
}
