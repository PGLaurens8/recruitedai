import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { type Role } from '@/lib/roles';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError } from '@/server/api/http';

export const ASSIGNABLE_ROLES = ['Admin', 'Recruiter', 'Sales', 'Candidate', 'Developer'] as const;

export interface CompanyMemberRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  company_id: string;
  account_type: 'personal' | 'company';
}

async function requireCompanyOwnerId(companyId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('companies')
    .select('owner_id')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    throw new ApiRouteError(500, 'COMPANY_QUERY_FAILED', 'Could not load company ownership.', error);
  }

  if (!data?.owner_id) {
    throw new ApiRouteError(404, 'COMPANY_NOT_FOUND', 'Company not found.');
  }

  return data.owner_id as string;
}

export async function listCompanyMembers(companyId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, name, role, company_id, account_type')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new ApiRouteError(500, 'MEMBERS_QUERY_FAILED', 'Could not load company members.', error);
  }

  return (data || []) as CompanyMemberRecord[];
}

export async function updateCompanyMemberRole(
  actorId: string,
  companyId: string,
  memberId: string,
  nextRole: Role
) {
  const admin = createSupabaseAdminClient();
  const ownerId = await requireCompanyOwnerId(companyId);

  const { data: target, error: memberError } = await admin
    .from('profiles')
    .select('id, email, name, role, company_id, account_type')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError) {
    throw new ApiRouteError(500, 'MEMBER_QUERY_FAILED', 'Could not load target member.', memberError);
  }

  if (!target || target.company_id !== companyId) {
    throw new ApiRouteError(404, 'MEMBER_NOT_FOUND', 'Member not found in your company.');
  }

  if (ownerId === memberId && nextRole !== 'Admin') {
    throw new ApiRouteError(400, 'OWNER_ROLE_LOCKED', 'Company owner must remain Admin.');
  }

  const currentRole = target.role as Role;
  if (currentRole === nextRole) {
    return target as CompanyMemberRecord;
  }

  if (currentRole === 'Admin' && nextRole !== 'Admin') {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('role', 'Admin');

    if (countError) {
      throw new ApiRouteError(500, 'ADMIN_COUNT_FAILED', 'Could not verify admin count.', countError);
    }

    if ((count || 0) <= 1) {
      throw new ApiRouteError(400, 'LAST_ADMIN_REQUIRED', 'Company must keep at least one Admin.');
    }
  }

  if (actorId === memberId && nextRole !== 'Admin') {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('role', 'Admin');

    if (countError) {
      throw new ApiRouteError(500, 'ADMIN_COUNT_FAILED', 'Could not verify admin count.', countError);
    }

    if ((count || 0) <= 1) {
      throw new ApiRouteError(400, 'SELF_DEMOTE_FORBIDDEN', 'You cannot demote yourself as the last Admin.');
    }
  }

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({ role: nextRole, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select('id, email, name, role, company_id, account_type')
    .maybeSingle();

  if (updateError) {
    throw new ApiRouteError(500, 'MEMBER_ROLE_UPDATE_FAILED', 'Could not update member role.', updateError);
  }

  if (!updated) {
    throw new ApiRouteError(404, 'MEMBER_NOT_FOUND', 'Member not found in your company.');
  }

  await writeAuditLog(admin, {
    companyId,
    actorUserId: actorId,
    action: 'member.role_changed',
    targetType: 'profile',
    targetId: memberId,
    metadata: {
      previousRole: currentRole,
      nextRole,
    },
  });

  return updated as CompanyMemberRecord;
}

export async function removeCompanyMember(actorId: string, companyId: string, memberId: string) {
  if (!memberId) {
    throw new ApiRouteError(400, 'MEMBER_ID_REQUIRED', 'Member id is required.');
  }

  if (memberId === actorId) {
    throw new ApiRouteError(400, 'SELF_REMOVE_FORBIDDEN', 'You cannot remove yourself from the company.');
  }

  const admin = createSupabaseAdminClient();
  const ownerId = await requireCompanyOwnerId(companyId);

  if (ownerId === memberId) {
    throw new ApiRouteError(400, 'OWNER_REMOVE_FORBIDDEN', 'Company owner cannot be removed.');
  }

  const { data: target, error: memberError } = await admin
    .from('profiles')
    .select('id, email, name, role, company_id, account_type')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError) {
    throw new ApiRouteError(500, 'MEMBER_QUERY_FAILED', 'Could not load target member.', memberError);
  }

  if (!target || target.company_id !== companyId) {
    throw new ApiRouteError(404, 'MEMBER_NOT_FOUND', 'Member not found in your company.');
  }

  const personalWorkspaceName = `${target.name || target.email}'s Workspace`;
  const { data: personalCompany, error: companyInsertError } = await admin
    .from('companies')
    .insert({
      name: personalWorkspaceName,
      is_personal: true,
      owner_id: memberId,
    })
    .select('id')
    .maybeSingle();

  if (companyInsertError || !personalCompany?.id) {
    throw new ApiRouteError(
      500,
      'PERSONAL_WORKSPACE_CREATE_FAILED',
      'Could not create personal workspace for removed member.',
      companyInsertError
    );
  }

  const { error: profileUpdateError } = await admin
    .from('profiles')
    .update({
      company_id: personalCompany.id,
      account_type: 'personal',
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (profileUpdateError) {
    await admin.from('companies').delete().eq('id', personalCompany.id);
    throw new ApiRouteError(
      500,
      'MEMBER_REMOVE_FAILED',
      'Could not move member to personal workspace.',
      profileUpdateError
    );
  }

  await writeAuditLog(admin, {
    companyId,
    actorUserId: actorId,
    action: 'member.removed',
    targetType: 'profile',
    targetId: memberId,
    metadata: {
      previousCompanyId: companyId,
      personalCompanyId: personalCompany.id,
      previousRole: target.role,
    },
  });

  return {
    memberId,
    personalCompanyId: personalCompany.id as string,
  };
}
