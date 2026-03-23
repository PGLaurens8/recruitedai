import { requireUserAndCompany } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: candidateId } = await params;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('candidates')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_RESTORE_FAILED', 'Could not restore candidate.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found in deleted records.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'candidate.restored',
      targetType: 'candidate',
      targetId: candidateId,
    });

    return jsonSuccess(requestId, { restored: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
