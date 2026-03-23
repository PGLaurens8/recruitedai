import { describe, expect, it } from 'vitest';

import { ApiRouteError } from '@/server/api/http';
import { runIdempotent } from './idempotency';

type IdempotencyStatus = 'processing' | 'succeeded' | 'failed';

interface Row {
  company_id: string;
  actor_user_id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string | null;
  status: IdempotencyStatus;
  response_body?: unknown;
  response_status?: number;
  error_code?: string;
  error_message?: string;
}

function keyFor(row: Pick<Row, 'company_id' | 'actor_user_id' | 'scope' | 'idempotency_key'>) {
  return [row.company_id, row.actor_user_id, row.scope, row.idempotency_key].join(':');
}

function createSupabaseMock(seedRows: Row[] = []) {
  const rows = new Map<string, Row>();
  for (const row of seedRows) {
    rows.set(keyFor(row), row);
  }

  class Builder {
    private mode: 'select' | 'insert' | 'update' | null = null;
    private filters: Record<string, string> = {};
    private updatePayload: Partial<Row> | null = null;

    select() {
      this.mode = 'select';
      return this;
    }

    insert(payload: Row) {
      this.mode = 'insert';
      if (payload == null) {
        return Promise.resolve({ error: new Error('missing payload') });
      }

      const composite = keyFor(payload);
      if (rows.has(composite)) {
        return Promise.resolve({ error: null });
      }

      rows.set(composite, payload);
      return Promise.resolve({ error: null });
    }

    update(payload: Partial<Row>) {
      this.mode = 'update';
      this.updatePayload = payload;
      return this;
    }

    eq(column: string, value: string) {
      this.filters[column] = value;
      return this;
    }

    maybeSingle() {
      const composite = keyFor({
        company_id: this.filters.company_id,
        actor_user_id: this.filters.actor_user_id,
        scope: this.filters.scope,
        idempotency_key: this.filters.idempotency_key,
      });
      const row = rows.get(composite) || null;
      return Promise.resolve({ data: row, error: null });
    }

    then(resolve: (value: { error: Error | null }) => unknown) {
      if (this.mode === 'update') {
        const composite = keyFor({
          company_id: this.filters.company_id,
          actor_user_id: this.filters.actor_user_id,
          scope: this.filters.scope,
          idempotency_key: this.filters.idempotency_key,
        });
        const existing = rows.get(composite);
        if (existing == null) {
          return Promise.resolve(resolve({ error: null }));
        }

        const merged = { ...existing, ...(this.updatePayload || {}) };
        rows.set(composite, merged as Row);
        return Promise.resolve(resolve({ error: null }));
      }

      return Promise.resolve(resolve({ error: null }));
    }
  }

  return {
    from(table: string) {
      if (table === 'idempotency_keys') {
        return new Builder();
      }
      throw new Error('unexpected table');
    },
    dump() {
      return rows;
    },
  };
}

describe('runIdempotent', () => {
  it('runs execute directly when key is missing', async () => {
    const supabase = createSupabaseMock();
    let calls = 0;

    const result = await runIdempotent({
      supabase,
      companyId: 'company-1',
      actorUserId: 'user-1',
      scope: 'candidate:create',
      idempotencyKey: null,
      requestBodyRaw: '{"name":"A"}',
      execute: async () => {
        calls += 1;
        return { id: 'cand-1' };
      },
    });

    expect(result).toEqual({ id: 'cand-1' });
    expect(calls).toBe(1);
    expect(supabase.dump().size).toBe(0);
  });

  it('returns cached success result and does not execute twice', async () => {
    const supabase = createSupabaseMock();
    let calls = 0;

    const first = await runIdempotent({
      supabase,
      companyId: 'company-1',
      actorUserId: 'user-1',
      scope: 'job:create',
      idempotencyKey: 'abc-1',
      requestBodyRaw: '{"title":"A"}',
      successStatus: 201,
      execute: async () => {
        calls += 1;
        return { id: 'job-1' };
      },
    });

    const second = await runIdempotent({
      supabase,
      companyId: 'company-1',
      actorUserId: 'user-1',
      scope: 'job:create',
      idempotencyKey: 'abc-1',
      requestBodyRaw: '{"title":"A"}',
      successStatus: 201,
      execute: async () => {
        calls += 1;
        return { id: 'job-2' };
      },
    });

    expect(first).toEqual({ id: 'job-1' });
    expect(second).toEqual({ id: 'job-1' });
    expect(calls).toBe(1);
  });

  it('rejects when a key is reused for different payload', async () => {
    const supabase = createSupabaseMock();

    await runIdempotent({
      supabase,
      companyId: 'company-1',
      actorUserId: 'user-1',
      scope: 'client:create',
      idempotencyKey: 'dup-key',
      requestBodyRaw: '{"name":"One"}',
      execute: async () => ({ id: 'client-1' }),
    });

    await expect(
      runIdempotent({
        supabase,
        companyId: 'company-1',
        actorUserId: 'user-1',
        scope: 'client:create',
        idempotencyKey: 'dup-key',
        requestBodyRaw: '{"name":"Two"}',
        execute: async () => ({ id: 'client-2' }),
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
    } as Partial<ApiRouteError>);
  });

  it('returns conflict when previous matching request is still processing', async () => {
    const supabase = createSupabaseMock([
      {
        company_id: 'company-1',
        actor_user_id: 'user-1',
        scope: 'candidate:update:cand-1',
        idempotency_key: 'hold-key',
        request_hash: null,
        status: 'processing',
      },
    ]);

    await expect(
      runIdempotent({
        supabase,
        companyId: 'company-1',
        actorUserId: 'user-1',
        scope: 'candidate:update:cand-1',
        idempotencyKey: 'hold-key',
        requestBodyRaw: '{"status":"Interviewing"}',
        execute: async () => ({ id: 'cand-1' }),
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'IDEMPOTENCY_IN_PROGRESS',
    } as Partial<ApiRouteError>);
  });
});
