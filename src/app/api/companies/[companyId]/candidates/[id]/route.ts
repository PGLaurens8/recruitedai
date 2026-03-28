import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';
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
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_QUERY_FAILED', error.message);
    }
    if (data == null) {
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
    const rawBody = await request.text();
    const body = JSON.parse(rawBody || '{}');
    const parsed = candidatePatchSchema.safeParse(body);

    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate update payload.', parsed.error.flatten());
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.interviewNotes) {
      updatePayload.interview_notes = parsed.data.interviewNotes;
    }
    if (parsed.data.interviewScores) {
      updatePayload.interview_scores = parsed.data.interviewScores;
    }
    if (typeof parsed.data.aiSummary === 'undefined') {
      // no-op
    } else {
      updatePayload.ai_summary = parsed.data.aiSummary;
    }
    if (typeof parsed.data.interviewAnalysis === 'undefined') {
      // no-op
    } else {
      updatePayload.interview_analysis = parsed.data.interviewAnalysis;
    }
    if (parsed.data.lastInterviewAt) {
      updatePayload.last_interview_at = parsed.data.lastInterviewAt;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiRouteError(400, 'NO_UPDATES', 'No candidate updates were provided.');
    }

    const canonicalBody = JSON.stringify(parsed.data);
    const { supabase, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer'], companyId);
    await enforceRateLimit(request, {
      scope: 'write:candidate-update',
      subject: userId,
      limit: 80,
      windowMs: 60_000,
    });

    const result = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'candidate:update:' + id,
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      execute: async () => {
        const { data, error } = await supabase
          .from('candidates')
          .update(updatePayload)
          .eq('company_id', companyId)
          .eq('id', id)
          .is('deleted_at', null)
          .select('id')
          .maybeSingle();

        if (error) {
          throw new ApiRouteError(500, 'CANDIDATE_UPDATE_FAILED', error.message);
        }
        if (data == null) {
          throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
        }

        await writeAuditLog(supabase, {
          companyId,
          actorUserId: userId,
          action: 'candidate.updated',
          targetType: 'candidate',
          targetId: id,
          metadata: {
            changedFields: Object.keys(updatePayload),
          },
        });

        return { id };
      },
    });

    return jsonSuccess(requestId, result);
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
    const { supabase, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer'], companyId);
    const { data, error } = await supabase
      .from('candidates')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_DELETE_FAILED', error.message);
    }
    if (data == null) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'candidate.soft_deleted',
      targetType: 'candidate',
      targetId: id,
    });

    return jsonSuccess(requestId, { id });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
