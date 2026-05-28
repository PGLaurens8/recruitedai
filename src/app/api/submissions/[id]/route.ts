import { z } from 'zod';

import { requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const SUBMISSION_STATUSES = [
  'submitted',
  'client_reviewing',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'offer_accepted',
  'placed',
  'rejected',
  'withdrew',
] as const;

const updateSubmissionSchema = z.object({
  status: z.enum(SUBMISSION_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  placementFee: z.number().nonnegative().nullable().optional(),
  placementDate: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    if (!id) {
      throw new ApiRouteError(400, 'SUBMISSION_ID_REQUIRED', 'Submission ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const { data, error } = await supabase
      .from('submissions')
      .select(
        'id,company_id,candidate_id,job_id,client_id,status,submitted_by,notes,rejection_reason,placement_fee,placement_date,created_at,updated_at,candidate:candidates(id,name,email,avatar,status,ai_score),job:jobs(id,title,salary,location,status),client:clients(id,name)'
      )
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'SUBMISSION_QUERY_FAILED', 'Could not load submission.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    if (!id) {
      throw new ApiRouteError(400, 'SUBMISSION_ID_REQUIRED', 'Submission ID is required.');
    }

    const parsed = updateSubmissionSchema.safeParse(JSON.parse((await request.text()) || '{}'));
    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid submission update payload.', parsed.error.flatten());
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);

    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.rejectionReason !== undefined) updates.rejection_reason = parsed.data.rejectionReason;
    if (parsed.data.placementFee !== undefined) updates.placement_fee = parsed.data.placementFee;
    if (parsed.data.placementDate !== undefined) updates.placement_date = parsed.data.placementDate;

    // When the status flips to 'placed' and no explicit placement_date was sent,
    // stamp it to now() so reports can roll up "placed this month" without each
    // caller having to remember to set both fields.
    if (parsed.data.status === 'placed' && parsed.data.placementDate === undefined) {
      updates.placement_date = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiRouteError(400, 'NO_UPDATES', 'No fields provided to update.');
    }

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'SUBMISSION_UPDATE_FAILED', 'Could not update submission.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'submission.updated',
      targetType: 'submission',
      targetId: id,
    });

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    if (!id) {
      throw new ApiRouteError(400, 'SUBMISSION_ID_REQUIRED', 'Submission ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);

    // A submission can only be deleted while still at the initial 'submitted'
    // stage — once it has progressed (interview booked, offer made, placed)
    // we want a permanent record. Callers should use status 'withdrew' instead.
    const { data: existing, error: fetchError } = await supabase
      .from('submissions')
      .select('id,status')
      .eq('company_id', companyId)
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new ApiRouteError(500, 'SUBMISSION_LOOKUP_FAILED', 'Could not load submission.', fetchError);
    }
    if (!existing) {
      throw new ApiRouteError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }
    if (existing.status !== 'submitted') {
      throw new ApiRouteError(
        409,
        'SUBMISSION_LOCKED',
        'Submission has progressed past the initial stage. Use status "withdrew" to mark it inactive instead.',
      );
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('company_id', companyId)
      .eq('id', id);

    if (error) {
      throw new ApiRouteError(500, 'SUBMISSION_DELETE_FAILED', 'Could not delete submission.', error);
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'submission.deleted',
      targetType: 'submission',
      targetId: id,
    });

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
