'use client';

import { useEffect, useState, type DependencyList } from 'react';

import type { AppUser } from '@/context/auth-context';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { dispatchTrialLimit, isTrialLimitResponse } from '@/lib/error-handler';
import { isMockMode, isSupabaseMode } from '@/lib/runtime-mode';
import type {
  AppProfile,
  CandidateRecord,
  ClientRecord,
  CompanyRecord,
  JobRecord,
  MasterResumeRecord,
  ModelRegistryRecord,
  SubmissionRecord,
  SubmissionStatus,
} from '@/lib/data/types';
import {
  createMockCandidate,
  createMockSubmission,
  deleteMockCandidate,
  deleteMockClient,
  deleteMockSubmission,
  getMockCandidate,
  getMockClient,
  getMockCompany,
  getMockJob,
  getMockMasterResume,
  getMockModelRegistry,
  getMockProfile,
  listMockCandidates,
  listMockClients,
  listMockJobs,
  listMockSubmissions,
  saveMockCandidate,
  saveMockClient,
  saveMockCompany,
  saveMockJob,
  saveMockMasterResume,
  setMockMasterResumeVisibility,
  saveMockModelRegistry,
  updateMockSubmission,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- generic hook accepts caller-provided deps array.
  }, deps);

  return state;
}

/**
 * Error thrown by {@link requestApi} when the API responds with a non-OK
 * envelope. Carries the HTTP `status` and the server `code` so callers can
 * distinguish, e.g., a genuine 404 from a 500/network failure.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
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
    const code = body?.error?.code;
    if (isTrialLimitResponse(response.status, code)) {
      const details = body?.error?.details as Record<string, unknown> | undefined;
      dispatchTrialLimit({
        feature: details?.feature as string | undefined,
        plan: details?.plan as string | undefined,
        limit: details?.limit as number | undefined,
        current: details?.current as number | undefined,
        message,
      });
    }
    throw new ApiClientError(message, response.status, code);
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
    plan: row.plan || undefined,
    currency: row.currency === 'USD' || row.currency === 'ZAR' ? row.currency : undefined,
    trialStartedAt: row.trial_started_at || undefined,
    trialExpiresAt: row.trial_expires_at || undefined,
  };
}

export function toCandidateRecord(row: any): CandidateRecord {
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
    phone: row.phone || undefined,
    linkedinUrl: row.linkedin_url || undefined,
    location: row.location || undefined,
    noticePeriod: row.notice_period || undefined,
    salaryExpectation: row.salary_expectation || undefined,
    availabilityDate: row.availability_date || undefined,
    workAuthorization: row.work_authorization || undefined,
    fullResumeText: row.full_resume_text || undefined,
    skills: row.skills || [],
    yearsOfExperience: row.years_of_experience ?? undefined,
    education: row.education || undefined,
    certifications: row.certifications || undefined,
    hasDegreeLevelEducation: row.has_degree_level_education ?? undefined,
    interviewNotes: (row.interview_notes as Record<string, string> | null) || {},
    interviewScores:
      (row.interview_scores as Record<string, number | null> | null) || {},
    aiSummary: row.ai_summary || undefined,
    matchDetails: (row.match_details as CandidateRecord['matchDetails']) || undefined,
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
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
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
    website: row.website || undefined,
    notes: row.notes || undefined,
    status: row.status,
    openJobs: row.open_jobs ?? undefined,
  };
}

function toSubmissionRecord(row: any): SubmissionRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    candidateId: row.candidate_id,
    jobId: row.job_id,
    clientId: row.client_id || undefined,
    status: row.status as SubmissionStatus,
    submittedBy: row.submitted_by || undefined,
    notes: row.notes || undefined,
    rejectionReason: row.rejection_reason || undefined,
    placementFee: row.placement_fee != null ? Number(row.placement_fee) : undefined,
    placementDate: row.placement_date || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    candidateName: row.candidate_name || row.candidate?.name || undefined,
    jobTitle: row.job_title || row.job?.title || undefined,
    clientName: row.client_name || row.client?.name || undefined,
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
    isPublic: Boolean(row.is_public),
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
      const data = await requestApi<any>('/api/company');
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
    await requestApi('/api/company', {
      method: 'PATCH',
      body: JSON.stringify({
        name: company.name,
        logo: company.logo || '',
        website: company.website || '',
        email: company.email || '',
        address: company.address || '',
        ...(company.currency ? { currency: company.currency } : {}),
      }),
    });
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
      const data = await requestApi<any[]>(`/api/companies/${companyId}/candidates`);
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
      const data = await requestApi<any>(`/api/companies/${companyId}/candidates/${candidateId}`);
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
    await requestApi(`/api/companies/${companyId}/candidates/${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        interviewNotes: updates.interviewNotes || {},
        interviewScores: updates.interviewScores || {},
        aiSummary: updates.aiSummary || '',
      }),
    });
  }
}

/** Fields editable inline from the candidate list (status) and detail page (contact details). */
export type CandidateInlineUpdate = Partial<
  Pick<
    CandidateRecord,
    | 'status'
    | 'phone'
    | 'linkedinUrl'
    | 'location'
    | 'noticePeriod'
    | 'salaryExpectation'
    | 'availabilityDate'
    | 'workAuthorization'
  >
>;

export async function updateCandidate(
  companyId: string,
  candidateId: string,
  updates: CandidateInlineUpdate,
): Promise<CandidateRecord | null> {
  if (isMockMode()) {
    saveMockCandidate(companyId, candidateId, updates);
    return getMockCandidate(companyId, candidateId);
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>(`/api/candidates/${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return toCandidateRecord(data);
  }

  return null;
}

export async function removeCandidate(companyId: string, candidateId: string) {
  if (isMockMode()) {
    deleteMockCandidate(companyId, candidateId);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi(`/api/companies/${companyId}/candidates/${candidateId}`, {
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

export interface JobUpdate {
  title?: string;
  description?: string | null;
  location?: string | null;
  salary?: string | null;
  status?: string;
  // `null` explicitly unlinks the job from its client.
  clientId?: string | null;
}

export async function updateJob(
  companyId: string,
  jobId: string,
  updates: JobUpdate,
): Promise<JobRecord | null> {
  if (isMockMode()) {
    const patch: Partial<JobRecord> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description ?? undefined;
    if (updates.location !== undefined) patch.location = updates.location ?? undefined;
    if (updates.salary !== undefined) patch.salary = updates.salary ?? undefined;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.clientId !== undefined) {
      // Keep the denormalised clientName/company in sync when the link changes so
      // the detail/list views stay consistent without a re-fetch round-trip.
      const client = updates.clientId
        ? listMockClients(companyId).find((c) => c.id === updates.clientId)
        : undefined;
      patch.clientId = updates.clientId ?? undefined;
      patch.clientName = client?.name;
      patch.company = client?.name ?? patch.company;
    }
    saveMockJob(companyId, jobId, patch);
    return getMockJob(companyId, jobId);
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return toJobRecord(data);
  }

  return null;
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
    await requestApi(`/api/companies/${companyId}/clients/${clientId}`, {
      method: 'DELETE',
    });
  }
}

export function useClient(
  companyId: string | undefined,
  clientId: string | undefined,
  refreshKey = 0,
) {
  return useAsyncValue<ClientRecord | null>(async () => {
    if (!companyId || !clientId) {
      return null;
    }

    if (isMockMode()) {
      return getMockClient(companyId, clientId);
    }

    if (isSupabaseMode()) {
      const data = await requestApi<any>(`/api/clients/${clientId}`);
      return toClientRecord(data);
    }

    return null;
  }, [companyId, clientId, refreshKey]);
}

export async function updateClient(
  companyId: string,
  clientId: string,
  updates: Partial<Pick<ClientRecord, 'name' | 'contactName' | 'contactEmail' | 'website' | 'notes' | 'status'>>,
): Promise<ClientRecord | null> {
  if (isMockMode()) {
    saveMockClient(companyId, clientId, updates);
    return getMockClient(companyId, clientId);
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>(`/api/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return toClientRecord(data);
  }

  return null;
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
      const data = await requestApi<any | null>('/api/master-resume');
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
    await requestApi('/api/master-resume', {
      method: 'PUT',
      body: JSON.stringify({
        id: updates.id,
        userTitle: updates.userTitle,
        reformattedText: updates.reformattedText,
        fullName: updates.fullName || '',
        currentJobTitle: updates.currentJobTitle || '',
        contactInfo: updates.contactInfo || {},
        skills: updates.skills || [],
        avatarUri: updates.avatarUri || '',
        missingInformation: updates.missingInformation || [],
        questions: updates.questions || [],
        processedAt: updates.processedAt || '',
      }),
    });
  }
}

/**
 * Toggle the public share visibility of the current user's master resume.
 * The only path that changes is_public — never touched by a normal resume save.
 */
export async function setMasterResumeVisibility(userId: string, isPublic: boolean) {
  if (isMockMode()) {
    setMockMasterResumeVisibility(userId, isPublic);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi('/api/master-resume/visibility', {
      method: 'POST',
      body: JSON.stringify({ isPublic }),
    });
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
    await requestApi(`/api/companies/${companyId}/candidates`, {
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

export async function createCandidate(
  companyId: string,
  input: {
    name: string;
    email?: string;
    phone?: string;
    currentJob?: string;
    currentCompany?: string;
    status?: string;
    notes?: string;
  },
): Promise<CandidateRecord> {
  // Phone maps to the dedicated `phone` column (surfaced on the Contact Details
  // card). Email/notes also ride along in the contact_info JSONB blob for the
  // legacy contact view.
  const contactInfo: Record<string, string> = {};
  if (input.email) contactInfo.email = input.email;
  if (input.phone) contactInfo.phone = input.phone;
  if (input.notes) contactInfo.notes = input.notes;

  if (isMockMode()) {
    const record: CandidateRecord = {
      id: `cand-${Date.now()}`,
      companyId,
      name: input.name,
      email: input.email || '',
      status: input.status || 'Sourced',
      currentJob: input.currentJob || undefined,
      currentCompany: input.currentCompany || undefined,
      phone: input.phone || undefined,
    };
    createMockCandidate(record);
    return record;
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>('/api/candidates', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        email: input.email || '',
        status: input.status || 'Sourced',
        currentJob: input.currentJob || undefined,
        currentCompany: input.currentCompany || undefined,
        phone: input.phone || undefined,
        contactInfo,
      }),
    });
    return toCandidateRecord(data);
  }

  throw new Error('Unsupported runtime mode for createCandidate.');
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
    await requestApi(`/api/companies/${companyId}/candidates/${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        interviewAnalysis: analysis,
        lastInterviewAt: new Date().toISOString(),
      }),
    });
  }
}

export function useSubmissions(
  companyId: string | undefined,
  filters?: { jobId?: string; candidateId?: string },
  refreshKey = 0,
) {
  const jobId = filters?.jobId;
  const candidateId = filters?.candidateId;
  return useAsyncValue<SubmissionRecord[]>(async () => {
    if (!companyId) {
      return [];
    }

    if (isMockMode()) {
      return listMockSubmissions(companyId, { jobId, candidateId });
    }

    if (isSupabaseMode()) {
      const query = new URLSearchParams();
      if (jobId) query.set('jobId', jobId);
      if (candidateId) query.set('candidateId', candidateId);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const data = await requestApi<any[]>(`/api/submissions${suffix}`);
      return (data || []).map(toSubmissionRecord);
    }

    return [];
  }, [companyId, jobId, candidateId, refreshKey]);
}

export function useJobSubmissions(
  companyId: string | undefined,
  jobId: string | undefined,
  refreshKey = 0,
) {
  return useSubmissions(companyId, jobId ? { jobId } : undefined, refreshKey);
}

export async function createSubmission(input: {
  companyId: string;
  candidateId: string;
  jobId: string;
  notes?: string;
}): Promise<SubmissionRecord> {
  if (isMockMode()) {
    return createMockSubmission({
      companyId: input.companyId,
      candidateId: input.candidateId,
      jobId: input.jobId,
      notes: input.notes,
    });
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify({
        candidateId: input.candidateId,
        jobId: input.jobId,
        notes: input.notes || undefined,
      }),
    });
    return toSubmissionRecord(data);
  }

  throw new Error('Unsupported runtime mode for createSubmission.');
}

export async function updateSubmission(
  companyId: string,
  submissionId: string,
  updates: {
    status?: SubmissionStatus;
    notes?: string | null;
    rejectionReason?: string | null;
    placementFee?: number | null;
    placementDate?: string | null;
  },
): Promise<SubmissionRecord | null> {
  if (isMockMode()) {
    return updateMockSubmission(companyId, submissionId, {
      status: updates.status,
      notes: updates.notes ?? undefined,
      rejectionReason: updates.rejectionReason ?? undefined,
      placementFee: updates.placementFee ?? undefined,
      placementDate: updates.placementDate ?? undefined,
    });
  }

  if (isSupabaseMode()) {
    const data = await requestApi<any>(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return toSubmissionRecord(data);
  }

  return null;
}

export async function deleteSubmission(companyId: string, submissionId: string) {
  if (isMockMode()) {
    deleteMockSubmission(companyId, submissionId);
    return;
  }

  if (isSupabaseMode()) {
    await requestApi(`/api/submissions/${submissionId}`, {
      method: 'DELETE',
    });
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
    const result = await requestApi<{ companyId: string }>('/api/seed', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
    return result.companyId;
  }

  return companyId;
}
