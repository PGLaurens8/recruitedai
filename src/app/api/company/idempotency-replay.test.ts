import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireUserAndCompanyMock,
  requireUserAndCompanyRoleMock,
  createCompanyInviteMock,
} = vi.hoisted(() => ({
  requireUserAndCompanyMock: vi.fn(),
  requireUserAndCompanyRoleMock: vi.fn(),
  createCompanyInviteMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompany: requireUserAndCompanyMock,
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

vi.mock('@/server/api/company-invites', () => ({
  createCompanyInvite: createCompanyInviteMock,
  listCompanyInvites: vi.fn(),
}));

import { PATCH as patchCompany } from './route';
import { POST as postInvite } from './invites/route';

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
  let companyUpdateCalls = 0;
  let auditInsertCalls = 0;

  const companyRow = {
    id: 'company-1',
    name: 'Acme',
    logo: null,
    website: null,
    email: null,
    address: null,
  } as Record<string, unknown>;

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

  class CompaniesBuilder {
    private updatePayload: Record<string, unknown> | null = null;

    update(payload: Record<string, unknown>) {
      this.updatePayload = payload;
      return this;
    }

    eq() {
      return this;
    }

    select() {
      return this;
    }

    maybeSingle() {
      companyUpdateCalls += 1;
      const merged = { ...companyRow, ...(this.updatePayload || {}) };
      return Promise.resolve({ data: merged, error: null });
    }
  }

  return {
    from(table: string) {
      if (table === 'idempotency_keys') {
        return new IdempotencyBuilder();
      }
      if (table === 'companies') {
        return new CompaniesBuilder();
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
    getCompanyUpdateCalls() {
      return companyUpdateCalls;
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

describe('company route idempotency replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replays company settings patch without second update or second audit log', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const payload = {
      name: 'Acme Updated',
      logo: 'https://cdn/logo.png',
      website: 'https://acme.dev',
      email: 'team@acme.dev',
      address: 'Main Street',
    };

    const r1 = await patchCompany(patchRequest('http://localhost/api/company', payload, 'company-k1'));
    const r2 = await patchCompany(patchRequest('http://localhost/api/company', payload, 'company-k1'));

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(supabase.getCompanyUpdateCalls()).toBe(1);
    expect(supabase.getAuditInsertCalls()).toBe(1);
  });

  it('returns 409 when company patch key is reused for different payload', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    await patchCompany(
      patchRequest(
        'http://localhost/api/company',
        { name: 'Acme A', logo: '', website: '', email: 'a@acme.dev', address: '' },
        'company-k2'
      )
    );

    const replay = await patchCompany(
      patchRequest(
        'http://localhost/api/company',
        { name: 'Acme B', logo: '', website: '', email: 'b@acme.dev', address: '' },
        'company-k2'
      )
    );
    const body = await replay.json();

    expect(replay.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('replays invite create without duplicate invite service call', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
      role: 'Admin',
    });

    createCompanyInviteMock.mockResolvedValue({
      id: 'invite-1',
      token: 'token-1',
      email: 'hire@acme.dev',
      role: 'Recruiter',
      status: 'pending',
    });

    const payload = { email: 'hire@acme.dev', role: 'Recruiter', expiresInDays: 7 };

    const r1 = await postInvite(postRequest('http://localhost/api/company/invites', payload, 'invite-k1'));
    const r2 = await postInvite(postRequest('http://localhost/api/company/invites', payload, 'invite-k1'));

    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(b1.ok).toBe(true);
    expect(b2.ok).toBe(true);
    expect(createCompanyInviteMock).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when invite key is reused for different payload', async () => {
    const supabase = createSupabaseRouteMock();
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
      role: 'Admin',
    });

    createCompanyInviteMock.mockResolvedValue({
      id: 'invite-2',
      token: 'token-2',
      email: 'ops@acme.dev',
      role: 'Recruiter',
      status: 'pending',
    });

    await postInvite(
      postRequest('http://localhost/api/company/invites', { email: 'ops@acme.dev', role: 'Recruiter' }, 'invite-k2')
    );

    const replay = await postInvite(
      postRequest('http://localhost/api/company/invites', { email: 'ops@acme.dev', role: 'Sales' }, 'invite-k2')
    );
    const body = await replay.json();

    expect(replay.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});
