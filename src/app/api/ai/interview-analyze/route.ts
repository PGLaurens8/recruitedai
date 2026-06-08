import { z } from 'zod';

import { analyzeInterview } from '@/ai/flows/analyze-interview';
import { logAICall, estimateTokens } from '@/server/api/ai-logger';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit, enforceTrialQuota } from '@/server/api/rate-limit';

const interviewAnalyzeSchema = z.object({
  transcript: z.string().min(1).max(250_000),
  questions: z.array(z.string().min(1).max(300)).max(30).optional(),
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
      scope: 'ai:interview-analyze',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });
    await enforceTrialQuota(request, 'INTERVIEW_ANALYSIS', companyId);

    const payload = interviewAnalyzeSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(
        400,
        'VALIDATION_ERROR',
        'Invalid interview analysis payload.',
        payload.error.flatten()
      );
    }

    aiLog = {
      companyId,
      userId,
      inputTokenEstimate: estimateTokens(
        `${payload.data.transcript}${(payload.data.questions ?? []).join(' ')}`
      ),
    };

    const result = await analyzeInterview(payload.data);

    await logAICall({
      ...aiLog,
      flowName: 'interview-analyze',
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
        flowName: 'interview-analyze',
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: error instanceof ApiRouteError ? error.code : 'INTERNAL_ERROR',
        requestId,
      });
    }
    return jsonError(requestId, error);
  }
}
