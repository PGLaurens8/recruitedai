import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// Inline-editable candidate fields: pipeline status (from the candidate list)
// and contact details (from the candidate detail page). All optional; nullable
// so a blank field clears the column.
const updateCandidateSchema = z.object({
  status: z
    .enum(['Sourced', 'Applied', 'Interviewing', 'Offer', 'Hired', 'Rejected'])
    .optional(),
  phone: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  noticePeriod: z.string().nullable().optional(),
  salaryExpectation: z.string().nullable().optional(),
  availabilityDate: z.string().nullable().optional(),
  workAuthorization: z.string().nullable().optional(),
});

// Maps camelCase payload keys to their snake_case columns.
const CONTACT_FIELD_COLUMNS: Record<string, string> = {
  phone: 'phone',
  linkedinUrl: 'linkedin_url',
  location: 'location',
  noticePeriod: 'notice_period',
  salaryExpectation: 'salary_expectation',
  availabilityDate: 'availability_date',
  workAuthorization: 'work_authorization',
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: candidateId } = await params;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const parsed = updateCandidateSchema.safeParse(JSON.parse((await request.text()) || '{}'));
    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate update payload.', parsed.error.flatten());
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
    }
    for (const [key, column] of Object.entries(CONTACT_FIELD_COLUMNS)) {
      const value = (parsed.data as Record<string, unknown>)[key];
      if (value !== undefined) {
        // Normalise empty strings to null so cleared fields don't persist as ''.
        updates[column] = value === '' ? null : value;
      }
    }

    if (Object.keys(updates).length === 1) {
      throw new ApiRouteError(400, 'NO_UPDATES', 'No candidate updates were provided.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer']);
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_UPDATE_FAILED', 'Could not update candidate.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'candidate.updated',
      targetType: 'candidate',
      targetId: candidateId,
      metadata: { changedFields: Object.keys(updates).filter((k) => k !== 'updated_at') },
    });

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id: candidateId } = await params;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const { supabase, companyId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .is('deleted_at', null)
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
    const { id: candidateId } = await params;
    if (!candidateId) {
      throw new ApiRouteError(400, 'CANDIDATE_ID_REQUIRED', 'Candidate ID is required.');
    }

    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer']);
    const { data, error } = await supabase
      .from('candidates')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('id', candidateId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_DELETE_FAILED', 'Could not delete candidate.', error);
    }
    if (!data) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found.');
    }

    await writeAuditLog(supabase, {
      companyId,
      actorUserId: userId,
      action: 'candidate.soft_deleted',
      targetType: 'candidate',
      targetId: candidateId,
    });

    return jsonSuccess(requestId, { deleted: true });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
