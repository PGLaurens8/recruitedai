import { requireUserAndCompany } from '@/server/api/auth';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

const DEMO_COMPANY_ID = 'demo-agency-123';

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiRouteError(403, 'SEED_DISABLED', 'Demo seed is disabled in production.');
    }

    const { supabase, userId } = await requireUserAndCompany();
    const { data: profile, error: profileReadError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileReadError) {
      throw new ApiRouteError(500, 'PROFILE_QUERY_FAILED', 'Could not verify role.', profileReadError);
    }

    if (!profile || !['Admin', 'Developer'].includes(profile.role as string)) {
      throw new ApiRouteError(403, 'FORBIDDEN', 'Only Admin/Developer can seed demo data.');
    }

    const { error: companyError } = await supabase.from('companies').upsert({
      id: DEMO_COMPANY_ID,
      name: 'TalentSource Pro Agency',
      website: 'www.talentsource-pro.ai',
      owner_id: userId,
      updated_at: new Date().toISOString(),
    });
    if (companyError) {
      throw new ApiRouteError(500, 'SEED_COMPANY_FAILED', 'Could not seed company.', companyError);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ company_id: DEMO_COMPANY_ID, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (profileError) {
      throw new ApiRouteError(500, 'SEED_PROFILE_FAILED', 'Could not update profile company.', profileError);
    }

    const candidates = [
      {
        id: 'cand-0',
        name: 'Elena Rodriguez',
        email: 'elena.r@example.com',
        status: 'Sourced',
        ai_score: 92,
        current_job: 'Senior UX Designer',
        current_company: 'Innovate Inc.',
      },
      {
        id: 'cand-1',
        name: 'Marcus Chen',
        email: 'marcus.c@example.com',
        status: 'Applied',
        ai_score: 88,
        current_job: 'Data Scientist',
        current_company: 'DataDriven Co.',
      },
      {
        id: 'cand-2',
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
        id: 'job-0',
        title: 'Senior Frontend Developer',
        salary: '$120k - $150k',
        location: 'San Francisco, CA',
        status: 'active',
        approval: 'approved',
        description: 'Modern React expert needed.',
      },
      {
        id: 'job-1',
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
        id: 'client-0',
        name: 'TechCorp',
        contact_name: 'John Doe',
        contact_email: 'john.doe@techcorp.com',
        status: 'active',
      },
      {
        id: 'client-1',
        name: 'Innovate LLC',
        contact_name: 'Jane Smith',
        contact_email: 'jane.s@innovatellc.com',
        status: 'active',
      },
    ];

    const { error: candError } = await supabase.from('candidates').upsert(
      candidates.map((item) => ({ ...item, company_id: DEMO_COMPANY_ID }))
    );
    if (candError) {
      throw new ApiRouteError(500, 'SEED_CANDIDATES_FAILED', 'Could not seed candidates.', candError);
    }

    const { error: jobError } = await supabase.from('jobs').upsert(
      jobs.map((item) => ({ ...item, company_id: DEMO_COMPANY_ID }))
    );
    if (jobError) {
      throw new ApiRouteError(500, 'SEED_JOBS_FAILED', 'Could not seed jobs.', jobError);
    }

    const { error: clientError } = await supabase.from('clients').upsert(
      clients.map((item) => ({ ...item, company_id: DEMO_COMPANY_ID }))
    );
    if (clientError) {
      throw new ApiRouteError(500, 'SEED_CLIENTS_FAILED', 'Could not seed clients.', clientError);
    }

    return jsonSuccess(requestId, { companyId: DEMO_COMPANY_ID });
  } catch (error) {
    return jsonError(requestId, error);
  }
}
