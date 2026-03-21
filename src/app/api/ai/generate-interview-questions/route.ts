import { z } from 'zod';

import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const schema = z.object({
  jobSpecText: z.string().min(1).max(100_000),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
await enforceRateLimit(request, {
      scope: 'ai:generate-interview-questions',
      subject: userId,
      limit: 25,
      windowMs: 60_000,
    });

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid interview question payload.', payload.error.flatten());
    }

    const result = await generateInterviewQuestions(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
