import { z } from 'zod';

import { assessJobMatch } from '@/ai/flows/assess-job-match';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const matchJobSchema = z
  .object({
    masterResumeDataUri: z.string().min(1).max(4_000_000),
    jobSpecDataUri: z.string().max(8_000_000).optional(),
    jobSpecText: z.string().max(100_000).optional(),
  })
  .refine((value) => Boolean(value.jobSpecDataUri || value.jobSpecText), {
    message: 'Either jobSpecDataUri or jobSpecText must be provided.',
    path: ['jobSpecText'],
  });

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
await enforceRateLimit(request, {
      scope: 'ai:match-job',
      subject: userId,
      limit: 30,
      windowMs: 60_000,
    });

    const payload = matchJobSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid job match payload.', payload.error.flatten());
    }

    const result = await assessJobMatch(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
