import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRouteError } from '@/server/api/http';

const {
  requireUserAndCompanyRoleMock,
  enforceRateLimitMock,
  reformatResumeMock,
  extractCVDataMock,
  assessJobMatchMock,
  analyzeInterviewMock,
} = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  reformatResumeMock: vi.fn(),
  extractCVDataMock: vi.fn(),
  assessJobMatchMock: vi.fn(),
  analyzeInterviewMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

vi.mock('@/server/api/rate-limit', () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock('@/ai/flows/reformat-resume', () => ({
  reformatResume: reformatResumeMock,
}));

vi.mock('@/ai/flows/extract-cv-data', () => ({
  extractCVData: extractCVDataMock,
}));

vi.mock('@/ai/flows/assess-job-match', () => ({
  assessJobMatch: assessJobMatchMock,
}));

vi.mock('@/ai/flows/analyze-interview', () => ({
  analyzeInterview: analyzeInterviewMock,
}));

import { POST as parseCvPost } from './parse-cv/route';
import { POST as matchJobPost } from './match-job/route';
import { POST as interviewAnalyzePost } from './interview-analyze/route';

function postRequest(url: string, payload: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

describe('AI API route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserAndCompanyRoleMock.mockResolvedValue({ userId: 'user-1', companyId: 'company-1' });
    enforceRateLimitMock.mockReturnValue({ allowed: true, remaining: 10, retryAfterSeconds: 60 });
  });

  it('parse-cv returns parsed data for valid input', async () => {
    reformatResumeMock.mockResolvedValue({
      reformattedResume: 'Resume body',
      fullName: 'Jane Doe',
      currentJobTitle: 'Engineer',
      contactInfo: {},
      skills: [],
      missingInformation: [],
      questions: [],
    });
    extractCVDataMock.mockResolvedValue({
      name: 'Jane Doe',
      role: 'Engineer',
      noticePeriod: '30 days',
      salary: '$100k',
      pcSpecs: 'N/A',
      summary: 'Strong profile.',
    });

    const response = await parseCvPost(
      postRequest('http://localhost/api/ai/parse-cv', { resumeDataUri: 'data:application/pdf;base64,abc' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(reformatResumeMock).toHaveBeenCalledWith({ resumeDataUri: 'data:application/pdf;base64,abc' });
    expect(extractCVDataMock).toHaveBeenCalledWith({ resumeDataUri: 'data:application/pdf;base64,abc' });
    expect(enforceRateLimitMock).toHaveBeenCalled();
  });

  it('parse-cv returns 400 for invalid payload', async () => {
    const response = await parseCvPost(postRequest('http://localhost/api/ai/parse-cv', {}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('match-job returns 400 when job spec input is missing', async () => {
    const response = await matchJobPost(
      postRequest('http://localhost/api/ai/match-job', {
        masterResumeDataUri: 'data:text/plain;base64,abc',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('interview-analyze forwards transcript and custom questions', async () => {
    analyzeInterviewMock.mockResolvedValue({
      interviewerName: 'Alex',
      candidateName: 'Sam',
      overallAssessment: 'Strong communication and delivery.',
      questionsAnswers: [
        { question: 'Tell me about your background?', answer: '5 years experience.' },
      ],
    });

    const response = await interviewAnalyzePost(
      postRequest('http://localhost/api/ai/interview-analyze', {
        transcript: 'Interviewer: Tell me about your background. Candidate: 5 years experience.',
        questions: ['Tell me about your background?'],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(analyzeInterviewMock).toHaveBeenCalledWith({
      transcript: 'Interviewer: Tell me about your background. Candidate: 5 years experience.',
      questions: ['Tell me about your background?'],
    });
  });

  it('returns 429 when rate limiter blocks request', async () => {
    enforceRateLimitMock.mockImplementation(() => {
      throw new ApiRouteError(429, 'RATE_LIMITED', 'Too many requests.');
    });

    const response = await parseCvPost(
      postRequest('http://localhost/api/ai/parse-cv', { resumeDataUri: 'data:application/pdf;base64,abc' })
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});
