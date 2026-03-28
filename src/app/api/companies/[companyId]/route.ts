import { z } from 'zod';

import { requireUserAndCompanyRole } from '@/server/api/auth';
import { writeAuditLog } from '@/server/api/audit';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

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
    const rawBody = await request.text();
    const body = JSON.parse(rawBody || '{}');
    const parsed = companyPatchSchema.safeParse(body);

    if (parsed.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid company update payload.', parsed.error.flatten());
    }

    const canonicalBody = JSON.stringify(parsed.data);
    const { supabase, userId } = await requireUserAndCompanyRole(['Admin', 'Developer'], companyId);

    const result = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'company:update:' + companyId,
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      execute: async () => {
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

        await writeAuditLog(supabase, {
          companyId,
          actorUserId: userId,
          action: 'company.settings_updated',
          targetType: 'company',
          targetId: companyId,
          metadata: {
            changedFields: Object.keys(parsed.data),
          },
        });

        return { companyId };
      },
    });

    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
