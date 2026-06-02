import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRouteError } from '@/server/api/http';

const {
  requireUserAndCompanyRoleMock,
  enforceRateLimitMock,
  enforceTrialQuotaMock,
  reformatResumeMock,
  extractCVDataMock,
  assessJobMatchMock,
  analyzeInterviewMock,
} = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  enforceTrialQuotaMock: vi.fn(),
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
  // enforceTrialQuota hits Supabase to check plan/usage; stub it to a no-op so
  // the route logic under test runs without a live backend.
  enforceTrialQuota: enforceTrialQuotaMock,
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
    enforceTrialQuotaMock.mockResolvedValue(undefined);
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

  it('parse-cv fetches a storage URL and inlines it as a data URI for the flows', async () => {
    reformatResumeMock.mockResolvedValue({
      reformattedResume: 'Resume body',
      fullName: 'Jane Doe',
      currentJobTitle: 'Engineer',
      contactInfo: {},
      skills: [],
      missingInformation: [],
      questions: [],
    });
    extractCVDataMock.mockResolvedValue({ name: 'Jane Doe', role: 'Engineer' });

    const fileBytes = Buffer.from('PDF-BYTES');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: async () =>
        fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const signedUrl = 'https://project.supabase.co/storage/v1/object/sign/resumes/user-1/cv.pdf?token=abc';
      const response = await parseCvPost(
        postRequest('http://localhost/api/ai/parse-cv', { resumeDataUri: signedUrl })
      );
      const body = await response.json();

      const expectedDataUri = `data:application/pdf;base64,${fileBytes.toString('base64')}`;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        signedUrl,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      // Gemini cannot read the signed URL directly, so the flows must receive the inlined data URI.
      expect(reformatResumeMock).toHaveBeenCalledWith({ resumeDataUri: expectedDataUri });
      expect(extractCVDataMock).toHaveBeenCalledWith({ resumeDataUri: expectedDataUri });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('parse-cv returns 502 when the storage URL cannot be downloaded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const response = await parseCvPost(
        postRequest('http://localhost/api/ai/parse-cv', {
          resumeDataUri: 'https://project.supabase.co/storage/v1/object/sign/resumes/expired.pdf?token=x',
        })
      );
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('MEDIA_FETCH_FAILED');
      expect(reformatResumeMock).not.toHaveBeenCalled();
      expect(extractCVDataMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('parse-cv names the failing flow and skips the second when the first rejects', async () => {
    reformatResumeMock.mockRejectedValue(new Error('Gemini: model overloaded'));

    const response = await parseCvPost(
      postRequest('http://localhost/api/ai/parse-cv', { resumeDataUri: 'data:application/pdf;base64,abc' })
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('AI_FLOW_FAILED');
    expect(body.error.message).toContain('reformatResume');
    expect(body.error.message).toContain('Gemini: model overloaded');
    // Sequential execution: the second flow must not run once the first fails.
    expect(extractCVDataMock).not.toHaveBeenCalled();
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
