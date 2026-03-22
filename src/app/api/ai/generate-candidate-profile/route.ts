import { z } from 'zod';

import { generateCandidateProfile } from '@/ai/flows/generate-candidate-profile';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const schema = z.object({
  candidateName: z.string().max(200).optional(),
  candidateRole: z.string().max(200).optional(),
  interviewNotes: z.string().min(1).max(100_000),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer']);
await enforceRateLimit(request, {
      scope: 'ai:generate-candidate-profile',
      subject: userId,
      limit: 30,
      windowMs: 60_000,
    });

    const payload = schema.safeParse(await request.json());
    if (payload.success === false) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate profile payload.', payload.error.flatten());
    }

    const result = await generateCandidateProfile(payload.data);
    return jsonSuccess(requestId, result);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
