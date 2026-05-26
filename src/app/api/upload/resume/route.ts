import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';
import { uploadResume } from '@/lib/storage';

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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiRouteError(400, 'INVALID_FORM_DATA', 'Request must be multipart/form-data.');
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', "A 'file' field is required.");
    }

    if (file.size === 0) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'The uploaded file is empty.');
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new ApiRouteError(413, 'FILE_TOO_LARGE', 'Resume files must be 10MB or smaller.');
    }

    const isAllowedType = ALLOWED_MIME_TYPES.has(file.type) || hasAllowedExtension(file.name);
    if (!isAllowedType) {
      throw new ApiRouteError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, DOCX, or TXT files are allowed.');
    }

    const { url, path } = await uploadResume(
      file,
      userId,
      supabase as unknown as Parameters<typeof uploadResume>[2]
    );

    return jsonSuccess(requestId, { url, path });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
