import { z } from 'zod';

import { extractCVData } from '@/ai/flows/extract-cv-data';
import { reformatResume } from '@/ai/flows/reformat-resume';
import { requireUserAndCompanyRole } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { resolveMedia } from '@/server/api/media';
import { enforceRateLimit, enforceTrialQuota } from '@/server/api/rate-limit';

// media.ts uses Buffer (Node-only) and the two Gemini calls can run well past
// Vercel's 10s serverless default, so pin the Node runtime and raise the limit.
export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const { userId, companyId } = await requireUserAndCompanyRole(['Admin', 'Recruiter', 'Developer', 'Candidate']);
    await enforceRateLimit(request, {
      scope: 'ai:parse-cv',
      subject: userId,
      limit: 20,
      windowMs: 60_000,
    });
    await enforceTrialQuota(request, 'CV_PARSE', companyId);

    const payload = parseCvSchema.safeParse(await request.json());
    if (!payload.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid CV parsing payload.', payload.error.flatten());
    }

    // Gemini cannot read an external URL (e.g. a Supabase Storage signed URL)
    // directly, so resolve it to an inline data URI before invoking the flows.
    // Base64 data URIs pass through unchanged.
    const resumeDataUri = await resolveMedia(payload.data.resumeDataUri);

    // Run the flows sequentially (not Promise.all) so a failure names the
    // offending flow instead of collapsing into one opaque rejection. Each
    // flow's real error message is preserved and surfaced via ApiRouteError.
    const reformatted = await runFlow('reformatResume', () => reformatResume({ resumeDataUri }));
    const extracted = await runFlow('extractCVData', () => extractCVData({ resumeDataUri }));

    return jsonSuccess(requestId, {
      reformatted,
      extracted,
    });
  } catch (error) {
    // Explicit log so the real cause is visible in Vercel function logs even
    // when the client receives a sanitized message in production.
    console.error('[parse-cv] request failed', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return jsonError(requestId, error);
  }
}

async function runFlow<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    throw new ApiRouteError(
      502,
      'AI_FLOW_FAILED',
      `The ${name} AI flow failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { flow: name }
    );
  }
}
