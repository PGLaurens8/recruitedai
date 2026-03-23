import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRouteError } from '@/server/api/http';
import { acceptCompanyInvite, createCompanyInvite } from './company-invites';

interface InviteRow {
  id: string;
  company_id: string;
  email: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
}

interface Scenario {
  existingMember?: { id: string } | null;
  pendingInvite?: { id: string } | null;
  inviteByToken?: InviteRow | null;
  profileById?: { id: string } | null;
  insertInviteId?: string;
  insertError?: Error | null;
  profileUpdateError?: Error | null;
  inviteUpdateError?: Error | null;
}

const { createSupabaseAdminClientMock } = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

function createAdminClientMock(scenario: Scenario) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: scenario.existingMember || null,
                  error: null,
                }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({
                data: scenario.profileById || null,
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: scenario.profileUpdateError || null,
            }),
          })),
        };
      }

      if (table === 'company_invites') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              eq: vi.fn((_column2: string, value2: string) => ({
                lt: vi.fn().mockResolvedValue({ error: null }),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: value2 === 'pending' ? scenario.pendingInvite || null : scenario.inviteByToken || null,
                  error: null,
                }),
              })),
              maybeSingle: vi.fn().mockResolvedValue({
                data: scenario.inviteByToken || null,
                error: null,
              }),
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: scenario.pendingInvite || null,
                  error: null,
                }),
              })),
              maybeSingle: vi.fn().mockResolvedValue({
                data: scenario.inviteByToken || null,
                error: null,
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: scenario.insertError
                  ? null
                  : {
                      id: scenario.insertInviteId || 'invite-1',
                      company_id: 'company-1',
                      email: 'new@example.com',
                      role: 'Recruiter',
                      token: 'token-1',
                      status: 'pending',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                    },
                error: scenario.insertError || null,
              }),
            })),
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

describe('company-invites', () => {
  beforeEach(() => {
    createSupabaseAdminClientMock.mockReset();
  });

  it('blocks invite creation when email already belongs to a member', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        existingMember: { id: 'member-1' },
      })
    );

    await expect(
      createCompanyInvite('actor-1', 'company-1', 'member@example.com', 'Recruiter')
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVITE_ALREADY_MEMBER',
    } as Partial<ApiRouteError>);
  });

  it('rejects invite accept when signed-in email does not match invite email', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        inviteByToken: {
          id: 'invite-9',
          company_id: 'company-1',
          email: 'invitee@example.com',
          role: 'Recruiter',
          token: 'token-9',
          status: 'pending',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
      })
    );

    await expect(
      acceptCompanyInvite('user-9', 'other@example.com', 'token-9')
    ).rejects.toMatchObject({
      status: 403,
      code: 'INVITE_EMAIL_MISMATCH',
    } as Partial<ApiRouteError>);
  });

  it('accepts invite and returns target company and role', async () => {
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        inviteByToken: {
          id: 'invite-2',
          company_id: 'company-2',
          email: 'person@example.com',
          role: 'Sales',
          token: 'token-2',
          status: 'pending',
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        profileById: { id: 'user-2' },
      })
    );

    const result = await acceptCompanyInvite('user-2', 'person@example.com', 'token-2');

    expect(result.companyId).toBe('company-2');
    expect(result.role).toBe('Sales');
  });
});

describe('company-invites additional guardrails', () => {
  beforeEach(() => {
    createSupabaseAdminClientMock.mockReset();
  });

  it('rejects invite accept when invite is expired and marks it expired', async () => {
    const now = Date.now();
    createSupabaseAdminClientMock.mockReturnValue(
      createAdminClientMock({
        inviteByToken: {
          id: 'invite-expired',
          company_id: 'company-1',
          email: 'invitee@example.com',
          role: 'Recruiter',
          token: 'token-expired',
          status: 'pending',
          expires_at: new Date(now - 60000).toISOString(),
        },
      })
    );

    await expect(
      acceptCompanyInvite('user-7', 'invitee@example.com', 'token-expired')
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVITE_EXPIRED',
    } as Partial<ApiRouteError>);
  });
});
