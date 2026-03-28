import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireUserAndCompanyRoleMock } = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

import { POST as postCandidates } from './candidates/route';
import { POST as postClients } from './clients/route';
import { POST as postJobs } from './jobs/route';

interface IdempotencyRow {
  company_id: string;
  actor_user_id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  response_body?: unknown;
  response_status?: number;
}

type EntityTable = 'candidates' | 'jobs' | 'clients';

function idempotencyComposite(row: Pick<IdempotencyRow, 'company_id' | 'actor_user_id' | 'scope' | 'idempotency_key'>) {
  return [row.company_id, row.actor_user_id, row.scope, row.idempotency_key].join(':');
}

function createSupabaseRouteMock(
  entityTable: EntityTable,
  options?: { simulateInsertConflictOnce?: { row: IdempotencyRow } }
) {
  const idempotencyRows = new Map<string, IdempotencyRow>();
  let createCalls = 0;

  class IdempotencyBuilder {
    private mode: 'select' | 'insert' | 'update' | null = null;
    private filters: Record<string, string> = {};
    private updatePayload: Partial<IdempotencyRow> | null = null;

    select() {
      this.mode = 'select';
      return this;
    }

    insert(payload: IdempotencyRow) {
      this.mode = 'insert';
      const key = idempotencyComposite(payload);
      if (idempotencyRows.has(key)) {
        return Promise.resolve({ error: null });
      }
      if (options?.simulateInsertConflictOnce?.row) {
        idempotencyRows.set(key, options.simulateInsertConflictOnce.row);
        options = { ...options, simulateInsertConflictOnce: undefined };
        return Promise.resolve({ error: { code: '23505' } });
      }
      idempotencyRows.set(key, payload);
      return Promise.resolve({ error: null });
    }

    update(payload: Partial<IdempotencyRow>) {
      this.mode = 'update';
      this.updatePayload = payload;
      return this;
    }

    eq(column: string, value: string) {
      this.filters[column] = value;
      return this;
    }

    maybeSingle() {
      const key = idempotencyComposite({
        company_id: this.filters.company_id,
        actor_user_id: this.filters.actor_user_id,
        scope: this.filters.scope,
        idempotency_key: this.filters.idempotency_key,
      });
      const row = idempotencyRows.get(key) || null;
      return Promise.resolve({ data: row, error: null });
    }

    then(resolve: (value: { error: null }) => unknown) {
      if (this.mode === 'update') {
        const key = idempotencyComposite({
          company_id: this.filters.company_id,
          actor_user_id: this.filters.actor_user_id,
          scope: this.filters.scope,
          idempotency_key: this.filters.idempotency_key,
        });
        const current = idempotencyRows.get(key);
        if (current) {
          idempotencyRows.set(key, {
            ...current,
            ...(this.updatePayload || {}),
          });
        }
      }

      return Promise.resolve(resolve({ error: null }));
    }
  }

  class EntityBuilder {
    private payload: Record<string, unknown> | null = null;

    insert(payload: Record<string, unknown>) {
      this.payload = payload;
      return this;
    }

    select() {
      return this;
    }

    single() {
      createCalls += 1;
      return Promise.resolve({
        data: {
          id: `${entityTable}-1`,
          ...(this.payload || {}),
        },
        error: null,
      });
    }
  }

  return {
    from(table: string) {
      if (table === 'idempotency_keys') {
        return new IdempotencyBuilder();
      }

      if (table === entityTable) {
        return new EntityBuilder();
      }

      throw new Error('Unexpected table: ' + table);
    },
    getCreateCalls() {
      return createCalls;
    },
  };
}

function postRequest(url: string, payload: unknown, key: string) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': key,
    },
    body: JSON.stringify(payload),
  });
}

const cases = [
  {
    name: 'candidate create',
    entityTable: 'candidates' as const,
    route: postCandidates,
    url: 'http://localhost/api/candidates',
    stablePayload: { name: 'Ada Lovelace', status: 'Applied' },
    alternatePayload: { name: 'Ada Lovelace', status: 'Hired' },
  },
  {
    name: 'job create',
    entityTable: 'jobs' as const,
    route: postJobs,
    url: 'http://localhost/api/jobs',
    stablePayload: { title: 'Backend Engineer', status: 'active' },
    alternatePayload: { title: 'Backend Engineer II', status: 'active' },
  },
  {
    name: 'client create',
    entityTable: 'clients' as const,
    route: postClients,
    url: 'http://localhost/api/clients',
    stablePayload: { name: 'Acme Corp', status: 'active' },
    alternatePayload: { name: 'Acme Corp Intl', status: 'active' },
  },
];

describe('create route idempotency replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)('replays $name without duplicate insert', async (testCase) => {
    const supabase = createSupabaseRouteMock(testCase.entityTable);
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const r1 = await testCase.route(postRequest(testCase.url, testCase.stablePayload, 'key-1'));
    const r2 = await testCase.route(postRequest(testCase.url, testCase.stablePayload, 'key-1'));

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(supabase.getCreateCalls()).toBe(1);
  });

  it.each(cases)('returns 409 when $name key is reused with different payload', async (testCase) => {
    const supabase = createSupabaseRouteMock(testCase.entityTable);
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    await testCase.route(postRequest(testCase.url, testCase.stablePayload, 'key-2'));
    const replay = await testCase.route(postRequest(testCase.url, testCase.alternatePayload, 'key-2'));
    const body = await replay.json();

    expect(replay.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(supabase.getCreateCalls()).toBe(1);
  });

  it.each(cases)('replays $name when insert loses a unique-key race', async (testCase) => {
    const scopeByTable: Record<EntityTable, string> = {
      candidates: 'candidate:create',
      jobs: 'job:create',
      clients: 'client:create',
    };

    const supabase = createSupabaseRouteMock(testCase.entityTable, {
      simulateInsertConflictOnce: {
        row: {
          company_id: 'company-1',
          actor_user_id: 'user-1',
          scope: scopeByTable[testCase.entityTable],
          idempotency_key: 'race-k1',
          request_hash: null,
          status: 'succeeded',
          response_body: { id: testCase.entityTable + '-raced' },
        },
      },
    });

    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const replay = await testCase.route(postRequest(testCase.url, testCase.stablePayload, 'race-k1'));
    const body = await replay.json();

    expect(replay.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe(testCase.entityTable + '-raced');
    expect(supabase.getCreateCalls()).toBe(0);
  });
});
