import type { Role } from '@/lib/roles';
import type { Currency } from '@/lib/currency';

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
  plan?: 'trial' | 'starter' | 'agency' | 'scale';
  currency?: Currency;
  trialStartedAt?: string;
  trialExpiresAt?: string;
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
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  noticePeriod?: string;
  salaryExpectation?: string;
  availabilityDate?: string;
  workAuthorization?: string;
  fullResumeText?: string;
  skills?: string[];
  yearsOfExperience?: number;
  education?: Array<{ degree: string; institution: string; year?: string }>;
  certifications?: string[];
  hasDegreeLevelEducation?: boolean;
  interviewNotes?: Record<string, string>;
  interviewScores?: Record<string, number | null>;
  aiSummary?: string;
  // Full assess-job-match output captured at save time (mirrors
  // AssessJobMatchOutput). Persisted to the candidates.match_details column.
  matchDetails?: {
    matchScore: number;
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    matchedSkills: string[];
    missingSkills: string[];
    experienceAlignment: string;
    educationNote: string;
  };
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
  clientId?: string;
  clientName?: string;
}

export interface ClientRecord {
  id: string;
  companyId: string;
  name: string;
  logo?: string;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  notes?: string;
  status: string;
  openJobs?: number;
}

export type SubmissionStatus =
  | 'submitted'
  | 'client_reviewing'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_extended'
  | 'offer_accepted'
  | 'placed'
  | 'rejected'
  | 'withdrew';

export interface SubmissionRecord {
  id: string;
  companyId: string;
  candidateId: string;
  jobId: string;
  clientId?: string;
  status: SubmissionStatus;
  submittedBy?: string;
  notes?: string;
  rejectionReason?: string;
  placementFee?: number;
  placementDate?: string;
  createdAt: string;
  updatedAt: string;
  candidateName?: string;
  jobTitle?: string;
  clientName?: string;
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
  /** Opt-in flag for the public /resume/[id] share link. Defaults to false. */
  isPublic?: boolean;
}

export interface ModelRegistryRecord {
  models: unknown[];
  updatedAt?: string;
  updatedBy?: string;
}
