import { requireUserAndCompany } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: jobId } = await params;
    if (!jobId) {
      throw new ApiRouteError(400, 'JOB_ID_REQUIRED', 'Job ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('jobs')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', jobId)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'JOB_RESTORE_FAILED', 'Could not restore job.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'JOB_NOT_FOUND', 'Job not found in deleted records.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'job.restored',
      targetType: 'job',
      targetId: jobId,
    });

    return jsonSuccess(requestId, { restored: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
