import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { enforceRateLimit } from '@/server/api/rate-limit';

const createCandidateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().max(2048).optional().nullable(),
  status: z.string().default('Sourced'),
  aiScore: z.number().int().min(0).max(100).optional(),
  currentJob: z.string().max(200).optional().or(z.literal('')),
  currentCompany: z.string().max(200).optional().or(z.literal('')),
  appliedFor: z.string().max(200).optional(),
  fullResumeText: z.string().optional(),
  skills: z.array(z.string()).optional(),
  contactInfo: z.record(z.string(), z.any()).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId } = await context.params;
    const { supabase } = await requireUserAndCompany(companyId);
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATES_QUERY_FAILED', error.message);
    }

    return jsonSuccess(requestId, data || []);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { companyId } = await context.params;
    const body = await request.json();
    const parsed = createCandidateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiRouteError(400, 'VALIDATION_ERROR', 'Invalid candidate payload.', parsed.error.flatten());
    }

    const { supabase, userId } = await requireUserAndCompany(companyId);
await enforceRateLimit(request, {
      scope: 'write:candidate-create',
      subject: userId,
      limit: 40,
      windowMs: 60_000,
    });

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        company_id: companyId,
        name: parsed.data.name,
        email: parsed.data.email || '',
        avatar: parsed.data.avatar ?? null,
        status: parsed.data.status,
        ai_score: parsed.data.aiScore ?? 0,
        current_job: parsed.data.currentJob || '',
        current_company: parsed.data.currentCompany || '',
        applied_for: parsed.data.appliedFor || null,
        full_resume_text: parsed.data.fullResumeText || null,
        skills: parsed.data.skills || [],
        contact_info: parsed.data.contactInfo || {},
      })
      .select('id')
      .single();

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATE_CREATE_FAILED', error.message);
    }

    return jsonSuccess(requestId, { id: data.id }, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
