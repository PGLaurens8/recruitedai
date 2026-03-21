import { z } from 'zod';

import { findSmartLeads } from '@/ai/flows/find-smart-leads';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const schema = z
  .object({
    industry: z.string().max(200).optional(),
    companySize: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    targetRole: z.string().max(200).optional(),
    companyName: z.string().max(200).optional(),
    companyWebsite: z.string().max(2_048).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.industry ||
          value.companySize ||
          value.location ||
          value.targetRole ||
          value.companyName ||
          value.companyWebsite
      ),
    {
      message: 'At least one search criterion must be provided.',
      path: ['industry'],
    }
  );

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Sales', 'Developer']);
await enforceRateLimit(request, {
      scope: 'ai:find-smart-leads',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid smart leads payload.', payload.error.flatten());
    }

    const result = await findSmartLeads(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
