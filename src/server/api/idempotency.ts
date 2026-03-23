import { createHash } from 'node:crypto';

import { ApiRouteError } from '@/server/api/http';

interface IdempotencyOptions<T> {
  supabase: any;
  companyId: string;
  actorUserId: string;
  scope: string;
  idempotencyKey: string | null;
  requestBodyRaw: string;
  execute: () => Promise<T>;
  successStatus?: number;
  ttlHours?: number;
}

interface StoredIdempotencyRecord {
  request_hash: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  response_body: unknown;
}

function getExpiryIso(hours: number) {
  const expires = new Date();
  expires.setHours(expires.getHours() + hours);
  return expires.toISOString();
}

function requestHash(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

function parseIdempotencyResult(record: StoredIdempotencyRecord) {
  if (record.status === 'succeeded') {
    return record.response_body;
  }

  if (record.status === 'processing') {
    throw new ApiRouteError(409, 'IDEMPOTENCY_IN_PROGRESS', 'A matching request is still processing.');
  }

  throw new ApiRouteError(
    409,
    'IDEMPOTENCY_PREVIOUS_FAILURE',
    'A matching request previously failed. Retry with a new idempotency key.'
  );
}

export async function runIdempotent<T>(options: IdempotencyOptions<T>) {
  const key = options.idempotencyKey;
  if (key == null || key.trim() === '') {
    return options.execute();
  }

  if (key.length > 128) {
    throw new ApiRouteError(400, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency key must be 128 characters or fewer.');
  }

  const normalizedKey = key.trim();
  const hash = requestHash(options.requestBodyRaw);
  const ttlHours = options.ttlHours == null ? 24 : options.ttlHours;
  const expiresAt = getExpiryIso(ttlHours);

  const { data: existing, error: lookupError } = await options.supabase
    .from('idempotency_keys')
    .select('request_hash, status, response_body')
    .eq('company_id', options.companyId)
    .eq('actor_user_id', options.actorUserId)
    .eq('scope', options.scope)
    .eq('idempotency_key', normalizedKey)
    .maybeSingle();

  if (lookupError == null) {
    if (existing == null) {
      // continue
    } else {
      const record = existing as StoredIdempotencyRecord;
      if (record.request_hash == null || record.request_hash === hash) {
        return parseIdempotencyResult(record) as T;
      }

      throw new ApiRouteError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Idempotency key was already used for a different request payload.'
      );
    }
  } else {
    throw new ApiRouteError(500, 'IDEMPOTENCY_LOOKUP_FAILED', 'Could not evaluate idempotency key.', lookupError);
  }

  const { error: insertError } = await options.supabase
    .from('idempotency_keys')
    .insert({
      company_id: options.companyId,
      actor_user_id: options.actorUserId,
      scope: options.scope,
      idempotency_key: normalizedKey,
      request_hash: hash,
      status: 'processing',
      expires_at: expiresAt,
    });

  if (insertError == null) {
    // continue
  } else {
    throw new ApiRouteError(500, 'IDEMPOTENCY_CREATE_FAILED', 'Could not create idempotency key state.', insertError);
  }

  try {
    const result = await options.execute();
    const statusCode = options.successStatus == null ? 200 : options.successStatus;

    const { error: finalizeError } = await options.supabase
      .from('idempotency_keys')
      .update({
        status: 'succeeded',
        response_status: statusCode,
        response_body: result as unknown as Record<string, unknown>,
      })
      .eq('company_id', options.companyId)
      .eq('actor_user_id', options.actorUserId)
      .eq('scope', options.scope)
      .eq('idempotency_key', normalizedKey);

    if (finalizeError == null) {
      return result;
    }

    throw new ApiRouteError(500, 'IDEMPOTENCY_FINALIZE_FAILED', 'Could not persist idempotency result.', finalizeError);
  } catch (error) {
    const code = error instanceof ApiRouteError ? error.code : 'INTERNAL_ERROR';
    const message = error instanceof Error ? error.message : 'Unknown error';

    await options.supabase
      .from('idempotency_keys')
      .update({
        status: 'failed',
        error_code: code,
        error_message: message,
      })
      .eq('company_id', options.companyId)
      .eq('actor_user_id', options.actorUserId)
      .eq('scope', options.scope)
      .eq('idempotency_key', normalizedKey);

    throw error;
  }
}

export function readIdempotencyKey(request: Request) {
  const key = request.headers.get('x-idempotency-key');
  if (key == null) {
    return null;
  }
  return key.trim();
}
