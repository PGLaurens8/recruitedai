import { z } from 'zod';

import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';
import { readIdempotencyKey, runIdempotent } from '@/server/api/idempotency';

const createCandidateSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().optional(),
  status: z
    .enum(['Sourced', 'Applied', 'Interviewing', 'Offer', 'Hired', 'Rejected'])
    .optional(),
  aiScore: z.number().int().min(0).max(100).optional(),
  currentJob: z.string().optional(),
  currentCompany: z.string().optional(),
  appliedFor: z.string().optional(),
  fullResumeText: z.string().optional(),
  skills: z.array(z.string()).optional(),
  contactInfo: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId } = await requireUserAndCompany();
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiRouteError(500, 'CANDIDATES_QUERY_FAILED', 'Could not load candidates.', error);
    }

    return jsonSuccess(requestId, data || []);
  } catch (error) {
    return jsonError(requestId, error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const { supabase, companyId, userId } = await requireUserAndCompany();
    const rawBody = await request.text();
    const payload = createCandidateSchema.parse(JSON.parse(rawBody || '{}'));
    const canonicalBody = JSON.stringify(payload);

    const createdCandidate = await runIdempotent({
      supabase,
      companyId,
      actorUserId: userId,
      scope: 'candidate:create',
      idempotencyKey: readIdempotencyKey(request),
      requestBodyRaw: canonicalBody,
      successStatus: 201,
      execute: async () => {
        const { data, error } = await supabase
          .from('candidates')
          .insert({
            company_id: companyId,
            name: payload.name,
            email: payload.email || null,
            avatar: payload.avatar || null,
            status: payload.status || 'Sourced',
            ai_score: payload.aiScore ?? null,
            current_job: payload.currentJob || null,
            current_company: payload.currentCompany || null,
            applied_for: payload.appliedFor || null,
            full_resume_text: payload.fullResumeText || null,
            skills: payload.skills || [],
            contact_info: payload.contactInfo || {},
            created_by: userId,
          })
          .select('*')
          .single();

        if (error) {
          throw new ApiRouteError(500, 'CANDIDATE_CREATE_FAILED', 'Could not create candidate.', error);
        }

        return data;
      },
    });

    return jsonSuccess(requestId, createdCandidate, 201);
  } catch (error) {
    return jsonError(requestId, error);
  }
}
