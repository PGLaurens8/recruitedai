import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = 'https://recruitedai.vercel.app';
const SHOTS = '/tmp/recruitedai-test/screenshots';
const PATHS = ['/', '/pricing', '/login', '/signup'];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const results = [];
for (const path of PATHS) {
  const page = await ctx.newPage();
  const consoleErrs = [];
  const failedReqs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => consoleErrs.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) failedReqs.push({ status: r.status(), url: r.url() }); });

  const t0 = Date.now();
  let navStatus = null, navError = null;
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    navStatus = resp?.status() ?? null;
  } catch (e) { navError = e.message; }
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  const title = await page.title().catch(() => null);
  const h1s = await page.$$eval('h1', els => els.map(e => e.textContent?.trim()).filter(Boolean)).catch(() => []);
  const redirected = finalUrl !== BASE + path && finalUrl !== BASE + path + '/';

  await page.screenshot({ path: `${SHOTS}/post_fixes_${path.replace(/[^a-z0-9]+/gi, '_') || 'root'}.png`, fullPage: true });
  results.push({ path, navStatus, navError, loadMs, finalUrl, redirected, title, h1s, consoleErrs, failedReqs });
  await page.close();
}

await browser.close();
writeFileSync('/tmp/recruitedai-test/post_fixes_smoke.json', JSON.stringify(results, null, 2));

for (const r of results) {
  const verdict = r.redirected ? 'REDIRECT' : 'OK';
  console.log(`${verdict.padEnd(8)} ${r.path.padEnd(10)} ${r.navStatus} ${r.loadMs}ms  h1=${JSON.stringify(r.h1s)}`);
  if (r.redirected) console.log(`         -> ${r.finalUrl}`);
  if (r.consoleErrs.length) console.log(`         console errors: ${r.consoleErrs.length} — ${r.consoleErrs[0].slice(0,150)}`);
  if (r.failedReqs.length) console.log(`         failed reqs: ${r.failedReqs.length}`);
}
