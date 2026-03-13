'use client';

import { useEffect, useState, type DependencyList } from 'react';

import type { AppUser } from '@/context/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isMockMode, isSupabaseMode } from '@/lib/runtime-mode';
import type {
  AppProfile,
  CandidateRecord,
  ClientRecord,
  CompanyRecord,
  JobRecord,
  MasterResumeRecord,
  ModelRegistryRecord,
} from '@/lib/data/types';
import {
  createMockCandidate,
  deleteMockCandidate,
  deleteMockClient,
  getMockCandidate,
  getMockCompany,
  getMockMasterResume,
  getMockModelRegistry,
  getMockProfile,
  listMockCandidates,
  listMockClients,
  listMockJobs,
  saveMockCandidate,
  saveMockCompany,
  saveMockMasterResume,
  saveMockModelRegistry,
} from '@/lib/data/mock-store';

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

function useAsyncValue<T>(load: () => Promise<T>, deps: DependencyList): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isActive = true;

    setState((current) => ({ ...current, isLoading: true, error: null }));

    load()
      .then((data) => {
        if (!isActive) {
          return;
        }

        setState({ data, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState({
          data: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown data error'),
        });
      });

    return () => {
      isActive = false;
    };
  }, deps);

  return state;
}

async function requestApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.ok) {
    const message = body?.error?.message || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return body.data as T;
}

function toProfileRecord(row: any): AppProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    companyId: row.company_id,
  };
}

function toCompanyRecord(row: any): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo || undefined,
    website: row.website || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
  };
}

function toCandidateRecord(row: any): CandidateRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email || '',
    avatar: row.avatar || undefined,
    status: row.status,
    aiScore: row.ai_score ?? undefined,
    currentJob: row.current_job || undefined,
    currentCompany: row.current_company || undefined,
    appliedFor: row.applied_for || undefined,
    fullResumeText: row.full_resume_text || undefined,
    skills: row.skills || [],
    interviewNotes: (row.interview_notes as Record<string, string> | null) || {},
    interviewScores:
      (row.interview_scores as Record<string, number | null> | null) || {},
    aiSummary: row.ai_summary || undefined,
    interviewAnalysis: row.interview_analysis || undefined,
    lastInterviewAt: row.last_interview_at || undefined,
  };
}

function toJobRecord(row: any): JobRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    salary: row.salary || undefined,
    company: row.company || undefined,
    location: row.location || undefined,
    status: row.status,
    approval: row.approval,
    description: row.description || undefined,
    candidates: row.candidates_count ?? undefined,
    aiMatches: row.ai_matches ?? undefined,
  };
}

function toClientRecord(row: any): ClientRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    logo: row.logo || undefined,
    contactName: row.contact_name || undefined,
    contactEmail: row.contact_email || undefined,
    status: row.status,
    openJobs: row.open_jobs ?? undefined,
  };
}

function toMasterResumeRecord(row: any): MasterResumeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userTitle: row.user_title || 'My Master Resume',
    reformattedText: row.reformatted_text || '',
    fullName: row.full_name || undefined,
    currentJobTitle: row.current_job_title || undefined,
    contactInfo: (row.contact_info as Record<string, string | undefined> | null) || {},
    skills: row.skills || [],
    avatarUri: row.avatar_uri || undefined,
    missingInformation: row.missing_information || [],
    questions: row.questions || [],
    processedAt: row.processed_at || undefined,
  };
}

export function useCurrentProfile(user: AppUser | null) {
  return useAsyncValue<AppProfile | null>(async () => {
    if (!user?.id) {
      return null;
    }

    if (isMockMode()) {
      return getMockProfile({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      });
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return toProfileRecord(data);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };
  }, [user?.id, user?.email, user?.name, user?.role, user?.companyId]);
}

export function useCompany(companyId: string | undefined, refreshKey = 0) {
  return useAsyncValue<CompanyRecord | null>(async () => {
    if (!companyId) {
      return null;
    }

    if (isMockMode()) {
      return getMockCompany(companyId);
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) {
        throw error;
      }

      return toCompanyRecord(data);
    }

    return null;
  }, [companyId, refreshKey]);
}

export async function saveCompany(company: CompanyRecord) {
  if (isMockMode()) {
    saveMockCompany(company);
    return;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('companies').update({
      name: company.name,
      logo: company.logo || null,
      website: company.website || null,
      email: company.email || null,
      address: company.address || null,
      updated_at: new Date().toISOString(),
    }).eq('id', company.id);

    if (error) {
      throw error;
    }
  }
}

export function useCandidates(companyId: string | undefined, refreshKey = 0) {
  return useAsyncValue<CandidateRecord[]>(async () => {
    if (!companyId) {
      return [];
    }

    if (isMockMode()) {
      return listMockCandidates(companyId);
    }

    if (isSupabaseMode()) {
      const data = await requestApi<any[]>('/api/candidates');
      return (data || []).map(toCandidateRecord);
    }

    return [];
  }, [companyId, refreshKey]);
}

export function useCandidate(
  companyId: string | undefined,
  candidateId: string | undefined,
  refreshKey = 0
) {
  return useAsyncValue<CandidateRecord | null>(async () => {
    if (!companyId || !candidateId) {
      return null;
    }

    if (isMockMode()) {
      return getMockCandidate(companyId, candidateId);
    }

    if (isSupabaseMode()) {
      const data = await requestApi<any>(`/api/candidates/${candidateId}`);
      return toCandidateRecord(data);
    }

    return null;
  }, [companyId, candidateId, refreshKey]);
}

export async function saveCandidateInterview(
  companyId: string,
  candidateId: string,
  updates: Pick<CandidateRecord, 'interviewNotes' | 'interviewScores' | 'aiSummary'>
) {
  if (isMockMode()) {
    saveMockCandidate(companyId, candidateId, updates);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi(`/api/candidates/${candidateId}/interview`, {
      method: 'PATCH',
      body: JSON.stringify({
        interviewNotes: updates.interviewNotes || {},
        interviewScores: updates.interviewScores || {},
        aiSummary: updates.aiSummary || '',
      }),
    });
  }
}

export async function removeCandidate(companyId: string, candidateId: string) {
  if (isMockMode()) {
    deleteMockCandidate(companyId, candidateId);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi(`/api/candidates/${candidateId}`, {
      method: 'DELETE',
    });
  }
}

export function useJobs(companyId: string | undefined, refreshKey = 0) {
  return useAsyncValue<JobRecord[]>(async () => {
    if (!companyId) {
      return [];
    }

    if (isMockMode()) {
      return listMockJobs(companyId);
    }

    if (isSupabaseMode()) {
      const data = await requestApi<any[]>('/api/jobs');
      return (data || []).map(toJobRecord);
    }

    return [];
  }, [companyId, refreshKey]);
}

export function useClients(companyId: string | undefined, refreshKey = 0) {
  return useAsyncValue<ClientRecord[]>(async () => {
    if (!companyId) {
      return [];
    }

    if (isMockMode()) {
      return listMockClients(companyId);
    }

    if (isSupabaseMode()) {
      const data = await requestApi<any[]>('/api/clients');
      return (data || []).map(toClientRecord);
    }

    return [];
  }, [companyId, refreshKey]);
}

export async function removeClient(companyId: string, clientId: string) {
  if (isMockMode()) {
    deleteMockClient(companyId, clientId);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi(`/api/clients/${clientId}`, {
      method: 'DELETE',
    });
  }
}

export function useMasterResume(userId: string | undefined, refreshKey = 0) {
  return useAsyncValue<MasterResumeRecord | null>(async () => {
    if (!userId) {
      return null;
    }

    if (isMockMode()) {
      return getMockMasterResume(userId);
    }

    if (isSupabaseMode()) {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('master_resumes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toMasterResumeRecord(data) : null;
    }

    return null;
  }, [userId, refreshKey]);
}

export async function saveMasterResume(
  userId: string,
  updates: Omit<MasterResumeRecord, 'id' | 'userId'> & { id?: string }
) {
  if (isMockMode()) {
    saveMockMasterResume({
      id: updates.id,
      userId,
      ...updates,
    });
    return;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseBrowserClient();
    const existing = await supabase
      .from('master_resumes')
      .select('id')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      throw existing.error;
    }

    const payload = {
      id: existing.data?.id || updates.id,
      user_id: userId,
      user_title: updates.userTitle,
      reformatted_text: updates.reformattedText,
      full_name: updates.fullName || null,
      current_job_title: updates.currentJobTitle || null,
      contact_info: updates.contactInfo || {},
      skills: updates.skills || [],
      avatar_uri: updates.avatarUri || null,
      missing_information: updates.missingInformation || [],
      questions: updates.questions || [],
      processed_at: updates.processedAt || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('master_resumes').upsert(payload);
    if (error) {
      throw error;
    }
  }
}

export async function createCandidateFromResume(
  companyId: string,
  resume: Pick<
    MasterResumeRecord,
    'fullName' | 'currentJobTitle' | 'reformattedText' | 'skills' | 'contactInfo' | 'avatarUri'
  >
) {
  if (isMockMode()) {
    createMockCandidate({
      id: `cand-${Date.now()}`,
      companyId,
      name: resume.fullName || 'Unknown',
      email: resume.contactInfo?.email || '',
      currentJob: resume.currentJobTitle || '',
      currentCompany: '',
      status: 'Sourced',
      aiScore: 0,
      avatar: resume.avatarUri || '',
    });
    return;
  }

  if (isSupabaseMode()) {
    await requestApi('/api/candidates', {
      method: 'POST',
      body: JSON.stringify({
        name: resume.fullName || 'Unknown',
        email: resume.contactInfo?.email || '',
        currentJob: resume.currentJobTitle || '',
        currentCompany: '',
        status: 'Sourced',
        aiScore: 0,
        fullResumeText: resume.reformattedText,
        skills: resume.skills || [],
        contactInfo: resume.contactInfo || {},
        avatar: resume.avatarUri || undefined,
      }),
    });
  }
}

export async function saveCandidateInterviewAnalysis(
  companyId: string,
  candidateId: string,
  analysis: unknown
) {
  if (isMockMode()) {
    saveMockCandidate(companyId, candidateId, {
      interviewAnalysis: analysis as never,
    } as never);
    return;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('candidates')
      .update({
        interview_analysis: analysis,
        last_interview_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('id', candidateId);

    if (error) {
      throw error;
    }
  }
}

export function useModelRegistry(refreshKey = 0) {
  return useAsyncValue<ModelRegistryRecord | null>(async () => {
    if (isMockMode()) {
      return getMockModelRegistry();
    }

    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('recruitedai.model-registry');
      return raw ? (JSON.parse(raw) as ModelRegistryRecord) : null;
    }

    return null;
  }, [refreshKey]);
}

export async function saveModelRegistry(modelRegistry: ModelRegistryRecord) {
  if (isMockMode()) {
    saveMockModelRegistry(modelRegistry);
    return;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('recruitedai.model-registry', JSON.stringify(modelRegistry));
  }
}

export async function seedDemoData(user: AppUser) {
  const companyId = 'demo-agency-123';

  if (isMockMode()) {
    saveMockCompany({
      id: companyId,
      name: 'TalentSource Pro Agency',
      website: 'www.talentsource-pro.ai',
    });
    return companyId;
  }

  if (isSupabaseMode()) {
    const supabase = createSupabaseBrowserClient();

    const { error: companyError } = await supabase.from('companies').upsert({
      id: companyId,
      name: 'TalentSource Pro Agency',
      website: 'www.talentsource-pro.ai',
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    });
    if (companyError) {
      throw companyError;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ company_id: companyId, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (profileError) {
      throw profileError;
    }

    const candidates = [
      { id: 'cand-0', name: 'Elena Rodriguez', email: 'elena.r@example.com', status: 'Sourced', ai_score: 92, current_job: 'Senior UX Designer', current_company: 'Innovate Inc.' },
      { id: 'cand-1', name: 'Marcus Chen', email: 'marcus.c@example.com', status: 'Applied', ai_score: 88, current_job: 'Data Scientist', current_company: 'DataDriven Co.' },
      { id: 'cand-2', name: 'Aisha Khan', email: 'aisha.k@example.com', status: 'Interviewing', ai_score: 95, current_job: 'Backend Engineer', current_company: 'CloudNet' },
    ];
    const jobs = [
      { id: 'job-0', title: 'Senior Frontend Developer', salary: '$120k - $150k', location: 'San Francisco, CA', status: 'active', approval: 'approved', description: 'Modern React expert needed.' },
      { id: 'job-1', title: 'Data Scientist', salary: '$100k - $130k', location: 'Remote', status: 'pending', approval: 'pending', description: 'ML models focus.' },
    ];
    const clients = [
      { id: 'client-0', name: 'TechCorp', contact_name: 'John Doe', contact_email: 'john.doe@techcorp.com', status: 'active' },
      { id: 'client-1', name: 'Innovate LLC', contact_name: 'Jane Smith', contact_email: 'jane.s@innovatellc.com', status: 'active' },
    ];

    const { error: candError } = await supabase.from('candidates').upsert(
      candidates.map((item) => ({ ...item, company_id: companyId }))
    );
    if (candError) {
      throw candError;
    }

    const { error: jobError } = await supabase.from('jobs').upsert(
      jobs.map((item) => ({ ...item, company_id: companyId }))
    );
    if (jobError) {
      throw jobError;
    }

    const { error: clientError } = await supabase.from('clients').upsert(
      clients.map((item) => ({ ...item, company_id: companyId }))
    );
    if (clientError) {
      throw clientError;
    }

    return companyId;
  }

  return companyId;
}
