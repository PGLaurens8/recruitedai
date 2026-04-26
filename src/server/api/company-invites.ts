import { createHash, randomUUID } from 'node:crypto';

import { type Role } from '@/lib/roles';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError } from '@/server/api/http';

export interface CompanyInviteRecord {
  id: string;
  company_id: string;
  email: string;
  role: Role;
  invited_by: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyInviteCreateResult {
  invite: CompanyInviteRecord;
  acceptToken: string;
}

const inviteSelectColumns = [
  'id',
  'company_id',
  'email',
  'role',
  'invited_by',
  'status',
  'expires_at',
  'accepted_at',
  'accepted_by',
  'created_at',
  'updated_at',
].join(',');

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function buildExpiresAt(days: number) {
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + days);
  return expires.toISOString();
}

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function listCompanyInvites(companyId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('company_invites')
    .select(inviteSelectColumns)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error == null) {
    return ((data || []) as unknown) as CompanyInviteRecord[];
  }

  throw new ApiRouteError(500, 'INVITES_QUERY_FAILED', 'Could not load invites.', error);
}

export async function createCompanyInvite(
  actorUserId: string,
  companyId: string,
  email: string,
  role: Role,
  expiresInDays = 7
): Promise<CompanyInviteCreateResult> {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = normalizeEmail(email);

  const { data: existingMember, error: memberError } = await admin
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (memberError == null) {
    if (existingMember == null) {
      // continue
    } else {
      throw new ApiRouteError(400, 'INVITE_ALREADY_MEMBER', 'This user is already a company member.');
    }
  } else {
    throw new ApiRouteError(500, 'INVITE_MEMBER_CHECK_FAILED', 'Could not verify membership.', memberError);
  }

  const nowIso = new Date().toISOString();
  await admin
    .from('company_invites')
    .update({ status: 'expired', updated_at: nowIso })
    .eq('company_id', companyId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .lt('expires_at', nowIso);

  const { data: pendingInvite, error: pendingError } = await admin
    .from('company_invites')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingError == null) {
    if (pendingInvite == null) {
      // continue
    } else {
      throw new ApiRouteError(409, 'INVITE_ALREADY_PENDING', 'A pending invite already exists for this email.');
    }
  } else {
    throw new ApiRouteError(500, 'INVITE_PENDING_CHECK_FAILED', 'Could not verify existing invites.', pendingError);
  }

  const acceptToken = randomUUID();
  const tokenHash = hashInviteToken(acceptToken);

  const { data: inviteData, error: insertError } = await admin
    .from('company_invites')
    .insert({
      company_id: companyId,
      email: normalizedEmail,
      role,
      invited_by: actorUserId,
      token_hash: tokenHash,
      status: 'pending',
      expires_at: buildExpiresAt(expiresInDays),
    })
    .select(inviteSelectColumns)
    .maybeSingle();

  if (insertError) {
    throw new ApiRouteError(500, 'INVITE_CREATE_FAILED', 'Could not create invite.', insertError);
  }

  const invite = (inviteData as unknown as CompanyInviteRecord | null);
  if (invite == null) {
    throw new ApiRouteError(500, 'INVITE_CREATE_FAILED', 'Invite creation returned no record.');
  }

  await writeAuditLog(admin, {
    companyId,
    actorUserId,
    action: 'invite.created',
    targetType: 'company_invite',
    targetId: invite.id,
    metadata: {
      inviteEmail: normalizedEmail,
      inviteRole: role,
      expiresAt: invite.expires_at,
    },
  });

  return {
    invite,
    acceptToken,
  };
}

export async function revokeCompanyInvite(actorUserId: string, companyId: string, inviteId: string) {
  const admin = createSupabaseAdminClient();
  const { data: revokeData, error } = await admin
    .from('company_invites')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', inviteId)
    .eq('status', 'pending')
    .select(inviteSelectColumns)
    .maybeSingle();

  if (error) {
    throw new ApiRouteError(500, 'INVITE_REVOKE_FAILED', 'Could not revoke invite.', error);
  }

  const invite = (revokeData as unknown as CompanyInviteRecord | null);
  if (invite == null) {
    throw new ApiRouteError(404, 'INVITE_NOT_FOUND', 'Pending invite not found.');
  }

  await writeAuditLog(admin, {
    companyId,
    actorUserId,
    action: 'invite.revoked',
    targetType: 'company_invite',
    targetId: inviteId,
    metadata: {
      inviteEmail: invite.email,
      inviteRole: invite.role,
    },
  });

  return invite;
}

export async function acceptCompanyInvite(userId: string, userEmail: string, token: string) {
  const admin = createSupabaseAdminClient();
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new ApiRouteError(400, 'INVITE_TOKEN_REQUIRED', 'Invite token is required.');
  }

  const tokenHash = hashInviteToken(normalizedToken);

  const { data: inviteData, error: inviteError } = await admin
    .from('company_invites')
    .select(inviteSelectColumns)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (inviteError) {
    throw new ApiRouteError(500, 'INVITE_QUERY_FAILED', 'Could not load invite.', inviteError);
  }

  const invite = (inviteData as unknown as CompanyInviteRecord | null);
  if (invite == null) {
    throw new ApiRouteError(404, 'INVITE_NOT_FOUND', 'Invite not found.');
  }

  if (invite.status === 'pending') {
    // continue
  } else {
    throw new ApiRouteError(400, 'INVITE_NOT_PENDING', 'Invite is no longer pending.');
  }

  const nowIso = new Date().toISOString();
  if (new Date(invite.expires_at).getTime() <= new Date(nowIso).getTime()) {
    await admin
      .from('company_invites')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('id', invite.id)
      .eq('status', 'pending');

    throw new ApiRouteError(400, 'INVITE_EXPIRED', 'Invite has expired.');
  }

  if (normalizeEmail(invite.email) === normalizeEmail(userEmail)) {
    // continue
  } else {
    throw new ApiRouteError(403, 'INVITE_EMAIL_MISMATCH', 'Invite email does not match signed-in user.');
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError == null) {
    if (profile == null) {
      throw new ApiRouteError(403, 'PROFILE_MISSING', 'User profile could not be resolved.');
    }
  } else {
    throw new ApiRouteError(403, 'PROFILE_MISSING', 'User profile could not be resolved.', profileError);
  }

  const { error: profileUpdateError } = await admin
    .from('profiles')
    .update({
      company_id: invite.company_id,
      account_type: 'company',
      role: invite.role,
      updated_at: nowIso,
    })
    .eq('id', userId);

  if (profileUpdateError == null) {
    // continue
  } else {
    throw new ApiRouteError(500, 'INVITE_ACCEPT_FAILED', 'Could not update user profile for invite.', profileUpdateError);
  }

  const { error: inviteUpdateError } = await admin
    .from('company_invites')
    .update({
      status: 'accepted',
      accepted_at: nowIso,
      accepted_by: userId,
      updated_at: nowIso,
    })
    .eq('id', invite.id)
    .eq('status', 'pending');

  if (inviteUpdateError == null) {
    // continue
  } else {
    throw new ApiRouteError(500, 'INVITE_ACCEPT_FAILED', 'Could not finalize invite.', inviteUpdateError);
  }

  await writeAuditLog(admin, {
    companyId: invite.company_id,
    actorUserId: userId,
    action: 'invite.accepted',
    targetType: 'company_invite',
    targetId: invite.id,
    metadata: {
      inviteEmail: invite.email,
      inviteRole: invite.role,
    },
  });

  return {
    inviteId: invite.id as string,
    companyId: invite.company_id as string,
    role: invite.role as Role,
  };
}
