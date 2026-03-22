import { expect, test, type Page } from '@playwright/test';

const DB_KEY = 'recruitedai.mock-db';

async function waitForCandidatesPageReady(page: Page) {
  await expect(page).toHaveURL(/\/candidates(?:\?|$)/, { timeout: 30_000 });
  await expect(page.getByText('Candidate Management')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Loading candidates...')).toHaveCount(0, { timeout: 30_000 });
}

test('smoke: demo login, candidate creation, and interview save persistence', async ({ page }) => {
  const stamp = Date.now();
  const candidateId = `cand-e2e-${stamp}`;
  const candidateName = `E2E Smoke Candidate ${stamp}`;
  const note = `Strong communication and systems thinking ${stamp}`;

  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@dem.com');
  await page.getByLabel('Password').fill('demo');
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard\/recruiter/);

  await page.goto('/candidates');
  await waitForCandidatesPageReady(page);

  await page.evaluate(
    ({ dbKey, id, name }) => {
      const raw = window.localStorage.getItem(dbKey);
      const db = raw ? JSON.parse(raw) : null;
      if (!db || !Array.isArray(db.candidates)) {
        throw new Error('Mock database is not initialized.');
      }

      db.candidates.push({
        id,
        companyId: 'mock-company',
        name,
        email: `e2e-${id}@example.com`,
        status: 'Sourced',
        aiScore: 0,
        currentJob: 'QA Engineer',
        currentCompany: 'Smoke Test Inc.',
        interviewNotes: {},
        interviewScores: {},
        aiSummary: '',
      });
      window.localStorage.setItem(dbKey, JSON.stringify(db));
    },
    { dbKey: DB_KEY, id: candidateId, name: candidateName }
  );

  await expect.poll(
    async () =>
      page.evaluate(
        ({ dbKey, id }) => {
          const raw = window.localStorage.getItem(dbKey);
          const db = raw ? JSON.parse(raw) : null;
          return !!db?.candidates?.some((candidate: { id: string }) => candidate.id === id);
        },
        { dbKey: DB_KEY, id: candidateId }
      ),
    { timeout: 10_000 }
  ).toBe(true);

  await page.reload();
  await waitForCandidatesPageReady(page);

  const candidateLink = page.locator('a', { hasText: candidateName }).first();
  await expect(candidateLink).toBeVisible({ timeout: 30_000 });
  await candidateLink.click();

  await expect(page.getByRole('heading', { name: candidateName })).toBeVisible();
  await page.locator('#question-0').fill(note);
  await page.getByRole('button', { name: 'Save Profile Changes' }).click();
  await expect(page.getByText('Profile Saved')).toBeVisible();

  await page.reload();
  await expect(page.locator('#question-0')).toHaveValue(note);
});
