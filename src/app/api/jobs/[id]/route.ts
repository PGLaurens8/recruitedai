import { requireUserAndCompany } from '@/server/api/auth';
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

    const { supabase, companyId } = await requireUserAndCompany();
    const { error } = await supabase.from('jobs').delete().eq('company_id', companyId).eq('id', jobId);

    if (error) {
      throw new ApiRouteError(500, 'JOB_DELETE_FAILED', 'Could not delete job.', error);
    }

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
