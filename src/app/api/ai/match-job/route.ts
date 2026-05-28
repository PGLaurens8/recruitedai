import { z } from 'zod';

import { assessJobMatch } from '@/ai/flows/assess-job-match';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { resolveMedia, resolveOptionalMedia } from '@/server/api/media';
import { enforceRateLimit, enforceTrialQuota } from '@/server/api/rate-limit';

const matchJobSchema = z
  .object({
    masterResumeDataUri: z.string().min(1).max(4_000_000),
    jobSpecDataUri: z.string().max(8_000_000).optional(),
    jobSpecText: z.string().max(100_000).optional(),
    skillsFirstMode: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.jobSpecDataUri || value.jobSpecText), {
    message: 'Either jobSpecDataUri or jobSpecText must be provided.',
    path: ['jobSpecText'],
  });

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
    await enforceRateLimit(request, {
      scope: 'ai:match-job',
      subject: userId,
      limit: 30,
      windowMs: 60_000,
    });
    await enforceTrialQuota(request, 'JOB_MATCH', companyId);

    const payload = matchJobSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid job match payload.', payload.error.flatten());
    }

    // Inline any storage URLs so Gemini can read the files (data URIs pass through).
    const result = await assessJobMatch({
      ...payload.data,
      masterResumeDataUri: await resolveMedia(payload.data.masterResumeDataUri),
      jobSpecDataUri: await resolveOptionalMedia(payload.data.jobSpecDataUri),
    });
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
