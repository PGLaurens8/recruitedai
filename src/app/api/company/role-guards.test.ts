import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRouteError } from '@/server/api/http';

const {
  requireUserAndCompanyRoleMock,
  listCompanyMembersMock,
  createCompanyInviteMock,
  listCompanyInvitesMock,
  revokeCompanyInviteMock,
  updateCompanyMemberRoleMock,
} = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
  listCompanyMembersMock: vi.fn(),
  createCompanyInviteMock: vi.fn(),
  listCompanyInvitesMock: vi.fn(),
  revokeCompanyInviteMock: vi.fn(),
  updateCompanyMemberRoleMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

vi.mock('@/server/api/company-members', () => ({
  ASSIGNABLE_ROLES: ['Admin', 'Recruiter', 'Sales', 'Candidate', 'Developer'],
  listCompanyMembers: listCompanyMembersMock,
  removeCompanyMember: vi.fn(),
  updateCompanyMemberRole: updateCompanyMemberRoleMock,
}));

vi.mock('@/server/api/company-invites', () => ({
  createCompanyInvite: createCompanyInviteMock,
  listCompanyInvites: listCompanyInvitesMock,
  revokeCompanyInvite: revokeCompanyInviteMock,
  acceptCompanyInvite: vi.fn(),
}));

import { GET as getMembers } from './members/route';
import { GET as getInvites, POST as postInvites } from './invites/route';
import { DELETE as deleteInvite } from './invites/[inviteId]/route';
import { PATCH as patchMemberRole } from './members/[memberId]/route';

function forbiddenError() {
  return new ApiRouteError(403, 'FORBIDDEN', 'Role not allowed.');
}

describe('company route role guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserAndCompanyRoleMock.mockRejectedValue(forbiddenError());
  });

  it('returns 403 for members GET when role is not allowed', async () => {
    const response = await getMembers(new Request('http://localhost/api/company/members'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(listCompanyMembersMock).not.toHaveBeenCalled();
  });

  it('returns 403 for invites GET when role is not allowed', async () => {
    const response = await getInvites(new Request('http://localhost/api/company/invites'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(listCompanyInvitesMock).not.toHaveBeenCalled();
  });

  it('returns 403 for invites POST when role is not allowed', async () => {
    const response = await postInvites(
      new Request('http://localhost/api/company/invites', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'new.user@example.com',
          role: 'Recruiter',
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(createCompanyInviteMock).not.toHaveBeenCalled();
  });

  it('returns 403 for invite DELETE when role is not allowed', async () => {
    const response = await deleteInvite(new Request('http://localhost/api/company/invites/invite-1', { method: 'DELETE' }), {
      params: Promise.resolve({ inviteId: 'invite-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(revokeCompanyInviteMock).not.toHaveBeenCalled();
  });

  it('returns 403 for member PATCH when role is not allowed', async () => {
    const response = await patchMemberRole(
      new Request('http://localhost/api/company/members/member-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ role: 'Sales' }),
      }),
      {
        params: Promise.resolve({ memberId: 'member-1' }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(updateCompanyMemberRoleMock).not.toHaveBeenCalled();
  });
});
