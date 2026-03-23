import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRouteError } from '@/server/api/http';
import { removeCompanyMember, updateCompanyMemberRole } from './company-members';

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
  account_type: 'personal' | 'company';
}

interface AdminClientScenario {
  ownerId?: string;
  profilesById?: Record<string, ProfileRow | null>;
  adminCount?: number;
  insertedCompanyId?: string;
  profileUpdateError?: Error | null;
}

const { createSupabaseAdminClientMock } = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

function createAdminClientMock(scenario: AdminClientScenario) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'companies') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, companyId: string) => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: scenario.ownerId ? { owner_id: scenario.ownerId, id: companyId } : null,
                error: null,
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: scenario.insertedCompanyId || 'personal-company-1' },
                error: null,
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: vi.fn((_columns: string, options?: { count?: 'exact'; head?: boolean }) => {
            if (options?.head) {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn().mockResolvedValue({
                    count: scenario.adminCount ?? 1,
                    error: null,
                  }),
                })),
              };
            }

            return {
              eq: vi.fn((_column: string, value: string) => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: scenario.profilesById?.[value] || null,
                  error: null,
                }),
              })),
            };
          }),
          update: vi.fn((changes: Record<string, unknown>) => ({
            eq: vi.fn((_column: string, id: string) => {
              const currentProfile = scenario.profilesById?.[id];
              const mergedProfile = currentProfile
                ? {
                    ...currentProfile,
                    ...(changes as Partial<ProfileRow>),
                  }
                : null;

              const awaitedResult = { error: scenario.profileUpdateError || null };

              return {
                select: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: mergedProfile,
                    error: null,
                  }),
                })),
                then: (resolve: (value: typeof awaitedResult) => unknown) =>
                  Promise.resolve(resolve(awaitedResult)),
              };
            }),
          })),
        };
      }

      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('company-members', () => {
  beforeEach(() => {
    createSupabaseAdminClientMock.mockReset();
  });

  it('denies role update when target member is outside the actor tenant', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        ownerId: 'owner-1',
        profilesById: {
          'member-1': {
            id: 'member-1',
            email: 'member@example.com',
            name: 'Member One',
            role: 'Recruiter',
            company_id: 'company-other',
            account_type: 'company',
          },
        },
      })
    );

    await expect(
      updateCompanyMemberRole('admin-1', 'company-a', 'member-1', 'Sales')
    ).rejects.toMatchObject({
      status: 404,
      code: 'MEMBER_NOT_FOUND',
    } as Partial<ApiRouteError>);
  });

  it('blocks demotion when the target is the last admin', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        ownerId: 'owner-1',
        adminCount: 1,
        profilesById: {
          'admin-2': {
            id: 'admin-2',
            email: 'admin2@example.com',
            name: 'Admin Two',
            role: 'Admin',
            company_id: 'company-a',
            account_type: 'company',
          },
        },
      })
    );

    await expect(
      updateCompanyMemberRole('admin-1', 'company-a', 'admin-2', 'Recruiter')
    ).rejects.toMatchObject({
      status: 400,
      code: 'LAST_ADMIN_REQUIRED',
    } as Partial<ApiRouteError>);
  });

  it('removes a member by migrating them to a new personal workspace', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        ownerId: 'owner-1',
        insertedCompanyId: 'personal-company-9',
        profilesById: {
          'member-9': {
            id: 'member-9',
            email: 'member9@example.com',
            name: 'Member Nine',
            role: 'Recruiter',
            company_id: 'company-a',
            account_type: 'company',
          },
        },
      })
    );

    const result = await removeCompanyMember('admin-1', 'company-a', 'member-9');

    expect(result).toEqual({
      memberId: 'member-9',
      personalCompanyId: 'personal-company-9',
    });
  });
});

describe('company-members additional guardrails', () => {
  beforeEach(() => {
    createSupabaseAdminClientMock.mockReset();
  });

  it('blocks owner demotion away from Admin', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        ownerId: 'owner-1',
        profilesById: {
          'owner-1': {
            id: 'owner-1',
            email: 'owner@example.com',
            name: 'Owner One',
            role: 'Admin',
            company_id: 'company-a',
            account_type: 'company',
          },
        },
      })
    );

    await expect(
      updateCompanyMemberRole('admin-1', 'company-a', 'owner-1', 'Recruiter')
    ).rejects.toMatchObject({
      status: 400,
      code: 'OWNER_ROLE_LOCKED',
    } as Partial<ApiRouteError>);
  });

  it('blocks self-remove before any data-layer mutation', async () => {
    await expect(removeCompanyMember('member-9', 'company-a', 'member-9')).rejects.toMatchObject({
      status: 400,
      code: 'SELF_REMOVE_FORBIDDEN',
    } as Partial<ApiRouteError>);

    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
