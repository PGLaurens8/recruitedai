import { z } from 'zod';

import { type Role } from '@/lib/roles';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ASSIGNABLE_ROLES } from '@/server/api/company-members';
import { createCompanyInvite, listCompanyInvites } from '@/server/api/company-invites';
import { getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

const createInviteSchema = z.object({
  email: z.string().email('Valid email is required.'),
  role: z.enum(ASSIGNABLE_ROLES),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { companyId } = await requireUserAndCompanyRole(['Admin', 'Developer']);
    const invites = await listCompanyInvites(companyId);
    return jsonSuccess(requestId, invites);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const rawBody = await request.text();
    const payload = createInviteSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);
    const { companyId, userId, supabase } = await requireUserAndCompanyRole(['Admin', 'Developer']);

    const result = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'company-invite:create',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      successStatus: 201,
      execute: async () => {
        const invite = await createCompanyInvite(
          userId,
          companyId,
          payload.email,
          payload.role as Role,
          payload.expiresInDays || 7
        );

        return {
          invite,
          acceptToken: invite.token,
        };
      },
    });

    return jsonSuccess(requestId, result, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
