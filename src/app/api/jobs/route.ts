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
  clientId: z.string().uuid().optional(),
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
      .select('id,company_id,title,salary,company,location,status,approval,candidates_count,ai_matches,client_id,created_at,updated_at,client:clients(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiRouteError(500, 'JOBS_QUERY_FAILED', 'Could not load jobs.', error);
    }

    // Flatten the embedded client name to a top-level `client_name` so the client
    // mapper (toJobRecord) stays simple and unaware of the join shape.
    const rows = (data || []).map((row) => {
      const { client, ...rest } = row as Record<string, any>;
      const clientRel = Array.isArray(client) ? client[0] : client;
      return { ...rest, client_name: clientRel?.name ?? null };
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
    const payload = createJobSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    // A client_id from another tenant must never be linkable: verify ownership
    // against this company before trusting it (the FK alone is not company-scoped).
    if (payload.clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .eq('id', payload.clientId)
        .is('deleted_at', null)
        .maybeSingle();

      if (clientError) {
        throw new ApiRouteError(500, 'CLIENT_LOOKUP_FAILED', 'Could not verify client.', clientError);
      }
      if (!client) {
        throw new ApiRouteError(404, 'CLIENT_NOT_FOUND', 'Linked client does not exist for this company.');
      }
    }

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
            client_id: payload.clientId || null,
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
