import { z } from 'zod';

import { findCompanies } from '@/ai/flows/find-companies';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const schema = z
  .object({
    resumeDataUri: z.string().max(8_000_000).optional(),
    keySkills: z.string().max(10_000).optional(),
  })
  .refine((value) => Boolean(value.resumeDataUri || value.keySkills), {
    message: 'Either resumeDataUri or keySkills must be provided.',
    path: ['keySkills'],
  });

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Sales', 'Developer']);
await enforceRateLimit(request, {
      scope: 'ai:find-companies',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid company finder payload.', payload.error.flatten());
    }

    const result = await findCompanies(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
