import type { Role } from '@/lib/roles';

export interface AppProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  email?: string;
  address?: string;
}

export interface CandidateRecord {
  id: string;
  companyId: string;
  name: string;
  email: string;
  avatar?: string;
  status: string;
  aiScore?: number;
  currentJob?: string;
  currentCompany?: string;
  appliedFor?: string;
  fullResumeText?: string;
  skills?: string[];
  interviewNotes?: Record<string, string>;
  interviewScores?: Record<string, number | null>;
  aiSummary?: string;
  interviewAnalysis?: unknown;
  lastInterviewAt?: string;
}

export interface JobRecord {
  id: string;
  companyId: string;
  title: string;
  salary?: string;
  company?: string;
  location?: string;
  status: string;
  approval: string;
  description?: string;
  candidates?: number;
  aiMatches?: number;
}

export interface ClientRecord {
  id: string;
  companyId: string;
  name: string;
  logo?: string;
  contactName?: string;
  contactEmail?: string;
  status: string;
  openJobs?: number;
}

export interface MasterResumeRecord {
  id: string;
  userId: string;
  userTitle: string;
  reformattedText: string;
  fullName?: string;
  currentJobTitle?: string;
  contactInfo?: Record<string, string | undefined>;
  skills: string[];
  avatarUri?: string;
  missingInformation: string[];
  questions: string[];
  processedAt?: string;
}

export interface ModelRegistryRecord {
  models: unknown[];
  updatedAt?: string;
  updatedBy?: string;
}
