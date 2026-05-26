import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';
import { buildResumeStoragePath, createResumeUploadTicket } from '@/lib/storage';

export const runtime = 'nodejs';

// The file no longer transits this function (the browser uploads directly to
// Storage via the signed URL we return), so this cap is a product limit rather
// than a platform one. Kept in step with parse-cv's resolveMedia ceiling so the
// whole pipeline accepts the same range. The bucket also enforces this
// server-side (see the resume_bucket_limits migration) regardless of the
// client-claimed size below.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(255).optional(),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, userId } = await requireUserAndCompany();
    await enforceRateLimit(request, {
      scope: 'upload:resume',
      subject: userId,
      limit: 30,
      windowMs: 60_000,
    });

    const parsed = uploadRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid upload request.', parsed.error.flatten());
    }
    const { fileName, contentType, size } = parsed.data;

    if (size > MAX_FILE_BYTES) {
      throw new ApiRouteError(413, 'FILE_TOO_LARGE', 'Resume files must be 10MB or smaller.');
    }

    const isAllowedType = (contentType && ALLOWED_MIME_TYPES.has(contentType)) || hasAllowedExtension(fileName);
    if (!isAllowedType) {
      throw new ApiRouteError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, or TXT files are allowed.');
    }

    const path = buildResumeStoragePath(userId, fileName);
    const ticket = await createResumeUploadTicket(
      supabase as unknown as Parameters<typeof createResumeUploadTicket>[0],
      path
    );

    // { path, token } — the client uploads to this ticket then mints its own read URL.
    return jsonSuccess(requestId, ticket);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
