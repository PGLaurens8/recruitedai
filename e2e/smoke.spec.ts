import { expect, test } from '@playwright/test';

const DB_KEY = 'recruitedai.mock-db';

test('smoke: demo login, candidate creation, and interview save persistence', async ({ page }) => {
  const stamp = Date.now();
  const candidateId = `cand-e2e-${stamp}`;
  const candidateName = `E2E Smoke Candidate ${stamp}`;
  const note = `Strong communication and systems thinking ${stamp}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Use Demo Credentials' }).click();
  await page.getByRole('button', { name: 'Log In' }).click();
  await expect(page).toHaveURL(/\/dashboard\/recruiter/);

  await page.goto('/candidates');
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

  await page.reload();
  await expect(page.getByRole('link', { name: candidateName })).toBeVisible();
  await page.getByRole('link', { name: candidateName }).click();

  await expect(page.getByRole('heading', { name: candidateName })).toBeVisible();
  await page.locator('#question-0').fill(note);
  await page.getByRole('button', { name: 'Save Profile Changes' }).click();
  await expect(page.getByText('Profile Saved')).toBeVisible();

  await page.reload();
  await expect(page.locator('#question-0')).toHaveValue(note);
});
