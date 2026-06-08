import { z } from 'zod';

import { assessJobMatch } from '@/ai/flows/assess-job-match';
import { logAICall, estimateTokens } from '@/server/api/ai-logger';
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
  const startTime = Date.now();
  // Set just before the AI call so auth/rate-limit/validation failures aren't
  // counted as AI invocations. Logging is best-effort and never throws.
  let aiLog: { companyId: string; userId: string; inputTokenEstimate: number } | null = null;

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

    aiLog = {
      companyId,
      userId,
      inputTokenEstimate: estimateTokens(
        `${payload.data.masterResumeDataUri}${payload.data.jobSpecText ?? ''}${payload.data.jobSpecDataUri ?? ''}`
      ),
    };

    // Inline any storage URLs so Gemini can read the files (data URIs pass through).
    const result = await assessJobMatch({
      ...payload.data,
      masterResumeDataUri: await resolveMedia(payload.data.masterResumeDataUri),
      jobSpecDataUri: await resolveOptionalMedia(payload.data.jobSpecDataUri),
    });

    await logAICall({
      ...aiLog,
      flowName: 'match-job',
      durationMs: Date.now() - startTime,
      outputTokenEstimate: estimateTokens(JSON.stringify(result)),
      success: true,
      requestId,
    });
    return jsonSuccess(requestId, result);
  } catch (error) {
    if (aiLog) {
      await logAICall({
        ...aiLog,
        flowName: 'match-job',
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: error instanceof ApiRouteError ? error.code : 'INTERNAL_ERROR',
        requestId,
      });
    }
    return jsonError(requestId, error);
  }
}
