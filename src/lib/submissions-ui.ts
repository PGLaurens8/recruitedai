import type { SubmissionStatus } from '@/lib/data/types';

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'Submitted',
  client_reviewing: 'Client Reviewing',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_extended: 'Offer Extended',
  offer_accepted: 'Offer Accepted',
  placed: 'Placed',
  rejected: 'Rejected',
  withdrew: 'Withdrew',
};

export const SUBMISSION_STATUS_BADGE_CLASS: Record<SubmissionStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  client_reviewing: 'bg-purple-100 text-purple-800 border-purple-200',
  interview_scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
  interview_completed: 'bg-amber-100 text-amber-800 border-amber-200',
  offer_extended: 'bg-orange-100 text-orange-800 border-orange-200',
  offer_accepted: 'bg-green-100 text-green-800 border-green-200',
  placed: 'bg-green-200 text-green-900 border-green-300 font-bold',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrew: 'bg-gray-100 text-gray-700 border-gray-200',
};

export const SUBMISSION_STATUS_ORDER: SubmissionStatus[] = [
  'submitted',
  'client_reviewing',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'offer_accepted',
  'placed',
  'rejected',
  'withdrew',
];
