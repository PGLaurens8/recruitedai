import { beforeEach, describe, expect, it, vi } from 'vitest';

// This test proves the full round-trip that the "save to Talent Pool" flow
// depends on: the enrichment + AI-match fields survive the POST /api/candidates
// write (mapped to the right snake_case columns) AND survive the read mapping
// back into the CandidateRecord the detail page renders. Before this change the
// fields were silently stripped by the route's Zod schema.

const { requireUserAndCompanyRoleMock } = vi.hoisted(() => ({
  requireUserAndCompanyRoleMock: vi.fn(),
}));

vi.mock('@/server/api/auth', () => ({
  requireUserAndCompany: vi.fn(),
  requireUserAndCompanyRole: requireUserAndCompanyRoleMock,
}));

// Idempotency wrapper is out of scope here: run the execute() body directly and
// echo its result, and treat every request as key-less.
vi.mock('@/server/api/idempotency', () => ({
  readIdempotencyKey: () => undefined,
  runIdempotent: async ({ execute }: { execute: () => Promise<unknown> }) => execute(),
}));

import { POST } from './route';
import { toCandidateRecord } from '@/lib/data/hooks';

// Minimal supabase mock: `.from('candidates').insert(row).select('*').single()`
// captures the inserted row and echoes it back with a generated id, exactly as
// Postgres would return the persisted row.
function createSupabaseMock() {
  let insertedRow: Record<string, unknown> | null = null;

  const builder = {
    insert(row: Record<string, unknown>) {
      insertedRow = row;
      return this;
    },
    select() {
      return this;
    },
    async single() {
      return { data: { id: 'cand-generated', ...insertedRow }, error: null };
    },
  };

  return {
    client: { from: () => builder },
    getInsertedRow: () => insertedRow,
  };
}

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/candidates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FULL_PAYLOAD = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  status: 'Sourced' as const,
  currentJob: 'Senior Engineer',
  skills: ['TypeScript', 'Go'],
  fullResumeText: 'Full resume body…',
  contactInfo: { email: 'jane@example.com', phone: '+27 11 555 0000' },
  yearsOfExperience: 8,
  education: [{ degree: 'BSc Computer Science', institution: 'UCT', year: '2016' }],
  certifications: ['AWS Solutions Architect'],
  hasDegreeLevelEducation: true,
  aiSummary: 'Strong backend engineer with cloud experience.',
  aiScore: 82,
  matchDetails: {
    matchScore: 82,
    summary: 'Strong fit for the role.',
    strengths: ['Backend depth'],
    areasForImprovement: ['More frontend exposure'],
    matchedSkills: ['TypeScript', 'Go'],
    missingSkills: ['React'],
    experienceAlignment: '8 years aligns well with the senior requirement.',
    educationNote: 'Degree present and relevant.',
  },
};

describe('POST /api/candidates — enrichment + match persistence', () => {
  let supabase: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    supabase = createSupabaseMock();
    requireUserAndCompanyRoleMock.mockResolvedValue({
      supabase: supabase.client,
      companyId: 'company-1',
      userId: 'user-1',
    });
  });

  it('maps enrichment + match fields to their snake_case columns on insert', async () => {
    const response = await POST(buildRequest(FULL_PAYLOAD));
    expect(response.status).toBe(201);

    const row = supabase.getInsertedRow();
    expect(row).toMatchObject({
      company_id: 'company-1',
      years_of_experience: 8,
      education: FULL_PAYLOAD.education,
      certifications: ['AWS Solutions Architect'],
      has_degree_level_education: true,
      ai_summary: 'Strong backend engineer with cloud experience.',
      ai_score: 82,
      match_details: FULL_PAYLOAD.matchDetails,
    });
  });

  it('round-trips through toCandidateRecord into the record the detail page reads', async () => {
    const response = await POST(buildRequest(FULL_PAYLOAD));
    const body = await response.json();

    // The persisted row → the exact CandidateRecord the detail page consumes.
    const record = toCandidateRecord(body.data);

    expect(record.yearsOfExperience).toBe(8);
    expect(record.education).toEqual(FULL_PAYLOAD.education);
    expect(record.certifications).toEqual(['AWS Solutions Architect']);
    expect(record.hasDegreeLevelEducation).toBe(true);
    expect(record.aiScore).toBe(82);
    expect(record.matchDetails?.experienceAlignment).toBe(
      '8 years aligns well with the senior requirement.'
    );
  });

  it('persists a candidate with no match run (aiScore/matchDetails absent)', async () => {
    const { aiScore, matchDetails, ...noMatch } = FULL_PAYLOAD;
    const response = await POST(buildRequest(noMatch));
    expect(response.status).toBe(201);

    const row = supabase.getInsertedRow();
    // Enrichment still persists; match columns fall back to null (not undefined).
    expect(row).toMatchObject({ years_of_experience: 8, ai_score: null, match_details: null });

    const record = toCandidateRecord({ id: 'x', ...row });
    expect(record.aiScore).toBeUndefined();
    expect(record.matchDetails).toBeUndefined();
    expect(record.yearsOfExperience).toBe(8);
  });
});
