import { z } from 'zod';

import { generateCoverLetter } from '@/ai/flows/generate-cover-letter';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const schema = z
  .object({
    masterResumeDataUri: z.string().min(1).max(4_000_000),
    jobSpecDataUri: z.string().max(8_000_000).optional(),
    jobSpecText: z.string().max(100_000).optional(),
    companyName: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    tailoredResumeText: z.string().max(200_000).optional(),
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
      scope: 'ai:generate-cover-letter',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid cover letter payload.', payload.error.flatten());
    }

    const result = await generateCoverLetter(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
