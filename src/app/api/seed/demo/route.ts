import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type Role } from '@/lib/roles';
import { ApiRouteError, getRequestId, jsonError, jsonSuccess } from '@/server/api/http';

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    if (process.env.SEED_ENABLED !== 'true') {
      throw new ApiRouteError(403, 'SEED_DISABLED', 'Set SEED_ENABLED=true to enable seeding.');
    }

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

    const companyId = profile.company_id as string;

    const candidates = [
      {
        company_id: companyId,
        name: 'Elena Rodriguez',
        email: 'elena.r@example.com',
        status: 'Sourced',
        ai_score: 92,
        current_job: 'Senior UX Designer',
        current_company: 'Innovate Inc.',
        skills: ['Figma', 'User Research', 'Prototyping'],
      },
      {
        company_id: companyId,
        name: 'Marcus Chen',
        email: 'marcus.c@example.com',
        status: 'Applied',
        ai_score: 88,
        current_job: 'Data Scientist',
        current_company: 'DataDriven Co.',
        skills: ['Python', 'Machine Learning', 'SQL'],
      },
      {
        company_id: companyId,
        name: 'Aisha Khan',
        email: 'aisha.k@example.com',
        status: 'Interviewing',
        ai_score: 95,
        current_job: 'Backend Engineer',
        current_company: 'CloudNet',
        skills: ['Node.js', 'PostgreSQL', 'AWS'],
      },
      {
        company_id: companyId,
        name: 'James Okafor',
        email: 'j.okafor@example.com',
        status: 'Offer',
        ai_score: 91,
        current_job: 'Product Manager',
        current_company: 'StartupHub',
        skills: ['Roadmapping', 'Agile', 'Stakeholder Management'],
      },
      {
        company_id: companyId,
        name: 'Priya Nair',
        email: 'p.nair@example.com',
        status: 'Hired',
        ai_score: 97,
        current_job: 'Full Stack Developer',
        current_company: 'TechVenture',
        skills: ['React', 'TypeScript', 'PostgreSQL'],
      },
    ];

    const jobs = [
      {
        company_id: companyId,
        title: 'Senior Frontend Developer',
        salary: '$120k - $150k',
        location: 'San Francisco, CA',
        status: 'active',
        approval: 'approved',
        description: 'We need a modern React expert with TypeScript experience.',
        created_by: user.id,
      },
      {
        company_id: companyId,
        title: 'Data Scientist',
        salary: '$100k - $130k',
        location: 'Remote',
        status: 'active',
        approval: 'pending',
        description: 'Focus on ML model development and data pipelines.',
        created_by: user.id,
      },
      {
        company_id: companyId,
        title: 'UX Designer',
        salary: '$90k - $110k',
        location: 'New York, NY',
        status: 'draft',
        approval: 'pending',
        description: 'Design user experiences for our SaaS platform.',
        created_by: user.id,
      },
    ];

    const clients = [
      {
        company_id: companyId,
        name: 'TechCorp Solutions',
        contact_name: 'John Doe',
        contact_email: 'john.doe@techcorp.com',
        status: 'active',
        open_jobs: 2,
        created_by: user.id,
      },
      {
        company_id: companyId,
        name: 'Innovate LLC',
        contact_name: 'Jane Smith',
        contact_email: 'jane.s@innovatellc.com',
        status: 'active',
        open_jobs: 1,
        created_by: user.id,
      },
      {
        company_id: companyId,
        name: 'GrowthStart Inc.',
        contact_name: 'Alex Thompson',
        contact_email: 'a.thompson@growthstart.io',
        status: 'prospect',
        open_jobs: 0,
        created_by: user.id,
      },
    ];

    const { error: candError } = await supabase.from('candidates').insert(candidates);
    if (candError) {
      throw new ApiRouteError(500, 'SEED_CANDIDATES_FAILED', 'Could not seed candidates.', candError);
    }

    const { error: jobError } = await supabase.from('jobs').insert(jobs);
    if (jobError) {
      throw new ApiRouteError(500, 'SEED_JOBS_FAILED', 'Could not seed jobs.', jobError);
    }

    const { error: clientError } = await supabase.from('clients').insert(clients);
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
