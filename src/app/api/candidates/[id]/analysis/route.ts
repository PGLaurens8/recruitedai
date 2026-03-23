import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

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
    if (candidateId == null || candidateId === '') {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const rawBody = await request.text();
    const payload = updateAnalysisSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    const { supabase, companyId, userId } = await requireUserAndCompany();

    const result = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'candidate:analysis:update:' + candidateId,
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      execute: async () => {
        const { data, error } = await supabase
          .from('candidates')
          .update({
            interview_analysis: payload.analysis,
            last_interview_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId)
          .eq('id', candidateId)
          .is('deleted_at', null)
          .select('*')
          .maybeSingle();

        if (error) {
          throw new ApiRouteError(500, 'CANDIDATE_ANALYSIS_UPDATE_FAILED', 'Could not save analysis.', error);
        }
        if (data == null) {
          throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
        }

        return data;
      },
    });

    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
