import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Role } from '@/lib/roles';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

function buildCompanyId(userId: string, existingCompanyId?: string | null) {
  if (existingCompanyId && existingCompanyId.trim()) {
    return existingCompanyId;
  }

  const shortId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'user';
  return `demo-${shortId}`;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiRouteError(401, 'UNAUTHORIZED', 'You must be signed in.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new ApiRouteError(403, 'PROFILE_MISSING', 'User profile could not be resolved.', profileError);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ApiRouteError(403, 'SEED_DISABLED', 'Demo seed is disabled in production.');
    }

    const role = profile.role as Role | undefined;
    if (role !== 'Admin' && role !== 'Developer') {
      throw new ApiRouteError(403, 'FORBIDDEN', 'Only Admin/Developer can seed demo data.');
    }

    let body: { confirm?: boolean } = {};
    try {
      body = (await request.json()) as { confirm?: boolean };
    } catch {
      body = {};
    }

    if (!body.confirm) {
      throw new ApiRouteError(400, 'CONFIRM_REQUIRED', 'Set {"confirm": true} to seed sample data.');
    }

    const companyId = buildCompanyId(user.id, profile.company_id as string | null | undefined);

    const { error: companyError } = await supabase.from('companies').upsert({
      id: companyId,
      name: 'TalentSource Pro Agency',
      website: 'www.talentsource-pro.ai',
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    });
    if (companyError) {
      throw new ApiRouteError(500, 'SEED_COMPANY_FAILED', 'Could not seed company.', companyError);
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ company_id: companyId, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (profileUpdateError) {
      throw new ApiRouteError(500, 'SEED_PROFILE_FAILED', 'Could not update profile company.', profileUpdateError);
    }

    const candidates = [
      {
        id: `${companyId}-cand-0`,
        name: 'Elena Rodriguez',
        email: 'elena.r@example.com',
        status: 'Sourced',
        ai_score: 92,
        current_job: 'Senior UX Designer',
        current_company: 'Innovate Inc.',
      },
      {
        id: `${companyId}-cand-1`,
        name: 'Marcus Chen',
        email: 'marcus.c@example.com',
        status: 'Applied',
        ai_score: 88,
        current_job: 'Data Scientist',
        current_company: 'DataDriven Co.',
      },
      {
        id: `${companyId}-cand-2`,
        name: 'Aisha Khan',
        email: 'aisha.k@example.com',
        status: 'Interviewing',
        ai_score: 95,
        current_job: 'Backend Engineer',
        current_company: 'CloudNet',
      },
    ];

    const jobs = [
      {
        id: `${companyId}-job-0`,
        title: 'Senior Frontend Developer',
        salary: '$120k - $150k',
        location: 'San Francisco, CA',
        status: 'active',
        approval: 'approved',
        description: 'Modern React expert needed.',
      },
      {
        id: `${companyId}-job-1`,
        title: 'Data Scientist',
        salary: '$100k - $130k',
        location: 'Remote',
        status: 'pending',
        approval: 'pending',
        description: 'ML models focus.',
      },
    ];

    const clients = [
      {
        id: `${companyId}-client-0`,
        name: 'TechCorp',
        contact_name: 'John Doe',
        contact_email: 'john.doe@techcorp.com',
        status: 'active',
      },
      {
        id: `${companyId}-client-1`,
        name: 'Innovate LLC',
        contact_name: 'Jane Smith',
        contact_email: 'jane.s@innovatellc.com',
        status: 'active',
      },
    ];

    const { error: candError } = await supabase.from('candidates').upsert(
      candidates.map((item) => ({ ...item, company_id: companyId }))
    );
    if (candError) {
      throw new ApiRouteError(500, 'SEED_CANDIDATES_FAILED', 'Could not seed candidates.', candError);
    }

    const { error: jobError } = await supabase.from('jobs').upsert(
      jobs.map((item) => ({ ...item, company_id: companyId }))
    );
    if (jobError) {
      throw new ApiRouteError(500, 'SEED_JOBS_FAILED', 'Could not seed jobs.', jobError);
    }

    const { error: clientError } = await supabase.from('clients').upsert(
      clients.map((item) => ({ ...item, company_id: companyId }))
    );
    if (clientError) {
      throw new ApiRouteError(500, 'SEED_CLIENTS_FAILED', 'Could not seed clients.', clientError);
    }

    return jsonSuccess(requestId, {
      companyId,
      seeded: {
        candidates: candidates.length,
        jobs: jobs.length,
        clients: clients.length,
      },
    });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
