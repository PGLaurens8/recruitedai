import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  logo: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'prospect', 'on hold', 'inactive']).optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId } = await requireUserAndCompany();
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 500);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;
    const { data, error } = await supabase
      .from('clients')
      .select('id,company_id,name,logo,contact_name,contact_email,status,open_jobs,created_at,updated_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiRouteError(500, 'CLIENTS_QUERY_FAILED', 'Could not load clients.', error);
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
    const payload = createClientSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    const createdClient = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'client:create',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      successStatus: 201,
      execute: async () => {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: payload.name,
            logo: payload.logo || null,
            contact_name: payload.contactName || null,
            contact_email: payload.contactEmail || null,
            status: payload.status || 'prospect',
            created_by: userId,
          })
          .select('*')
          .single();

        if (error) {
          throw new ApiRouteError(500, 'CLIENT_CREATE_FAILED', 'Could not create client.', error);
        }

        return data;
      },
    });

    return jsonSuccess(requestId, createdClient, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
