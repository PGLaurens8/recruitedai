import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const masterResumeSchema = z.object({
  id: z.string().uuid().optional(),
  userTitle: z.string().min(1).max(200),
  reformattedText: z.string().min(1),
  fullName: z.string().optional().nullable(),
  currentJobTitle: z.string().optional().nullable(),
  contactInfo: z.record(z.string(), z.any()).optional(),
  skills: z.array(z.string()).optional(),
  avatarUri: z.string().max(2048).optional().nullable(),
  missingInformation: z.array(z.string()).optional(),
  questions: z.array(z.string()).optional(),
  processedAt: z.string().optional().nullable(),
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
      throw new ApiRouteError(500, 'MASTER_RESUME_QUERY_FAILED', error.message);
    }

    return jsonSuccess(requestId, data || null);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function PUT(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.json();
    const parsed = masterResumeSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid master resume payload.', parsed.error.flatten());
    }

    const { supabase, userId } = await requireUserAndCompany();
    const existing = await supabase
      .from('master_resumes')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw new ApiRouteError(500, 'MASTER_RESUME_LOOKUP_FAILED', existing.error.message);
    }

    const { data, error } = await supabase
      .from('master_resumes')
      .upsert({
        id: existing.data?.id || parsed.data.id,
        user_id: userId,
        user_title: parsed.data.userTitle,
        reformatted_text: parsed.data.reformattedText,
        full_name: parsed.data.fullName ?? null,
        current_job_title: parsed.data.currentJobTitle ?? null,
        contact_info: parsed.data.contactInfo || {},
        skills: parsed.data.skills || [],
        avatar_uri: parsed.data.avatarUri ?? null,
        missing_information: parsed.data.missingInformation || [],
        questions: parsed.data.questions || [],
        processed_at: parsed.data.processedAt ?? null,
      })
      .select('id')
      .single();

    if (error) {
      throw new ApiRouteError(500, 'MASTER_RESUME_SAVE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { id: data.id });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
