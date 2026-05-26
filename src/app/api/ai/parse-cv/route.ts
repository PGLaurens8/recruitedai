import { z } from 'zod';

import { extractCVData } from '@/ai/flows/extract-cv-data';
import { reformatResume } from '@/ai/flows/reformat-resume';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const parseCvSchema = z.object({
  // Accepts either a Base64 data URI (fallback) or an https URL to a stored file.
  resumeDataUri: z
    .string()
    .min(1)
    .max(8_000_000)
    .refine(
      (value) => value.startsWith('data:') || value.startsWith('https://') || value.startsWith('http://'),
      { message: 'resumeDataUri must be a Base64 data URI or an http(s) URL.' }
    ),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { userId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
await enforceRateLimit(request, {
      scope: 'ai:parse-cv',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });

    const payload = parseCvSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid CV parsing payload.', payload.error.flatten());
    }

    const [reformatted, extracted] = await Promise.all([
      reformatResume({ resumeDataUri: payload.data.resumeDataUri }),
      extractCVData({ resumeDataUri: payload.data.resumeDataUri }),
    ]);

    return jsonSuccess(requestId, {
      reformatted,
      extracted,
    });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
