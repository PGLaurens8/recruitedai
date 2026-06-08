import { z } from 'zod';

import { generateCandidateProfile } from '@/ai/flows/generate-candidate-profile';
import { logAICall, estimateTokens } from '@/server/api/ai-logger';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit, enforceTrialQuota } from '@/server/api/rate-limit';

const schema = z.object({
  candidateName: z.string().max(200).optional(),
  candidateRole: z.string().max(200).optional(),
  interviewNotes: z.string().min(1).max(100_000),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  // Set just before the AI call so auth/rate-limit/validation failures aren't
  // counted as AI invocations. Logging is best-effort and never throws.
  let aiLog: { companyId: string; userId: string; inputTokenEstimate: number } | null = null;

  try {
    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer']);
    await enforceRateLimit(request, {
      scope: 'ai:generate-candidate-profile',
      subject: userId,
      limit: 30,
      windowMs: 60_000,
    });
    await enforceTrialQuota(request, 'CANDIDATE_PROFILE', companyId);

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate profile payload.', payload.error.flatten());
    }

    aiLog = {
      companyId,
      userId,
      inputTokenEstimate: estimateTokens(
        `${payload.data.candidateName ?? ''}${payload.data.candidateRole ?? ''}${payload.data.interviewNotes}`
      ),
    };

    const result = await generateCandidateProfile(payload.data);

    await logAICall({
      ...aiLog,
      flowName: 'generate-candidate-profile',
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
        flowName: 'generate-candidate-profile',
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: error instanceof ApiRouteError ? error.code : 'INTERNAL_ERROR',
        requestId,
      });
    }
    return jsonError(requestId, error);
  }
}
