import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

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
 * The `get_public_resume` SECURITY DEFINER function (see
 * 202607230024_public_resume_optin.sql) returns a row ONLY when the owner has
 * opted the resume in (master_resumes.is_public = true), and projects only
 * non-identifying fields. Contact info (email/phone/LinkedIn/location),
 * user_id, missing_information, questions and timestamps are never exposed.
 *
 * Because it is unauthenticated, it is IP rate-limited to blunt scraping and
 * abuse. The owner-scoped RLS on master_resumes is untouched.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request);

  try {
    // Unauthenticated + public: throttle per client IP before doing any work.
    await enforceRateLimit(request, {
      scope: 'public-resume',
      subject: 'public-resume',
      limit: 30,
      windowMs: 60_000,
    });

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

    // Map to a clean camelCase public contract. NOTE: no contactInfo — contact
    // details are intentionally not part of the public projection.
    return jsonSuccess(requestId, {
      fullName: row.full_name ?? null,
      userTitle: row.user_title ?? null,
      reformattedText: row.reformatted_text ?? '',
      skills: row.skills ?? [],
      avatarUri: row.avatar_uri ?? null,
      currentJobTitle: row.current_job_title ?? null,
    });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
