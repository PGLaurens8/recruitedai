import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const updateInterviewSchema = z.object({
  interviewNotes: z.record(z.string(), z.string()).optional(),
  interviewScores: z.record(z.string(), z.number().int().nullable()).optional(),
  aiSummary: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: candidateId } = await params;
    if (candidateId == null || candidateId === '') {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const rawBody = await request.text();
    const updates = updateInterviewSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(updates);

    const { supabase, companyId, userId } = await requireUserAndCompany();

    const result = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'candidate:interview:update:' + candidateId,
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      execute: async () => {
        const { data, error } = await supabase
          .from('candidates')
          .update({
            interview_notes: updates.interviewNotes || {},
            interview_scores: updates.interviewScores || {},
            ai_summary: updates.aiSummary || null,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId)
          .eq('id', candidateId)
          .is('deleted_at', null)
          .select('*')
          .maybeSingle();

        if (error) {
          throw new ApiRouteError(500, 'CANDIDATE_UPDATE_FAILED', 'Could not update candidate interview.', error);
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
