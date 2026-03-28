import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireUserAndCompanyRoleMock } = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

import { POST as postCandidateRestore } from './candidates/[id]/restore/route';
import { POST as postClientRestore } from './clients/[id]/restore/route';
import { POST as postJobRestore } from './jobs/[id]/restore/route';

type EntityTable = 'candidates' | 'jobs' | 'clients';

interface RestoreMockOptions {
  entityTable: EntityTable;
  shouldFindDeletedRecord?: boolean;
}

function createSupabaseRestoreMock(options: RestoreMockOptions) {
  const { entityTable, shouldFindDeletedRecord = true } = options;

  let updateCalls = 0;
  const auditInserts: Array<Record<string, unknown>> = [];

  class EntityBuilder {
    private filters: Record<string, string> = {};

    update() {
      updateCalls += 1;
      return this;
    }

    eq(column: string, value: string) {
      this.filters[column] = value;
      return this;
    }

    not() {
      return this;
    }

    select() {
      return this;
    }

    maybeSingle() {
      if (!shouldFindDeletedRecord) {
        return Promise.resolve({ data: null, error: null });
      }

      return Promise.resolve({
        data: { id: this.filters.id || 'entity-1' },
        error: null,
      });
    }
  }

  return {
    from(table: string) {
      if (table === entityTable) {
        return new EntityBuilder();
      }

      if (table === 'audit_logs') {
        return {
          insert(payload: Record<string, unknown>) {
            auditInserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    getUpdateCalls() {
      return updateCalls;
    },
    getAuditInserts() {
      return auditInserts;
    },
  };
}

function restoreRequest(url: string) {
  return new Request(url, { method: 'POST' });
}

const cases = [
  {
    name: 'candidate',
    entityTable: 'candidates' as const,
    route: postCandidateRestore,
    url: 'http://localhost/api/candidates/cand-1/restore',
    id: 'cand-1',
    expectedAction: 'candidate.restored',
    expectedTargetType: 'candidate',
    expectedMissingCode: 'CANDIDATE_NOT_FOUND',
  },
  {
    name: 'job',
    entityTable: 'jobs' as const,
    route: postJobRestore,
    url: 'http://localhost/api/jobs/job-1/restore',
    id: 'job-1',
    expectedAction: 'job.restored',
    expectedTargetType: 'job',
    expectedMissingCode: 'JOB_NOT_FOUND',
  },
  {
    name: 'client',
    entityTable: 'clients' as const,
    route: postClientRestore,
    url: 'http://localhost/api/clients/client-1/restore',
    id: 'client-1',
    expectedAction: 'client.restored',
    expectedTargetType: 'client',
    expectedMissingCode: 'CLIENT_NOT_FOUND',
  },
];

describe('restore route flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(cases)('restores $name and writes audit log entry', async (testCase) => {
    const supabase = createSupabaseRestoreMock({
      entityTable: testCase.entityTable,
      shouldFindDeletedRecord: true,
    });

    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const response = await testCase.route(restoreRequest(testCase.url), {
      params: Promise.resolve({ id: testCase.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ restored: true });
    expect(supabase.getUpdateCalls()).toBe(1);
    expect(supabase.getAuditInserts()).toHaveLength(1);
    expect(supabase.getAuditInserts()[0]).toMatchObject({
      company_id: 'company-1',
      actor_user_id: 'user-1',
      action: testCase.expectedAction,
      target_type: testCase.expectedTargetType,
      target_id: testCase.id,
      metadata: {},
    });
  });

  it.each(cases)('returns 404 for missing deleted $name and skips audit log', async (testCase) => {
    const supabase = createSupabaseRestoreMock({
      entityTable: testCase.entityTable,
      shouldFindDeletedRecord: false,
    });

    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase,
      companyId: 'company-1',
      userId: 'user-1',
    });

    const response = await testCase.route(restoreRequest(testCase.url), {
      params: Promise.resolve({ id: testCase.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe(testCase.expectedMissingCode);
    expect(supabase.getUpdateCalls()).toBe(1);
    expect(supabase.getAuditInserts()).toHaveLength(0);
  });
});
