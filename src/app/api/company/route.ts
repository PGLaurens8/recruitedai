import { z } from 'zod';

import { requireUserAndCompany, requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required.'),
  logo: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'COMPANY_QUERY_FAILED', 'Could not load company.', error);
    }
    if (data == null) {
      throw new ApiRouteError(404, 'COMPANY_NOT_FOUND', 'Company not found.');
    }

    return jsonSuccess(requestId, data);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId, userId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const rawBody = await request.text();
    const payload = updateCompanySchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    const updatedCompany = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'company:update:self',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      execute: async () => {
        const { data, error } = await supabase
          .from('companies')
          .update({
            name: payload.name,
            logo: payload.logo || null,
            website: payload.website || null,
            email: payload.email || null,
            address: payload.address || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyId)
          .select('*')
          .maybeSingle();

        if (error) {
          throw new ApiRouteError(500, 'COMPANY_UPDATE_FAILED', 'Could not update company.', error);
        }
        if (data == null) {
          throw new ApiRouteError(404, 'COMPANY_NOT_FOUND', 'Company not found.');
        }

        await writeAuditLog(supabase, {
          companyId,
          actorUserId: userId,
          action: 'company.settings_updated',
          targetType: 'company',
          targetId: companyId,
          metadata: {
            changedFields: Object.keys(payload),
          },
        });

        return data;
      },
    });

    return jsonSuccess(requestId, updatedCompany);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
