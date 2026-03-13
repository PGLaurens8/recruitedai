import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const candidateId = params.id;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_QUERY_FAILED', 'Could not load candidate.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const candidateId = params.id;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompany();
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('company_id', companyId)
      .eq('id', candidateId);

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_DELETE_FAILED', 'Could not delete candidate.', error);
    }

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
