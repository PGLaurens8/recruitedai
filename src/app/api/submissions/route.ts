import { z } from 'zod';

import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

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

const createSubmissionSchema = z.object({
  candidateId: z.string().uuid('candidateId must be a UUID.'),
  jobId: z.string().uuid('jobId must be a UUID.'),
  status: z.enum(SUBMISSION_STATUSES).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const candidateId = url.searchParams.get('candidateId');

    let query = supabase
      .from('submissions')
      .select(
        'id,company_id,candidate_id,job_id,client_id,status,submitted_by,notes,rejection_reason,placement_fee,placement_date,created_at,updated_at,candidate:candidates(name),job:jobs(title),client:clients(name)'
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    const { data, error } = await query;
    if (error) {
      throw new ApiRouteError(500, 'SUBMISSIONS_QUERY_FAILED', 'Could not load submissions.', error);
    }

    // Flatten the joined names so the client mapper stays simple.
    const rows = (data || []).map((row) => {
      const { candidate, job, client, ...rest } = row as Record<string, any>;
      const candidateRel = Array.isArray(candidate) ? candidate[0] : candidate;
      const jobRel = Array.isArray(job) ? job[0] : job;
      const clientRel = Array.isArray(client) ? client[0] : client;
      return {
        ...rest,
        candidate_name: candidateRel?.name ?? null,
        job_title: jobRel?.title ?? null,
        client_name: clientRel?.name ?? null,
      };
    });

    return jsonSuccess(requestId, rows);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const rawBody = await request.text();
    const payload = createSubmissionSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    // Both candidate and job must belong to this company — the FK alone is not
    // tenant-scoped, so verify ownership before creating the submission. Also
    // pull job.client_id so we can denormalize it onto the submission row.
    const [{ data: candidate, error: candError }, { data: job, error: jobError }] = await Promise.all([
      supabase
        .from('candidates')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', payload.candidateId)
        .maybeSingle(),
      supabase
        .from('jobs')
        .select('id,client_id')
        .eq('company_id', companyId)
        .eq('id', payload.jobId)
        .is('deleted_at', null)
        .maybeSingle(),
    ]);

    if (candError) {
      throw new ApiRouteError(500, 'CANDIDATE_LOOKUP_FAILED', 'Could not verify candidate.', candError);
    }
    if (!candidate) {
      throw new ApiRouteError(404, 'CANDIDATE_NOT_FOUND', 'Candidate does not exist for this company.');
    }
    if (jobError) {
      throw new ApiRouteError(500, 'JOB_LOOKUP_FAILED', 'Could not verify job.', jobError);
    }
    if (!job) {
      throw new ApiRouteError(404, 'JOB_NOT_FOUND', 'Job does not exist for this company.');
    }

    const created = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'submission:create',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      successStatus: 201,
      execute: async () => {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            company_id: companyId,
            candidate_id: payload.candidateId,
            job_id: payload.jobId,
            client_id: job.client_id || null,
            status: payload.status || 'submitted',
            submitted_by: userId,
            notes: payload.notes || null,
          })
          .select('*')
          .single();

        if (error) {
          // 23505 is unique_violation on (company_id, candidate_id, job_id).
          if ((error as { code?: string }).code === '23505') {
            throw new ApiRouteError(
              409,
              'SUBMISSION_DUPLICATE',
              'This candidate has already been submitted to this job.',
              error,
            );
          }
          throw new ApiRouteError(500, 'SUBMISSION_CREATE_FAILED', 'Could not create submission.', error);
        }

        return data;
      },
    });

    return jsonSuccess(requestId, created, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
