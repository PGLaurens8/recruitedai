import { z } from 'zod';

import { generateCoverLetter } from '@/ai/flows/generate-cover-letter';
import { withProviderErrorGuard } from '@/server/api/ai-errors';
import { logAICall, estimateTokens } from '@/server/api/ai-logger';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { resolveMedia, resolveOptionalMedia } from '@/server/api/media';
import { enforceRateLimit, enforceTrialQuota } from '@/server/api/rate-limit';

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
  const startTime = Date.now();
  // Set just before the AI call so auth/rate-limit/validation failures aren't
  // counted as AI invocations. Logging is best-effort and never throws.
  let aiLog: { companyId: string; userId: string; inputTokenEstimate: number } | null = null;

  try {
    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
    await enforceRateLimit(request, {
      scope: 'ai:generate-cover-letter',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });
    await enforceTrialQuota(request, 'COVER_LETTER', companyId);

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid cover letter payload.', payload.error.flatten());
    }

    aiLog = {
      companyId,
      userId,
      inputTokenEstimate: estimateTokens(
        `${payload.data.masterResumeDataUri}${payload.data.jobSpecText ?? ''}${payload.data.jobSpecDataUri ?? ''}${payload.data.tailoredResumeText ?? ''}`
      ),
    };

    // Inline any storage URLs so Gemini can read the files (data URIs pass through).
    const masterResumeDataUri = await resolveMedia(payload.data.masterResumeDataUri);
    const jobSpecDataUri = await resolveOptionalMedia(payload.data.jobSpecDataUri);
    const result = await withProviderErrorGuard(() =>
      generateCoverLetter({ ...payload.data, masterResumeDataUri, jobSpecDataUri })
    );

    await logAICall({
      ...aiLog,
      flowName: 'generate-cover-letter',
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
        flowName: 'generate-cover-letter',
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: error instanceof ApiRouteError ? error.code : 'INTERNAL_ERROR',
        requestId,
      });
    }
    return jsonError(requestId, error);
  }
}
