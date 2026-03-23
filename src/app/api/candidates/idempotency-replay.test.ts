import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireUserAndCompanyMock } = vi.hoisted(() => ({
  requireUserAndCompanyMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompany: requireUserAndCompanyMock,
}));

import { PATCH as patchAnalysis } from './[id]/analysis/route';
import { PATCH as patchInterview } from './[id]/interview/route';

type CandidateRow = Record<string, unknown>;
interface IdempotencyRow {
  company_id: string;
  actor_user_id: string;
  scope: string;
  idempotency_key: string;
  request_hash: string | null;
  status: 'processing' | 'succeeded' | 'failed';
  response_body?: unknown;
  response_status?: number;
  error_code?: string;
  error_message?: string;
}

function idempotencyComposite(row: Pick<IdempotencyRow, 'company_id' | 'actor_user_id' | 'scope' | 'idempotency_key'>) {
  return [row.company_id, row.actor_user_id, row.scope, row.idempotency_key].join(':');
}

function createSupabaseRouteMock() {
  const idempotencyRows = new Map<string, IdempotencyRow>();
  const candidateRows = new Map<string, CandidateRow>();
  candidateRows.set('cand-1', {
    id: 'cand-1',
    company_id: 'company-1',
    interview_analysis: null,
    interview_notes: {},
    interview_scores: {},
    ai_summary: null,
    deleted_at: null,
  });

  let candidateUpdateCalls = 0;

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
    private filters: Record<string, string> = {};
    private updatePayload: Record<string, unknown> | null = null;

    update(payload: Record<string, unknown>) {
      this.updatePayload = payload;
      return this;
    }

    eq(column: string, value: string) {
      this.filters[column] = value;
      return this;
    }

    is(column: string, value: unknown) {
      if (column === 'deleted_at' && value === null) {
        return this;
      }
      return this;
    }

    select() {
      return this;
    }

    maybeSingle() {
      candidateUpdateCalls += 1;
      const id = this.filters.id;
      const row = candidateRows.get(id);
      if (row == null) {
        return Promise.resolve({ data: null, error: null });
      }
      const merged = {
        ...row,
        ...(this.updatePayload || {}),
      };
      candidateRows.set(id, merged);
      return Promise.resolve({ data: merged, error: null });
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
      throw new Error('Unexpected table: ' + table);
    },
    getCandidateUpdateCalls() {
      return candidateUpdateCalls;
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

describe('candidate route idempotency replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replays analysis patch without second candidate update', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const context = { params: Promise.resolve({ id: 'cand-1' }) };
    const payload = { analysis: { score: 88 } };

    const r1 = await patchAnalysis(patchRequest('http://localhost/api/candidates/cand-1/analysis', payload, 'k1'), context);
    const r2 = await patchAnalysis(patchRequest('http://localhost/api/candidates/cand-1/analysis', payload, 'k1'), context);

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(b2.data.interview_analysis).toEqual({ score: 88 });
    expect(supabase.getCandidateUpdateCalls()).toBe(1);
  });

  it('replays interview patch without second candidate update', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const context = { params: Promise.resolve({ id: 'cand-1' }) };
    const payload = {
      interviewNotes: { q1: 'Solid answer' },
      interviewScores: { q1: 4 },
      aiSummary: 'Strong fit',
    };

    const r1 = await patchInterview(patchRequest('http://localhost/api/candidates/cand-1/interview', payload, 'k2'), context);
    const r2 = await patchInterview(patchRequest('http://localhost/api/candidates/cand-1/interview', payload, 'k2'), context);

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(b2.data.ai_summary).toBe('Strong fit');
    expect(supabase.getCandidateUpdateCalls()).toBe(1);
  });

  it('returns 409 when idempotency key is reused with different interview payload', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const context = { params: Promise.resolve({ id: 'cand-1' }) };

    await patchInterview(
      patchRequest(
        'http://localhost/api/candidates/cand-1/interview',
        { interviewNotes: { q1: 'A' } },
        'k3'
      ),
      context
    );

    const replay = await patchInterview(
      patchRequest(
        'http://localhost/api/candidates/cand-1/interview',
        { interviewNotes: { q1: 'B' } },
        'k3'
      ),
      context
    );
    const body = await replay.json();

    expect(replay.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});
