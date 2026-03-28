import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireUserAndCompanyRoleMock,
  enforceRateLimitMock,
} = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

vi.mock('@/server/api/rate-limit', () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

import { PATCH as patchCompanyCandidate } from './[companyId]/candidates/[id]/route';

interface IdempotencyRow {
  company_id: string;
  actor_user_id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  response_body?: unknown;
}

function idempotencyComposite(row: Pick<IdempotencyRow, 'company_id' | 'actor_user_id' | 'scope' | 'idempotency_key'>) {
  return [row.company_id, row.actor_user_id, row.scope, row.idempotency_key].join(':');
}

function createSupabaseRouteMock() {
  const idempotencyRows = new Map<string, IdempotencyRow>();
  let candidateUpdateCalls = 0;
  let auditInsertCalls = 0;

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

  class CandidateBuilder {
    update() {
      return this;
    }

    eq() {
      return this;
    }

    is() {
      return this;
    }

    select() {
      return this;
    }

    maybeSingle() {
      candidateUpdateCalls += 1;
      return Promise.resolve({ data: { id: 'cand-1' }, error: null });
    }
  }

  return {
    from(table: string) {
      if (table === 'idempotency_keys') {
        return new IdempotencyBuilder();
      }
      if (table === 'candidates') {
        return new CandidateBuilder();
      }
      if (table === 'audit_logs') {
        return {
          insert() {
            auditInsertCalls += 1;
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error('Unexpected table: ' + table);
    },
    getCandidateUpdateCalls() {
      return candidateUpdateCalls;
    },
    getAuditInsertCalls() {
      return auditInsertCalls;
    },
  };
}

function patchRequest(url: string, payload: unknown, key: string) {
  return new Request(url, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-idempotency-key': key,
    },
    body: JSON.stringify(payload),
  });
}

describe('company candidate route idempotency replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it('replays company candidate patch without duplicate update or audit entry', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const context = { params: Promise.resolve({ companyId: 'company-1', id: 'cand-1' }) };
    const payload = { interviewScores: { q1: 4 }, aiSummary: 'strong' };

    const r1 = await patchCompanyCandidate(
      patchRequest('http://localhost/api/companies/company-1/candidates/cand-1', payload, 'cc-k1'),
      context
    );
    const r2 = await patchCompanyCandidate(
      patchRequest('http://localhost/api/companies/company-1/candidates/cand-1', payload, 'cc-k1'),
      context
    );

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(b2.data.id).toBe('cand-1');
    expect(supabase.getCandidateUpdateCalls()).toBe(1);
    expect(supabase.getAuditInsertCalls()).toBe(1);
  });

  it('returns 409 when company candidate key is reused for different payload', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const context = { params: Promise.resolve({ companyId: 'company-1', id: 'cand-1' }) };

    await patchCompanyCandidate(
      patchRequest(
        'http://localhost/api/companies/company-1/candidates/cand-1',
        { interviewScores: { q1: 4 }, aiSummary: 'A' },
        'cc-k2'
      ),
      context
    );

    const replay = await patchCompanyCandidate(
      patchRequest(
        'http://localhost/api/companies/company-1/candidates/cand-1',
        { interviewScores: { q1: 5 }, aiSummary: 'B' },
        'cc-k2'
      ),
      context
    );
    const body = await replay.json();

    expect(replay.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});
