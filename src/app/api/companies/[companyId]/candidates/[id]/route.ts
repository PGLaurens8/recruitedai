import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const candidatePatchSchema = z.object({
  interviewNotes: z.record(z.string(), z.string()).optional(),
  interviewScores: z.record(z.string(), z.number().nullable()).optional(),
  aiSummary: z.string().optional().nullable(),
  interviewAnalysis: z.unknown().optional(),
  lastInterviewAt: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string; id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId, id } = await context.params;
    const { supabase } = await requireUserAndCompany(companyId);
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_QUERY_FAILED', error.message);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string; id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId, id } = await context.params;
    const body = await request.json();
    const parsed = candidatePatchSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate update payload.', parsed.error.flatten());
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.interviewNotes) {
      updatePayload.interview_notes = parsed.data.interviewNotes;
    }
    if (parsed.data.interviewScores) {
      updatePayload.interview_scores = parsed.data.interviewScores;
    }
    if (typeof parsed.data.aiSummary !== 'undefined') {
      updatePayload.ai_summary = parsed.data.aiSummary;
    }
    if (typeof parsed.data.interviewAnalysis !== 'undefined') {
      updatePayload.interview_analysis = parsed.data.interviewAnalysis;
    }
    if (parsed.data.lastInterviewAt) {
      updatePayload.last_interview_at = parsed.data.lastInterviewAt;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiRouteError(400, 'NO_UPDATES', 'No candidate updates were provided.');
    }

    const { supabase, userId } = await requireUserAndCompany(companyId);
await enforceRateLimit(request, {
      scope: 'write:candidate-update',
      subject: userId,
      limit: 80,
      windowMs: 60_000,
    });

    const { error } = await supabase
      .from('candidates')
      .update(updatePayload)
      .eq('company_id', companyId)
      .eq('id', id);

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_UPDATE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { id });
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ companyId: string; id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId, id } = await context.params;
    const { supabase } = await requireUserAndCompany(companyId);
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_DELETE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { id });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
