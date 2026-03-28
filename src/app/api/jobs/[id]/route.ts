import { requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: jobId } = await params;
    if (!jobId) {
      throw new ApiRouteError(400, 'JOB_ID_REQUIRED', 'Job ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const { data, error } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', jobId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'JOB_DELETE_FAILED', 'Could not delete job.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'JOB_NOT_FOUND', 'Job not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'job.soft_deleted',
      targetType: 'job',
      targetId: jobId,
    });

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
