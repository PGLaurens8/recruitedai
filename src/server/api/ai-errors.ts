import { ApiRouteError } from '@/server/api/http';

/**
 * Graceful degradation for AI provider (Google Gemini) outages.
 *
 * When Gemini is unavailable, overloaded, or rate-limiting us, the raw error
 * bubbles up as an opaque 500. `isProviderError` recognises those provider-side
 * failures so routes can convert them into a clean 503 AI_PROVIDER_UNAVAILABLE
 * envelope (via `withProviderErrorGuard`) that the client can handle and retry —
 * instead of surfacing a broken-app 500.
 */

export const AI_PROVIDER_UNAVAILABLE_CODE = 'AI_PROVIDER_UNAVAILABLE';
export const AI_PROVIDER_UNAVAILABLE_STATUS = 503;
export const AI_PROVIDER_RETRY_AFTER_SECONDS = 60;

// Walk error.cause one level deep so we also inspect wrapped errors (e.g. the
// parse-cv route wraps flow failures in an ApiRouteError whose message carries
// the underlying Gemini text, and Genkit can wrap fetch errors in a cause).
function collectMessages(error: unknown): string {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause && error.cause !== error) {
      parts.push(collectMessages(error.cause));
    }
  } else if (typeof error === 'string') {
    parts.push(error);
  }
  return parts.join(' ');
}

function extractName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: unknown }).name ?? '');
  }
  return '';
}

function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as Record<string, unknown>;
  for (const key of ['status', 'statusCode']) {
    const value = e[key];
    if (typeof value === 'number') return value;
  }
  const response = e.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === 'number') return response.status;
  // Recurse into cause for wrapped provider errors.
  if (e.cause && e.cause !== error) return extractStatus(e.cause);
  return undefined;
}

/**
 * True when the error originates from the Gemini/Google AI provider being
 * unavailable, overloaded, timing out, or exhausting quota — as opposed to a
 * validation error or other app-level failure.
 */
export function isProviderError(error: unknown): boolean {
  if (!error) return false;

  const message = collectMessages(error);
  const name = extractName(error);
  const status = extractStatus(error);

  if (/UNAVAILABLE|Service Unavailable/i.test(message)) return true;
  if (/quota|RESOURCE_EXHAUSTED/i.test(message)) return true;
  if (/DEADLINE_EXCEEDED/i.test(message)) return true;
  if (status === 503 || status === 429) return true;
  if (name.includes('GoogleGenerativeAI') && typeof status === 'number' && status >= 500) return true;

  return false;
}

/**
 * Run an AI flow, converting any provider-side failure into a 503
 * AI_PROVIDER_UNAVAILABLE so the client gets a clean, retryable error. Non
 * provider errors (validation, app bugs) are rethrown unchanged.
 */
export async function withProviderErrorGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isProviderError(error)) {
      throw new ApiRouteError(
        AI_PROVIDER_UNAVAILABLE_STATUS,
        AI_PROVIDER_UNAVAILABLE_CODE,
        'AI features are temporarily unavailable. Please try again in a few minutes.',
        { provider: 'google-gemini', retryAfterSeconds: AI_PROVIDER_RETRY_AFTER_SECONDS }
      );
    }
    throw error;
  }
}
