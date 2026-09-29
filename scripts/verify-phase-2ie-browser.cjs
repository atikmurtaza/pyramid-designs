// Uses an already-installed Playwright supplied by the verification environment.
// No browser mock, fixture token or provider bypass is shipped in application code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PHASE2IE_PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.PHASE2IE_BROWSER_ORIGIN || 'http://127.0.0.1:3111';
assert(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const multipart = process.env.PHASE2IE_BROWSER_FILES === 'yes';
let checks = 0;
const check = (a, b = true) => { assert.deepEqual(a, b); checks++; };
const widget = `window.turnstile={render(container,options){window.__challenge=options;
 if(options.action!=='candidate_intake'||options['response-field']!==false||options.retry!=='never')throw Error('Unsafe widget options');
 container.innerHTML='<button type="button" id="synthetic-widget-control">Synthetic provider interaction</button>';
 container.firstChild.onclick=()=>options.callback('synthetic-browser-token-'+(++window.__tokenNumber));return 'synthetic-widget';},
 remove(){document.querySelector('#synthetic-widget-control')?.remove();}};window.__tokenNumber=0;`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const matrix = [];
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('https://challenges.cloudflare.com/**', route => route.request().url().includes('/api.js')
      ? route.fulfill({ contentType: 'application/javascript', body: widget }) : route.abort());
    const page = await context.newPage();
    const posts = [];
    let failure = true, abort = false, releaseSubmission;
    await page.route('**/api/applications', async route => {
      const request = route.request(); check(request.method(), 'POST');
      check(request.headers()['content-type'].startsWith(multipart ? 'multipart/form-data;' : 'application/x-www-form-urlencoded'));
      const parsed = await new Response(request.postDataBuffer(), { headers: { 'content-type': request.headers()['content-type'] } }).formData();
      posts.push({ key: parsed.get('idempotencyKey'), token: parsed.get('cf-turnstile-response'), type: parsed.get('applicationType') });
      await new Promise(resolve => { releaseSubmission = resolve; });
      if (abort) return route.abort();
      await route.fulfill({ status: failure ? 400 : 200, contentType: 'application/json', body: JSON.stringify(failure
        ? { ok: false, field: 'intake-challenge', message: 'Complete a fresh security check.' } : { ok: true }) });
    });
    for (const width of [320, 390, 768, 1280, 1440]) for (const job of [false, true]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/join' + (job ? '?job=synthetic-phase-2b-role' : ''), { waitUntil: 'domcontentloaded' });
      await page.locator('#synthetic-widget-control').waitFor();
      check(await page.getByRole('button', { name: 'Submit synthetic application' }).isDisabled());
      check(await page.locator('input[name="cf-turnstile-response"]').count(), 0);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      check(await page.locator('#intake-challenge').evaluate(el => el.scrollWidth <= el.clientWidth));
      check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
      check(await page.locator('#intake-challenge-status').getAttribute('role'), 'status');
      check(await page.locator('#intake-challenge').getAttribute('aria-labelledby'), 'intake-challenge-title');
      await page.locator('#synthetic-widget-control').focus(); await page.keyboard.press('Enter');
      check(await page.getByRole('button', { name: 'Submit synthetic application' }).isEnabled());
      await page.keyboard.press('Tab'); check(await page.evaluate(() => document.activeElement.textContent), 'Retry security check');
      await page.keyboard.press('Tab'); check(await page.evaluate(() => document.activeElement.textContent), 'Submit synthetic application');
      await page.keyboard.press('Tab'); check(await page.evaluate(() => !document.activeElement.closest('#intake-challenge')));
      await page.evaluate(() => window.__challenge['expired-callback']());
      await page.waitForFunction(() => document.querySelector('button[type="submit"]').disabled);
      check(await page.getByRole('button', { name: 'Submit synthetic application' }).isDisabled());
      check((await page.locator('#intake-challenge-status').textContent()).includes('expired'));
      await page.getByRole('button', { name: 'Retry security check' }).click();
      await page.locator('#synthetic-widget-control').click();
      for (const callback of ['error-callback', 'timeout-callback', 'unsupported-callback']) {
        await page.evaluate(name => window.__challenge[name](), callback);
        await page.waitForFunction(() => document.querySelector('button[type="submit"]').disabled);
        check(await page.getByRole('button', { name: 'Submit synthetic application' }).isDisabled());
        await page.getByRole('button', { name: 'Retry security check' }).click();
        await page.locator('#synthetic-widget-control').click();
      }
      await page.locator('#intake-challenge').screenshot({ path: `tmp/2ie-ui-${multipart ? 'file' : 'form'}-${job ? 'job' : 'talent'}-${width}.png` });
      matrix.push({ width, type: job ? 'JOB_APPLICATION' : 'TALENT_NETWORK', encoding: multipart ? 'multipart' : 'urlencoded', passed: true });
    }
    for (const job of [false, true]) {
      failure = true; abort = false;
      await page.goto(origin + '/join' + (job ? '?job=synthetic-phase-2b-role' : ''), { waitUntil: 'domcontentloaded' });
      await page.locator('#fullName').fill('Synthetic Browser Verification');
      await page.locator('#email').fill('synthetic.browser@example.invalid'); await page.locator('#city').fill('Synthetic City');
      await page.locator('#experienceLevel').fill('SYNTHETIC_LEVEL');
      if (job) {
        const select = page.locator('select[name^="answer."]'); await select.selectOption({ index: 1 });
      } else {
        await page.locator('#engagementType').selectOption('PERMANENT_INTEREST'); await page.locator('#departmentId').selectOption({ index: 1 });
      }
      if (multipart) await page.locator('#cv').setInputFiles({ name: 'Synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic browser fixture; request intercepted offline.') });
      await page.locator('#consent').check();
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt === 1) abort = true;
        if (attempt === 2) { abort = false; failure = false; }
        await page.locator('#synthetic-widget-control').click();
        await page.getByRole('button', { name: 'Submit synthetic application' }).click();
        check(await page.locator('.join-form').getAttribute('aria-busy'), 'true');
        check(await page.getByRole('button', { name: 'Retry security check' }).isDisabled());
        check(await page.locator('#fullName').isDisabled());
        for (let wait = 0; !releaseSubmission && wait < 200; wait++) await new Promise(resolve => setTimeout(resolve, 5));
        assert(releaseSubmission, 'Submission did not reach the offline interceptor');
        releaseSubmission(); releaseSubmission = undefined;
        if (attempt < 2) {
          await page.locator('.join-error-summary').waitFor();
          check(await page.locator('.join-error-summary').evaluate(el => el === document.activeElement));
          check(await page.getByRole('button', { name: 'Submit synthetic application' }).isDisabled());
          check(await page.locator('.join-form').getAttribute('aria-busy'), 'false');
          if (attempt === 0) {
            check((await page.locator('#intake-challenge').getAttribute('aria-describedby')).includes('intake-error'));
            await page.getByRole('link', { name: 'Review the field' }).click();
            check(await page.evaluate(() => document.activeElement.id), 'intake-challenge');
          }
        } else {
          await page.locator('.join-success').waitFor();
          check(await page.locator('.join-success').evaluate(el => el === document.activeElement));
        }
      }
      const current = posts.slice(-3); check(new Set(current.map(p => p.key)).size, 1);
      check(new Set(current.map(p => p.token)).size, 3);
      check(current.every(p => p.type === (job ? 'JOB_APPLICATION' : 'TALENT_NETWORK')));
    }
    await context.close();
    // Script failure and explicit recovery: never automatically submit or retry.
    const retryContext = await browser.newContext(); let blocked = true;
    await retryContext.route('https://challenges.cloudflare.com/**', route => blocked ? route.abort()
      : route.fulfill({ contentType: 'application/javascript', body: widget }));
    const retryPage = await retryContext.newPage(); await retryPage.goto(origin + '/join');
    await retryPage.getByText('Security check unavailable or expired. Choose Retry security check.', { exact: true }).waitFor();
    check(await retryPage.getByRole('button', { name: 'Submit synthetic application' }).isDisabled());
    blocked = false; await retryPage.getByRole('button', { name: 'Retry security check' }).click();
    await retryPage.locator('#synthetic-widget-control').click();
    check(await retryPage.getByRole('button', { name: 'Submit synthetic application' }).isEnabled());
    await retryContext.close();
    fs.writeFileSync(`tmp/2ie-browser-${multipart ? 'file' : 'form'}.json`, JSON.stringify({ checks, matrix, provider: 'offline fixture', liveMutations: 0 }, null, 2));
    console.log(`PHASE_2IE_BROWSER_OK checks=${checks} widths=5 contexts=2 encoding=${multipart ? 'multipart' : 'urlencoded'} live_mutations=0`);
  } finally { await browser.close(); }
})().catch(error => { console.error('PHASE_2IE_BROWSER_FAILED ' + error.name + ': ' + error.message.split('\n')[0] + '\n' + (error.stack || '').split('\n').filter(line => line.trim().startsWith('at ')).join('\n')); process.exitCode = 1; });
