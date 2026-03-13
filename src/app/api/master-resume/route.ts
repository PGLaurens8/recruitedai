import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const saveMasterResumeSchema = z.object({
  id: z.string().optional(),
  userTitle: z.string().min(1, 'Title is required.'),
  reformattedText: z.string(),
  fullName: z.string().optional(),
  currentJobTitle: z.string().optional(),
  contactInfo: z.record(z.string(), z.union([z.string(), z.undefined()])).optional(),
  skills: z.array(z.string()).optional(),
  avatarUri: z.string().optional(),
  missingInformation: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  processedAt: z.string().optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, userId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('master_resumes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'MASTER_RESUME_QUERY_FAILED', 'Could not load master resume.', error);
    }

    return jsonSuccess(requestId, data || null);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PUT(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, userId } = await requireUserAndCompany();
    const payload = saveMasterResumeSchema.parse(await request.json());

    const existing = await supabase
      .from('master_resumes')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw new ApiRouteError(
        500,
        'MASTER_RESUME_LOOKUP_FAILED',
        'Could not resolve existing master resume.',
        existing.error
      );
    }

    const { data, error } = await supabase
      .from('master_resumes')
      .upsert({
        id: existing.data?.id || payload.id,
        user_id: userId,
        user_title: payload.userTitle,
        reformatted_text: payload.reformattedText,
        full_name: payload.fullName || null,
        current_job_title: payload.currentJobTitle || null,
        contact_info: payload.contactInfo || {},
        skills: payload.skills || [],
        avatar_uri: payload.avatarUri || null,
        missing_information: payload.missingInformation || [],
        questions: payload.questions || [],
        processed_at: payload.processedAt || null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (error) {
      throw new ApiRouteError(500, 'MASTER_RESUME_SAVE_FAILED', 'Could not save master resume.', error);
    }

    return jsonSuccess(requestId, data || null);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
