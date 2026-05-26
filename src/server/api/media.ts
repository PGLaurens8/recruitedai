import { ApiRouteError } from '@/server/api/http';

// Gemini (via the Genkit google-genai plugin) only resolves `{{media url=...}}`
// from a Base64 data URI or from its own Files API URIs. It will NOT fetch an
// arbitrary external URL such as a Supabase Storage signed URL — that request
// fails server-side and surfaces as a 500. To keep both transports working we
// fetch any http(s) URL here and inline it as a data URI before the flow runs.

// Cap aligned with the 5MB UI limit and Gemini's ~20MB inline-request ceiling:
// Base64 inflates by ~33%, so 10MB raw → ~13.3MB encoded, comfortably under 20MB.
const MAX_REMOTE_FILE_BYTES = 10_000_000;

// Fail a stalled storage download fast rather than burning the whole serverless
// function budget on it (leaving no time for the Gemini calls that follow).
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Resolves a media reference (resume, job spec, etc.) into a Base64 data URI
 * that Gemini can read.
 *
 * - `data:` URIs are returned unchanged (backward-compatible fallback path).
 * - `http(s)` URLs (e.g. Supabase Storage signed URLs) are fetched and inlined.
 */
export async function resolveMedia(reference: string): Promise<string> {
  if (reference.startsWith('data:')) {
    return reference;
  }

  if (!reference.startsWith('http://') && !reference.startsWith('https://')) {
    throw new ApiRouteError(
      400,
      'VALIDATION_ERROR',
      'Media reference must be a Base64 data URI or an http(s) URL.'
    );
  }

  let response: Response;
  try {
    response = await fetch(reference, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    throw new ApiRouteError(
      timedOut ? 504 : 502,
      'MEDIA_FETCH_FAILED',
      timedOut
        ? `Timed out downloading the stored resume file after ${FETCH_TIMEOUT_MS}ms.`
        : 'Could not download the stored resume file for processing.',
      { reason: cause instanceof Error ? cause.message : String(cause) }
    );
  }

  if (!response.ok) {
    throw new ApiRouteError(
      502,
      'MEDIA_FETCH_FAILED',
      `Could not download the stored resume file (status ${response.status}).`,
      { status: response.status }
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new ApiRouteError(502, 'MEDIA_FETCH_FAILED', 'The stored resume file was empty.');
  }
  if (arrayBuffer.byteLength > MAX_REMOTE_FILE_BYTES) {
    throw new ApiRouteError(413, 'MEDIA_TOO_LARGE', 'The stored resume file is too large to process.');
  }

  const contentType =
    response.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return `data:${contentType};base64,${base64}`;
}

/**
 * Convenience wrapper for optional media fields: resolves the reference when
 * present, otherwise returns it unchanged (undefined/empty pass through).
 */
export async function resolveOptionalMedia<T extends string | undefined>(
  reference: T
): Promise<T> {
  if (!reference) {
    return reference;
  }
  return (await resolveMedia(reference)) as T;
}
