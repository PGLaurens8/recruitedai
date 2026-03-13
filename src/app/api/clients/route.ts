import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

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
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

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
    const { supabase, companyId, userId } = await requireUserAndCompany();
    const payload = createClientSchema.parse(await request.json());

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

    return jsonSuccess(requestId, data, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
