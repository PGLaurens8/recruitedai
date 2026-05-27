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
      // --- Skills-first demo cohort ---
      // In skills-first mode, the no-degree veterans (Alex 91, James 88, Ruan 82)
      // outrank the degree-holders (Nomsa 79, Priya 54). That contrast is the demo moment.
      {
        company_id: companyId,
        name: 'Alex Mokoena',
        email: 'alex.mokoena@example.com',
        status: 'Interviewing',
        ai_score: 91,
        current_job: 'Senior Data Engineer',
        current_company: 'Independent',
        skills: ['Python', 'SQL', 'BigQuery', 'GCP', 'data pipelines', 'ETL', 'Looker Studio'],
        years_of_experience: 14,
        education: [],
        certifications: [],
        has_degree_level_education: false,
        ai_summary:
          'Senior data engineer with 14 years of production infrastructure experience. Built and operates data warehouses serving millions of rows daily. No formal degree — entirely skills-built career.',
      },
      {
        company_id: companyId,
        name: 'Priya Naidoo',
        email: 'priya.naidoo@example.com',
        status: 'Applied',
        ai_score: 54,
        current_job: 'Junior Business Analyst',
        current_company: 'Recent Graduate',
        skills: ['Excel', 'basic SQL', 'PowerPoint', 'report writing'],
        years_of_experience: 3,
        education: [
          { degree: 'BCom', institution: 'University of Cape Town', year: '2023' },
        ],
        certifications: [],
        has_degree_level_education: true,
        ai_summary:
          'Recent BCom graduate with strong academic record and foundational analytics exposure. Limited production experience but strong theoretical grounding.',
      },
      {
        company_id: companyId,
        name: 'James Ferreira',
        email: 'james.ferreira@example.com',
        status: 'Interviewing',
        ai_score: 88,
        current_job: 'Full Stack Engineer',
        current_company: 'Independent',
        skills: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Supabase', 'API design'],
        years_of_experience: 8,
        education: [],
        certifications: [
          'Google Cloud Professional Developer',
          'AWS Solutions Architect Associate',
          'Meta Frontend Developer Certificate',
        ],
        has_degree_level_education: false,
        ai_summary:
          'Self-taught full-stack engineer with 8 years of shipped products. Three major cloud certifications. Builds production SaaS independently.',
      },
      {
        company_id: companyId,
        name: 'Nomsa Dlamini',
        email: 'nomsa.dlamini@example.com',
        status: 'Applied',
        ai_score: 79,
        current_job: 'Machine Learning Engineer',
        current_company: 'ResearchLab',
        skills: ['Python', 'machine learning', 'TensorFlow', 'data analysis', 'R'],
        years_of_experience: 5,
        education: [
          { degree: 'BSc Computer Science', institution: 'University of the Witwatersrand', year: '2021' },
        ],
        certifications: [],
        has_degree_level_education: true,
        ai_summary:
          'BSc Computer Science graduate specialising in ML. Strong academic and project portfolio, transitioning from research to production engineering.',
      },
      {
        company_id: companyId,
        name: 'Ruan van der Merwe',
        email: 'ruan.vdm@example.com',
        status: 'Offer',
        ai_score: 82,
        current_job: 'Automation Specialist',
        current_company: 'Independent',
        skills: ['n8n', 'Zapier', 'Make', 'workflow automation', 'API integration', 'CRM systems', 'process optimisation'],
        years_of_experience: 11,
        education: [],
        certifications: [],
        has_degree_level_education: false,
        ai_summary:
          'Automation specialist with 11 years building production workflow systems for SMEs. No formal qualification — the systems speak for themselves.',
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

    // Upsert (not insert) so re-running the seed updates the existing demo set
    // instead of creating duplicates. Conflict targets are the per-company
    // unique indexes added in 202605270013_seed_unique_constraints.sql.
    const { error: candError } = await supabase
      .from('candidates')
      .upsert(candidates, { onConflict: 'company_id,email' });
    if (candError) {
      throw new ApiRouteError(500, 'SEED_CANDIDATES_FAILED', 'Could not seed candidates.', candError);
    }

    const { error: jobError } = await supabase
      .from('jobs')
      .upsert(jobs, { onConflict: 'company_id,title' });
    if (jobError) {
      throw new ApiRouteError(500, 'SEED_JOBS_FAILED', 'Could not seed jobs.', jobError);
    }

    const { error: clientError } = await supabase
      .from('clients')
      .upsert(clients, { onConflict: 'company_id,name' });
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
