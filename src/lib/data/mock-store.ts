'use client';

import type {
  AppProfile,
  CandidateRecord,
  ClientRecord,
  CompanyRecord,
  MasterResumeRecord,
  ModelRegistryRecord,
  JobRecord,
  SubmissionRecord,
  SubmissionStatus,
} from '@/lib/data/types';

interface MockDatabase {
  profiles: AppProfile[];
  companies: CompanyRecord[];
  candidates: CandidateRecord[];
  jobs: JobRecord[];
  clients: ClientRecord[];
  masterResumes: MasterResumeRecord[];
  submissions: SubmissionRecord[];
  modelRegistry: ModelRegistryRecord | null;
}

const MOCK_DB_KEY = 'recruitedai.mock-db';
const DEFAULT_COMPANY_ID = 'mock-company';

const seedDatabase: MockDatabase = {
  profiles: [
    {
      id: 'mock-user',
      email: 'demo@recruitedai.com',
      name: 'Demo Recruiter',
      role: 'Recruiter',
      companyId: DEFAULT_COMPANY_ID,
    },
  ],
  companies: [
    {
      id: DEFAULT_COMPANY_ID,
      name: 'Demo Talent Partners',
      website: 'https://demo.recruitedai.local',
      email: 'hello@demotalentpartners.com',
      address: 'Remote',
    },
  ],
  candidates: [
    {
      id: 'cand-1',
      companyId: DEFAULT_COMPANY_ID,
      name: 'Ava Thompson',
      email: 'ava.thompson@example.com',
      status: 'Interviewing',
      aiScore: 91,
      currentJob: 'Senior Product Designer',
      currentCompany: 'Northstar Labs',
      appliedFor: 'Lead Product Designer',
      interviewNotes: {},
      interviewScores: {},
      aiSummary: '',
    },
    {
      id: 'cand-2',
      companyId: DEFAULT_COMPANY_ID,
      name: 'Marcus Chen',
      email: 'marcus.chen@example.com',
      status: 'Sourced',
      aiScore: 84,
      currentJob: 'Frontend Engineer',
      currentCompany: 'Lattice Peak',
      appliedFor: 'Senior Frontend Engineer',
      interviewNotes: {},
      interviewScores: {},
      aiSummary: '',
    },
  ],
  jobs: [
    {
      id: 'job-1',
      companyId: DEFAULT_COMPANY_ID,
      title: 'Senior Frontend Engineer',
      salary: '$140k-$170k',
      company: 'ClientCo',
      location: 'Remote, US',
      status: 'active',
      approval: 'approved',
      candidates: 7,
      aiMatches: 4,
    },
    {
      id: 'job-2',
      companyId: DEFAULT_COMPANY_ID,
      title: 'Lead Product Designer',
      salary: '$135k-$160k',
      company: 'Northstar Labs',
      location: 'New York, NY',
      status: 'pending',
      approval: 'pending',
      candidates: 3,
      aiMatches: 2,
    },
  ],
  clients: [
    {
      id: 'client-1',
      companyId: DEFAULT_COMPANY_ID,
      name: 'Northstar Labs',
      contactName: 'Helen Brooks',
      contactEmail: 'helen@northstarlabs.com',
      status: 'active',
      openJobs: 2,
    },
    {
      id: 'client-2',
      companyId: DEFAULT_COMPANY_ID,
      name: 'ClientCo',
      contactName: 'Jordan Reed',
      contactEmail: 'jordan@clientco.com',
      status: 'prospect',
      openJobs: 1,
    },
  ],
  masterResumes: [],
  submissions: [],
  modelRegistry: null,
};

function readDatabase(): MockDatabase {
  if (typeof window === 'undefined') {
    return seedDatabase;
  }

  const raw = window.localStorage.getItem(MOCK_DB_KEY);
  if (!raw) {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(seedDatabase));
    return seedDatabase;
  }

  try {
    const parsed = JSON.parse(raw) as MockDatabase;
    // Backfill collections introduced after the cached DB was first written, so
    // older mock-mode sessions don't crash on .filter/.find against undefined.
    if (!Array.isArray(parsed.submissions)) {
      parsed.submissions = [];
    }
    return parsed;
  } catch {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(seedDatabase));
    return seedDatabase;
  }
}

function writeDatabase(database: MockDatabase) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(database));
}

function ensureProfile(database: MockDatabase, profile: AppProfile) {
  const existingProfile = database.profiles.find((item) => item.id === profile.id);
  if (!existingProfile) {
    database.profiles.push(profile);
  }

  const existingCompany = database.companies.find((item) => item.id === profile.companyId);
  if (!existingCompany) {
    database.companies.push({
      id: profile.companyId,
      name: `${profile.name}'s Workspace`,
    });
  }
}

export function getMockProfile(profile: AppProfile) {
  const database = readDatabase();
  ensureProfile(database, profile);
  writeDatabase(database);
  return database.profiles.find((item) => item.id === profile.id) || profile;
}

export function getMockCompany(companyId: string) {
  const database = readDatabase();
  return database.companies.find((item) => item.id === companyId) || null;
}

export function saveMockCompany(company: CompanyRecord) {
  const database = readDatabase();
  const index = database.companies.findIndex((item) => item.id === company.id);
  if (index >= 0) {
    database.companies[index] = { ...database.companies[index], ...company };
  } else {
    database.companies.push(company);
  }
  writeDatabase(database);
}

export function listMockCandidates(companyId: string) {
  return readDatabase().candidates.filter((item) => item.companyId === companyId);
}

export function getMockCandidate(companyId: string, candidateId: string) {
  return (
    readDatabase().candidates.find(
      (item) => item.companyId === companyId && item.id === candidateId
    ) || null
  );
}

export function saveMockCandidate(
  companyId: string,
  candidateId: string,
  updates: Partial<CandidateRecord>
) {
  const database = readDatabase();
  const index = database.candidates.findIndex(
    (item) => item.companyId === companyId && item.id === candidateId
  );

  if (index >= 0) {
    database.candidates[index] = { ...database.candidates[index], ...updates };
    writeDatabase(database);
  }
}

export function createMockCandidate(candidate: CandidateRecord) {
  const database = readDatabase();
  database.candidates.push(candidate);
  writeDatabase(database);
}

export function deleteMockCandidate(companyId: string, candidateId: string) {
  const database = readDatabase();
  database.candidates = database.candidates.filter(
    (item) => !(item.companyId === companyId && item.id === candidateId)
  );
  writeDatabase(database);
}

export function listMockJobs(companyId: string) {
  return readDatabase().jobs.filter((item) => item.companyId === companyId);
}

export function listMockClients(companyId: string) {
  return readDatabase().clients.filter((item) => item.companyId === companyId);
}

export function deleteMockClient(companyId: string, clientId: string) {
  const database = readDatabase();
  database.clients = database.clients.filter(
    (item) => !(item.companyId === companyId && item.id === clientId)
  );
  writeDatabase(database);
}

export function getMockMasterResume(userId: string) {
  return readDatabase().masterResumes.find((item) => item.userId === userId) || null;
}

export function getMockMasterResumeById(resumeId: string) {
  return readDatabase().masterResumes.find((item) => item.id === resumeId) || null;
}

export function saveMockMasterResume(resume: Omit<MasterResumeRecord, 'id'> & { id?: string }) {
  const database = readDatabase();
  const existingIndex = database.masterResumes.findIndex((item) => item.userId === resume.userId);
  const nextRecord: MasterResumeRecord = {
    id: resume.id || `mr-${resume.userId}`,
    userId: resume.userId,
    userTitle: resume.userTitle,
    reformattedText: resume.reformattedText,
    fullName: resume.fullName,
    currentJobTitle: resume.currentJobTitle,
    contactInfo: resume.contactInfo || {},
    skills: resume.skills || [],
    avatarUri: resume.avatarUri,
    missingInformation: resume.missingInformation || [],
    questions: resume.questions || [],
    processedAt: resume.processedAt,
  };

  if (existingIndex >= 0) {
    database.masterResumes[existingIndex] = {
      ...database.masterResumes[existingIndex],
      ...nextRecord,
    };
  } else {
    database.masterResumes.push(nextRecord);
  }

  writeDatabase(database);
}

function enrichSubmission(
  database: MockDatabase,
  submission: SubmissionRecord,
): SubmissionRecord {
  const candidate = database.candidates.find((c) => c.id === submission.candidateId);
  const job = database.jobs.find((j) => j.id === submission.jobId);
  const client = submission.clientId
    ? database.clients.find((c) => c.id === submission.clientId)
    : undefined;
  return {
    ...submission,
    candidateName: candidate?.name,
    jobTitle: job?.title,
    clientName: client?.name,
  };
}

export function listMockSubmissions(
  companyId: string,
  filters?: { jobId?: string; candidateId?: string },
) {
  const database = readDatabase();
  return database.submissions
    .filter((item) => {
      if (item.companyId !== companyId) return false;
      if (filters?.jobId && item.jobId !== filters.jobId) return false;
      if (filters?.candidateId && item.candidateId !== filters.candidateId) return false;
      return true;
    })
    .map((item) => enrichSubmission(database, item))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function createMockSubmission(input: {
  companyId: string;
  candidateId: string;
  jobId: string;
  status?: SubmissionStatus;
  notes?: string;
  submittedBy?: string;
}): SubmissionRecord {
  const database = readDatabase();
  const duplicate = database.submissions.find(
    (s) =>
      s.companyId === input.companyId &&
      s.candidateId === input.candidateId &&
      s.jobId === input.jobId,
  );
  if (duplicate) {
    throw new Error('This candidate has already been submitted to this job.');
  }
  const job = database.jobs.find((j) => j.id === input.jobId);
  const now = new Date().toISOString();
  const record: SubmissionRecord = {
    id: `sub-${Date.now()}`,
    companyId: input.companyId,
    candidateId: input.candidateId,
    jobId: input.jobId,
    clientId: job?.clientId,
    status: input.status || 'submitted',
    submittedBy: input.submittedBy,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  database.submissions.push(record);
  writeDatabase(database);
  return enrichSubmission(database, record);
}

export function updateMockSubmission(
  companyId: string,
  submissionId: string,
  updates: Partial<SubmissionRecord>,
): SubmissionRecord | null {
  const database = readDatabase();
  const index = database.submissions.findIndex(
    (item) => item.companyId === companyId && item.id === submissionId,
  );
  if (index < 0) return null;
  const next: SubmissionRecord = {
    ...database.submissions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.status === 'placed' && !updates.placementDate && !next.placementDate) {
    next.placementDate = new Date().toISOString();
  }
  database.submissions[index] = next;
  writeDatabase(database);
  return enrichSubmission(database, next);
}

export function deleteMockSubmission(companyId: string, submissionId: string) {
  const database = readDatabase();
  const submission = database.submissions.find(
    (item) => item.companyId === companyId && item.id === submissionId,
  );
  if (!submission) {
    throw new Error('Submission not found.');
  }
  if (submission.status !== 'submitted') {
    throw new Error(
      'Submission has progressed past the initial stage. Use status "withdrew" to mark it inactive instead.',
    );
  }
  database.submissions = database.submissions.filter(
    (item) => !(item.companyId === companyId && item.id === submissionId),
  );
  writeDatabase(database);
}

export function getMockModelRegistry() {
  return readDatabase().modelRegistry;
}

export function saveMockModelRegistry(modelRegistry: ModelRegistryRecord) {
  const database = readDatabase();
  database.modelRegistry = modelRegistry;
  writeDatabase(database);
}
