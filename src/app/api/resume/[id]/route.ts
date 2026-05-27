import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const idSchema = z.string().uuid();

/**
 * PUBLIC endpoint — intentionally unauthenticated. Returns only the safe,
 * shareable fields of a master resume so a /resume/[id] link can be opened by
 * anyone (e.g. a recruiter the candidate shared it with).
 *
 * Sensitive columns (user_id, missing_information, questions, timestamps) are
 * never exposed: access goes through the `get_public_resume` SECURITY DEFINER
 * function (see 202605270014_public_resume_rls.sql), which projects only the
 * whitelisted columns. The owner-scoped RLS on master_resumes is untouched.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    const { id } = await params;
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) {
      throw new ApiRouteError(400, 'INVALID_RESUME_ID', 'A valid resume ID is required.');
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_public_resume', { resume_id: parsed.data });

    if (error) {
      throw new ApiRouteError(500, 'PUBLIC_RESUME_QUERY_FAILED', 'Could not load resume.', error);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new ApiRouteError(404, 'RESUME_NOT_FOUND', 'Resume not found.');
    }

    // Map to a clean camelCase public contract.
    return jsonSuccess(requestId, {
      fullName: row.full_name ?? null,
      userTitle: row.user_title ?? null,
      reformattedText: row.reformatted_text ?? '',
      skills: row.skills ?? [],
      avatarUri: row.avatar_uri ?? null,
      currentJobTitle: row.current_job_title ?? null,
      contactInfo: row.contact_info ?? {},
    });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
