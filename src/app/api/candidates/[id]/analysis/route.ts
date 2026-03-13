import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const updateAnalysisSchema = z.object({
  analysis: z.unknown(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: candidateId } = await params;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const payload = updateAnalysisSchema.parse(await request.json());
    const { supabase, companyId } = await requireUserAndCompany();

    const { data, error } = await supabase
      .from('candidates')
      .update({
        interview_analysis: payload.analysis,
        last_interview_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_ANALYSIS_UPDATE_FAILED', 'Could not save analysis.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
