import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const visibilitySchema = z.object({ isPublic: z.boolean() });

/**
 * Toggle the public share visibility of the current user's master resume.
 *
 * This is the ONLY path that changes master_resumes.is_public — kept separate
 * from the full-resume PUT so a normal resume edit can never accidentally
 * publish or unpublish. Owner-scoped by `user_id = userId` (and by the
 * owner-only RLS on master_resumes).
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const body = await request.json();
    const parsed = visibilitySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid visibility payload.', parsed.error.flatten());
    }

    const { supabase, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('master_resumes')
      .update({ is_public: parsed.data.isPublic })
      .eq('user_id', userId)
      .select('id, is_public');

    if (error) {
      throw new ApiRouteError(500, 'RESUME_VISIBILITY_UPDATE_FAILED', error.message);
    }
    if (!data || data.length === 0) {
      throw new ApiRouteError(404, 'MASTER_RESUME_NOT_FOUND', 'No master resume found to update.');
    }

    return jsonSuccess(requestId, { isPublic: Boolean(data[0].is_public) });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
