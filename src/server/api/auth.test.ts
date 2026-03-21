import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireUserAndCompany, requireUserAndCompanyRole } from './auth';
import { ApiRouteError } from './http';

const { createSupabaseServerClientMock } = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

interface SupabaseAuthScenario {
  userId?: string;
  authError?: Error | null;
  companyId?: string | null;
  role?: string | null;
  profileError?: Error | null;
}

function createSupabaseMock(scenario: SupabaseAuthScenario) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: scenario.userId
            ? {
                id: scenario.userId,
              }
            : null,
        },
        error: scenario.authError || null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data:
              typeof scenario.companyId === 'undefined'
                ? null
                : {
                    company_id: scenario.companyId,
                    role: scenario.role ?? null,
                  },
            error: scenario.profileError || null,
          }),
        }),
      }),
    }),
  };
}

describe('requireUserAndCompany', () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
  });

  it('throws UNAUTHORIZED when session user is missing', async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseMock({
        userId: undefined,
      })
    );

    await expect(requireUserAndCompany()).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    } as Partial<ApiRouteError>);
  });

  it('throws PROFILE_MISSING when profile lookup fails', async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseMock({
        userId: 'user-1',
        profileError: new Error('profile failed'),
      })
    );

    await expect(requireUserAndCompany()).rejects.toMatchObject({
      status: 403,
      code: 'PROFILE_MISSING',
    } as Partial<ApiRouteError>);
  });

  it('throws TENANT_MISMATCH when requested company differs', async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseMock({
        userId: 'user-1',
        companyId: 'company-a',
      })
    );

    await expect(requireUserAndCompany('company-b')).rejects.toMatchObject({
      status: 403,
      code: 'TENANT_MISMATCH',
    } as Partial<ApiRouteError>);
  });

  it('returns user and company ids when tenant matches', async () => {
    const supabaseMock = createSupabaseMock({
      userId: 'user-1',
      companyId: 'company-a',
    });
    createSupabaseServerClientMock.mockResolvedValue(supabaseMock);

    const result = await requireUserAndCompany('company-a');
    expect(result.userId).toBe('user-1');
    expect(result.companyId).toBe('company-a');
    expect(result.supabase).toBe(supabaseMock);
  });
});

describe('requireUserAndCompanyRole', () => {
  beforeEach(() => {
    createSupabaseServerClientMock.mockReset();
  });

  it('throws FORBIDDEN when role is not allowed', async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseMock({
        userId: 'user-1',
        companyId: 'company-a',
        role: 'Recruiter',
      })
    );

    await expect(requireUserAndCompanyRole(['Admin', 'Developer'])).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    } as Partial<ApiRouteError>);
  });

  it('throws TENANT_MISMATCH when requested company differs', async () => {
    createSupabaseServerClientMock.mockResolvedValue(
      createSupabaseMock({
        userId: 'user-1',
        companyId: 'company-a',
        role: 'Developer',
      })
    );

    await expect(requireUserAndCompanyRole(['Developer'], 'company-b')).rejects.toMatchObject({
      status: 403,
      code: 'TENANT_MISMATCH',
    } as Partial<ApiRouteError>);
  });

  it('returns role-aware auth context when role is allowed', async () => {
    const supabaseMock = createSupabaseMock({
      userId: 'user-1',
      companyId: 'company-a',
      role: 'Developer',
    });
    createSupabaseServerClientMock.mockResolvedValue(supabaseMock);

    const result = await requireUserAndCompanyRole(['Developer'], 'company-a');
    expect(result.userId).toBe('user-1');
    expect(result.companyId).toBe('company-a');
    expect(result.role).toBe('Developer');
    expect(result.supabase).toBe(supabaseMock);
  });
});
