import { z } from 'zod';

import { analyzeInterview } from '@/ai/flows/analyze-interview';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const interviewAnalyzeSchema = z.object({
  transcript: z.string().min(1).max(250_000),
  questions: z.array(z.string().min(1).max(300)).max(30).optional(),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer']);
await enforceRateLimit(request, {
      scope: 'ai:interview-analyze',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });

    const payload = interviewAnalyzeSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(
        400,
        'VALIDATION_ERROR',
        'Invalid interview analysis payload.',
        payload.error.flatten()
      );
    }

    const result = await analyzeInterview(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
