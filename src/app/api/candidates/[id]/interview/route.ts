import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: {
    id: string;
  };
}

const updateInterviewSchema = z.object({
  interviewNotes: z.record(z.string(), z.string()).optional(),
  interviewScores: z.record(z.string(), z.number().int().nullable()).optional(),
  aiSummary: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const candidateId = params.id;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const updates = updateInterviewSchema.parse(await request.json());
    const { supabase, companyId } = await requireUserAndCompany();

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
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_UPDATE_FAILED', 'Could not update candidate interview.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
