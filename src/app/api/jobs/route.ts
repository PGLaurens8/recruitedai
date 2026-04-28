import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  salary: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['draft', 'active', 'pending', 'closed']).optional(),
  approval: z.enum(['approved', 'pending', 'rejected']).optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId } = await requireUserAndCompany();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 500);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
    const { data, error } = await supabase
      .from('jobs')
      .select('id,company_id,title,salary,company,location,status,approval,candidates_count,ai_matches,created_at,updated_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiRouteError(500, 'JOBS_QUERY_FAILED', 'Could not load jobs.', error);
    }

    return jsonSuccess(requestId, data || []);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Sales', 'Developer']);
    const rawBody = await request.text();
    const payload = createJobSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    const createdJob = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'job:create',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      successStatus: 201,
      execute: async () => {
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            company_id: companyId,
            title: payload.title,
            salary: payload.salary || null,
            company: payload.company || null,
            location: payload.location || null,
            status: payload.status || 'draft',
            approval: payload.approval || 'pending',
            description: payload.description || null,
            created_by: userId,
          })
          .select('*')
          .single();

        if (error) {
          throw new ApiRouteError(500, 'JOB_CREATE_FAILED', 'Could not create job.', error);
        }

        return data;
      },
    });

    return jsonSuccess(requestId, createdJob, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
