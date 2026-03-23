import { requireUserAndCompanyRole } from '@/server/api/auth';
import { listCompanyMembers } from '@/server/api/company-members';
import { getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { companyId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const members = await listCompanyMembers(companyId);
    return jsonSuccess(requestId, members);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
