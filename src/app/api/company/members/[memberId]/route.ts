import { z } from 'zod';

import { type Role } from '@/lib/roles';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ASSIGNABLE_ROLES, removeCompanyMember, updateCompanyMemberRole } from '@/server/api/company-members';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    memberId: string;
  }>;
}

const updateMemberRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { memberId } = await params;
    if (!memberId) {
      throw new ApiRouteError(400, 'MEMBER_ID_REQUIRED', 'Member id is required.');
    }

    const payload = updateMemberRoleSchema.parse(await request.json());
    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const updated = await updateCompanyMemberRole(userId, companyId, memberId, payload.role as Role);

    return jsonSuccess(requestId, updated);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { memberId } = await params;
    if (!memberId) {
      throw new ApiRouteError(400, 'MEMBER_ID_REQUIRED', 'Member id is required.');
    }

    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const result = await removeCompanyMember(userId, companyId, memberId);

    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
