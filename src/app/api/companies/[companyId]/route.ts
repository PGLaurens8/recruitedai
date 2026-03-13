import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const companyPatchSchema = z.object({
  name: z.string().min(1).max(200),
  logo: z.string().trim().max(2048).optional().nullable(),
  website: z.string().trim().max(2048).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId } = await context.params;
    const body = await request.json();
    const parsed = companyPatchSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid company update payload.', parsed.error.flatten());
    }

    const { supabase } = await requireUserAndCompany(companyId);
    const { error } = await supabase
      .from('companies')
      .update({
        name: parsed.data.name,
        logo: parsed.data.logo ?? null,
        website: parsed.data.website ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
      })
      .eq('id', companyId);

    if (error) {
      throw new ApiRouteError(500, 'COMPANY_UPDATE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { companyId });
  } catch (error) {
    return jsonError(requestId, error);
  }
}

