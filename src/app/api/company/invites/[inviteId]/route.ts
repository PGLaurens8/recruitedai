import { requireUserAndCompanyRole } from '@/server/api/auth';
import { revokeCompanyInvite } from '@/server/api/company-invites';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    inviteId: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { inviteId } = await params;
    if (inviteId == null || inviteId === '') {
      throw new ApiRouteError(400, 'INVITE_ID_REQUIRED', 'Invite id is required.');
    }

    const { companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const invite = await revokeCompanyInvite(userId, companyId, inviteId);

    return jsonSuccess(requestId, invite);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
