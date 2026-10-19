import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unexpectedCredentialEnvironmentNames } from './environment-assertions';

type ExportedAudit = {
  sourceDataset?: { snapshotId?: string };
  latestAudit?: {
    sourceId?: string;
    claimType?: string;
    result?: string;
    synthetic?: boolean;
    bundleHash?: string;
    bundle?: { reason?: string };
  };
};

test('scope presets and report verification work without a CLI on desktop and mobile', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  const preset = scope.getByRole('button', { name: 'Use loaded observation period' });
  await expect(preset).toBeEnabled();
  await preset.click();
  await expect(scope.getByLabel('Period start')).toHaveValue('2024-06-07');
  await expect(scope.getByLabel('Period end')).toHaveValue('2026-07-11');
  await expect(scope.getByRole('status')).toContainText('not applied');
  await expect(page.getByRole('button', { name: 'Run rules baseline' })).toBeDisabled();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor', exact: true }).click();
  await expect(scope.getByLabel('Period start')).toHaveValue('2024-06-07');
  await expect(scope.getByLabel('Period end')).toHaveValue('2026-07-11');
  await scope.getByLabel('Observation event').selectOption('82758651-76f4-4e06-b4ab-c247ce765192');
  await scope.getByRole('button', { name: 'Use selected observation day' }).click();
  await expect(scope.getByLabel('Period end')).toHaveValue('2024-06-07');
  await scope.getByLabel('Period end').fill('2024-06-06');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await expect(scope.getByRole('alert')).toContainText('Enter valid dates');
  await scope.getByRole('button', { name: 'Use selected observation day' }).click();
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.locator('#claim-audit').selectOption('source_detected');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-verdict-card')).toContainText('Required references present');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report', exact: true }).click();
  const download = await downloadReady;
  const file = (await download.path())!;
  const verifier = page.getByRole('region', { name: 'Verify an exported report' });
  await expect(verifier).toBeVisible();
  await expect(verifier.getByLabel('Require complete export context')).toBeChecked();
  const input = verifier.getByLabel('Choose a JSON audit report');
  await input.setInputFiles(file);
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.');
  await expect(verifier).toContainText('Export context checksum matches.');
  await verifier.screenshot({ path: testInfo.outputPath('report-verification-desktop.png') });
  const original = JSON.parse(await readFile(file, 'utf8'));
  await input.setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original.latestAudit)) });
  await expect(verifier.getByRole('alert')).toContainText('complete JSON report');
  await verifier.getByLabel('Require complete export context').uncheck();
  await expect(verifier).toContainText('Choose the file again');
  await input.setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original.latestAudit)) });
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.');
  await expect(verifier).toContainText('Export context is not verified.');
  await verifier.getByLabel('Require complete export context').check();
  const tampered = structuredClone(original); tampered.disclaimer += ' changed';
  await input.setInputFiles({ name: 'tampered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(tampered)) });
  await expect(verifier.getByRole('alert')).toContainText('Audit bundle verification failed.');
  await input.setInputFiles(file);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(verifier.getByLabel('Require complete export context')).toBeVisible();
  await verifier.screenshot({ path: testInfo.outputPath('report-verification-mobile.png') });
  expect(errors).toEqual([]);
});

test('analyst case work resumes after refresh with a bounded scope and a work-status queue', async ({ page, request }, testInfo) => {
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  let releaseCatalog!: () => void;
  const catalogGate = new Promise<void>(resolve => { releaseCatalog = resolve; });
  await page.route('**/data/mars-source-catalog.json.gz', async route => { await catalogGate; await route.continue(); });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await expect(page.getByText('Loading investigation dataset…', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Analyst case work' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Assessment scope' })).toHaveCount(0);
  releaseCatalog();
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await expect(scope).toBeVisible();
  await scope.getByLabel('Period start').fill('2024-06-07');
  await scope.getByLabel('Period end').fill('2024-12-31');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  const work = page.getByRole('region', { name: 'Analyst case work' });
  await work.getByLabel('Open question').fill('Was the operator notified for this event?');
  await work.getByLabel('Next action').fill('Inspect the delivery register.');
  await work.getByLabel('Evidence to request').fill('Dated notice receipt.');
  await work.getByLabel('Work status').selectOption('awaiting_evidence');
  await work.getByRole('button', { name: 'Save case work' }).click();
  await expect(work.getByRole('status')).toContainText('Saved in this browser');
  await page.reload();
  await page.getByRole('region', { name: 'Analyst case work' }).getByRole('button', { name: 'Resume saved investigation' }).click();
  await expect(page.getByRole('region', { name: 'Assessment scope' })).toContainText('2024-06-07 → 2024-12-31');
  await expect(page.getByRole('region', { name: 'Analyst case work' }).getByLabel('Open question')).toHaveValue('Was the operator notified for this event?');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-verdict-card')).toContainText('Insufficient reference coverage');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Cases', exact: true }).click();
  const rankings = await (await request.get('/api/intelligence/rankings')).json();
  const maximumScore = Math.max(...rankings.rankings.map((item: { priorityScore: number }) => item.priorityScore));
  await page.getByLabel('Case queue order').selectOption('priority');
  await expect(page.getByTestId('cases-table').locator('tbody tr').first()).toContainText(`Priority ${maximumScore}/80`);
  await page.getByLabel('Filter by work status').selectOption('awaiting_evidence');
  await expect(page.getByTestId('cases-table')).toContainText('KAZ_S_159');
  await expect(page.getByTestId('cases-table').locator('tbody tr')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('case-work-queue-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('case-work-queue-mobile.png'), fullPage: true });
});

test('claim requirements guide investigation and export a readable snapshot-bound brief', async ({ page }, testInfo) => {
  expect(unexpectedCredentialEnvironmentNames()).toEqual([]);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const coverage = page.getByRole('region', { name: 'Claim evidence coverage' });
  await expect(coverage).toBeVisible();
  await expect(coverage).toContainText('3 required-type');
  await expect(coverage).toContainText('notified: Yes');
  await expect(coverage.getByRole('button', { name: /^Mitigation confirmation claim/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(coverage).toContainText('Feedback and missing later detections cannot confirm mitigation');
  await coverage.getByRole('button', { name: /^Operator notified/ }).click();
  await expect(page.locator('#claim-audit')).toHaveValue('operator_notified');
  await expect(coverage).toContainText('Find attributable notification evidence');
  await coverage.getByRole('button', { name: 'Open references' }).first().click();
  await expect(page.getByPlaceholder('Search documents, sources or keywords…')).toHaveValue('KAZ_S_159');
  await expect(page.locator('.document-grid')).toContainText('KAZ_S_159');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor' }).click();
  await page.getByRole('region', { name: 'Claim evidence coverage' }).getByRole('button', { name: /^Source detected/ }).click();
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-citation-preview')).toContainText('3 cited references');
  const meaning = page.getByRole('region', { name: 'Assessment meaning' });
  await expect(meaning).toContainText('Reference metadata coverage');
  await expect(meaning).toContainText('Not established by this application');
  await meaning.screenshot({ path: testInfo.outputPath('p4-assessment-meaning-desktop.png') });
  await expect(page.locator('.coverage-plan')).toContainText('does not authenticate');
  await page.locator('.evidence-coverage').screenshot({ path: testInfo.outputPath('claim-evidence-coverage-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(meaning).toBeVisible();
  await meaning.screenshot({ path: testInfo.outputPath('p4-assessment-meaning-mobile.png') });
  await expect(coverage.getByRole('button', { name: /^Mitigation confirmation claim/ })).toBeVisible();
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('claim-evidence-coverage-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const briefReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download investigation brief' }).click();
  const briefFile = await briefReady;
  expect(briefFile.suggestedFilename()).toBe('methane-response-kaz_s_159-investigation.md');
  const brief = await readFile((await briefFile.path())!, 'utf8');
  expect(brief).toContain('Dataset snapshot: unep-mars-675417694883');
  expect(brief).toContain('Claim: Source detected');
  expect(brief).toContain('Assessment: Required references present');
  expect(brief).toContain('Underlying JSON payload checksum:');
  expect(brief).toContain('cannot prove a repair or emissions reduction');
  expect(errors).toEqual([]);
});

test('P4 reviewer v2 is readable without external assets and supports keyboard navigation on mobile', async ({ page }, testInfo) => {
  const html = await readFile('docs/evidence/domain-review-remediation-2026-10-18/reviewer/index.html', 'utf8');
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { externalRequests.push(url.href); return route.abort(); }
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/p4-reviewer-v2/index.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Permintaan review metode');
  await expect(page.locator('.intro')).toContainText('P4-2026-10-18-v2');
  await expect(page.locator('main > section')).toHaveCount(6);
  await expect(page.locator('form, input, script, iframe')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('p4-reviewer-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('p4-reviewer-mobile.png') });
  const cases = page.locator('nav a[href="#doc-03-cases"]');
  await cases.focus();
  await expect(cases).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#doc-03-cases$/);
  await expect(page.locator('#doc-03-cases')).toContainText('R01 — KAZ_S_159');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('p4-reviewer-mobile-cases.png') });
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('saved assessments can be compared by claim without creating extra revisions', async ({ page, request }, testInfo) => {
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const saved: Array<{ auditId: string }> = [];
  for (const claimType of ['source_detected', 'source_detected', 'mitigation_confirmed']) {
    const response = await request.post('/api/audits', { data: { sourceId: 'CAN_S_002', claimType } });
    expect(response.ok()).toBe(true);
    saved.push(await response.json() as { auditId: string });
  }
  let mutations = 0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/audits') mutations++; });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/reports?sourceId=CAN_S_002');
  const comparison = page.getByRole('region', { name: 'Compare saved assessments' });
  await expect(comparison).toBeVisible();
  await comparison.getByLabel('Comparison claim', { exact: true }).selectOption('source_detected');
  await comparison.getByLabel('Compare to').selectOption(saved[1].auditId);
  await comparison.getByLabel('Compare from').selectOption(saved[0].auditId);
  await expect(comparison).toContainText('The compared decision fields are unchanged');
  await expect(comparison).toContainText('0 added · 0 removed · 0 changed');
  await comparison.screenshot({ path: testInfo.outputPath('audit-comparison-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('audit-comparison-mobile.png'), fullPage: true });
  await comparison.getByLabel('Comparison claim', { exact: true }).selectOption('mitigation_confirmed');
  await expect(comparison).toContainText('Save or load two assessments of the same claim');
  expect(mutations).toBe(0);
});

test('late audit and verification responses cannot overwrite a changed investigation', async ({ page }) => {
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await expect(page.getByRole('region', { name: 'Claim evidence coverage' })).toContainText('3 loaded observation records');
  let releaseAudit: (() => void) | undefined;
  await page.route('**/api/audits', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const response = await route.fetch();
    await new Promise<void>(resolve => { releaseAudit = resolve; });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect.poll(() => Boolean(releaseAudit)).toBe(true);
  // Return to the original claim: matching IDs alone must not revive the first request.
  await page.locator('#claim-audit').selectOption('operator_notified');
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  const auditReceived = page.waitForResponse(response => response.url().endsWith('/api/audits') && response.request().method() === 'POST');
  releaseAudit!();
  await auditReceived;
  await expect(page.locator('.audit-verdict-card')).toContainText('Awaiting assessment');
  await page.unroute('**/api/audits');

  await page.locator('#claim-audit').selectOption('source_detected');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-citation-preview')).toContainText('3 cited references');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await navigation.getByRole('button', { name: 'Blockchain' }).click();
  let releaseVerification: (() => void) | undefined;
  await page.route('**/api/audits/*/verify', async route => {
    const response = await route.fetch();
    await new Promise<void>(resolve => { releaseVerification = resolve; });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Verify saved digest' }).click();
  await expect.poll(() => Boolean(releaseVerification)).toBe(true);
  await navigation.getByRole('button', { name: 'Evidence Auditor' }).click();
  await page.locator('#claim-audit').selectOption('operator_notified');
  await page.locator('#claim-audit').selectOption('source_detected');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-citation-preview')).toContainText('3 cited references');
  await navigation.getByRole('button', { name: 'Blockchain' }).click();
  await expect(page.getByRole('button', { name: 'Verify saved digest' })).toBeEnabled();
  const verificationReceived = page.waitForResponse(response => /\/api\/audits\/[^/]+\/verify$/.test(new URL(response.url()).pathname));
  releaseVerification!();
  await verificationReceived;
  await expect(page.getByText(/^Verifier result:/)).toHaveCount(0);
  await expect(page.locator('.blockchain-aside')).toContainText('Not checked');
});

test('opening a saved revision takes precedence over an earlier pending assessment', async ({ page, request }) => {
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  const originalResponse = await request.post('/api/audits', { data: { sourceId: 'MEX_S_003', claimType: 'source_detected' } });
  expect(originalResponse.ok()).toBe(true);
  const original = await originalResponse.json() as { auditId: string; bundleHash: string };
  await page.goto('/dashboard/audit?sourceId=MEX_S_003');
  await page.locator('#claim-audit').selectOption('source_detected');
  let release: (() => void) | undefined;
  await page.route('**/api/audits', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const response = await route.fetch();
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const originalEntry = page.locator('.audit-history-entry').filter({ hasText: original.bundleHash.slice(0, 18) });
  await originalEntry.click();
  await expect(originalEntry).toHaveAttribute('aria-pressed', 'true');
  const refreshed = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/audits');
  release!();
  await refreshed;
  await expect(originalEntry).toHaveAttribute('aria-pressed', 'true');
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const downloaded = await downloadReady;
  const report = JSON.parse(await readFile((await downloaded.path())!, 'utf8')) as { latestAudit: { auditId: string } };
  expect(report.latestAudit.auditId).toBe(original.auditId);
});

test('map case details show the official Canada report link with its date and license metadata', async ({ page }) => {
  expect(unexpectedCredentialEnvironmentNames()).toEqual([]);
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard/map?sourceId=CAN_S_002');
  await expect(page.getByRole('button', { name: 'Zoom to source on globe' })).toBeVisible();
  await page.getByRole('button', { name: 'Zoom to source on globe' }).click();
  await page.getByRole('button', { name: /View full case/ }).click();

  const caseDialog = page.getByRole('dialog');
  await expect(caseDialog).toBeVisible();
  await caseDialog.getByRole('tab', { name: 'Evidence' }).click();
  const reference = caseDialog.locator('.case-dialog-document-list > div').filter({
    hasText: 'Methane Alert and Response System (MARS) Confirmed Mitigation Action – Canada (CAN_S_002)',
  });
  await reference.scrollIntoViewIfNeeded();
  await expect(reference).toBeInViewport();
  await expect(reference.locator('small')).toBeVisible();
  await expect(reference.locator('small')).toHaveText(
    'United Nations Environment Programme · report date 2026-07 · license Attribution-NonCommercial-NoDerivs 3.0 IGO · report content not copied',
  );
  await expect(reference.getByRole('link', { name: /Open publisher/ })).toHaveAttribute(
    'href',
    'https://wedocs.unep.org/handle/20.500.11822/49811',
  );
});

test('MARS publisher indicators load lazily, preserve monthly/country history, paginate, and jump to an exact source', async ({ page }, testInfo) => {
  expect(unexpectedCredentialEnvironmentNames()).toEqual([]);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard/indicators?sourceId=MEX_S_003');
  await expect(page.getByRole('heading', { name: 'Publisher Indicators' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Top 50 methane sources' })).toBeVisible();
  await expect(page.locator('.mpi-summary-grid')).toContainText('9');
  await expect(page.getByLabel('Top 50 publisher release month')).toHaveValue('2026-09');
  const topTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Six-month average flux' }) });
  await expect(topTable.getByRole('row')).toHaveCount(11);
  await topTable.getByRole('row', { name: /MEX_S_003/ }).getByRole('button', { name: 'Open MEX_S_003 in Map Explorer' }).click();
  await expect(page).toHaveURL(/\/dashboard\/map\?sourceId=MEX_S_003$/);
  await expect(page.locator('.selected-source-card')).toBeVisible();
  await expect(page.locator('.selected-source-card')).toContainText('MEX_S_003');

  await page.goto('/dashboard/indicators?sourceId=MEX_S_003');
  await page.getByRole('tab', { name: /Country response history/ }).click();
  await expect(page.getByRole('heading', { name: 'MARS response rates by country' })).toBeVisible();
  await expect(page.getByLabel('Country response reporting period')).toHaveValue('2025-08-01:2026-07-31');
  const responseTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'With feedback / notified' }) });
  await expect(responseTable.getByRole('row')).toHaveCount(11);
  await page.getByLabel('Rows per page').selectOption('50');
  await expect(responseTable.getByRole('row')).toHaveCount(35);
  const algeria = responseTable.getByRole('row', { name: /Algeria/ });
  await algeria.getByRole('button', { name: 'View response history for Algeria' }).click();
  await expect(page.locator('.mpi-history')).toContainText('Algeria');
  await page.locator('.mpi-history-details summary').click();
  const algeriaHistory = page.locator('.mpi-history-list>div');
  const previousAlgeriaPeriod = algeriaHistory.nth(6);
  await expect(previousAlgeriaPeriod).toContainText('2025-07-01 – 2026-06-30');
  await expect(previousAlgeriaPeriod).toContainText('2 with feedback / 135 notified');
  const latestAlgeriaPeriod = algeriaHistory.last();
  await expect(latestAlgeriaPeriod).toContainText('2025-08-01 – 2026-07-31');
  await expect(latestAlgeriaPeriod).toContainText('1 with feedback / 166 notified');
  await expect(page.getByText(/does not identify which source was repaired, establish physical mitigation, or prove that emissions fell/)).toBeVisible();
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.screenshot({ path: testInfo.outputPath('mars-indicators-country-history-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.app-main').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: Math.round(rect.left), width: Math.round(rect.width) };
  })).toEqual({ left: 0, width: 390 });
  await expect(page.getByText('Swipe or scroll the table horizontally to view all columns', { exact: true })).toBeVisible();
  await expect(page.locator('.mpi-table-wrap').last()).toHaveAttribute('tabindex', '0');
  const mobileLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    layout: ['.app', '.app-main', '.workspace-content', '.mpi-workspace', '.mpi-panel', '.mpi-response-layout', '.mpi-response-table-card', '.mpi-table-wrap', '.mpi-response-table'].map(selector => {
      const element = document.querySelector(selector);
      if (!element) return { selector, missing: true };
      const rect = element.getBoundingClientRect();
      return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scroll: element.scrollWidth, client: element.clientWidth, overflowX: getComputedStyle(element).overflowX };
    }),
    offenders: [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right), scroll: element.scrollWidth, client: element.clientWidth };
    }).filter(item => item.right > window.innerWidth + 1 || item.left < -1 || item.scroll > item.client + 1).sort((a, b) => b.right - a.right).slice(0, 12),
  }));
  expect(mobileLayout.document, `wide data tables may scroll inside their panel but must not widen the page: ${JSON.stringify(mobileLayout)}`).toBeLessThanOrEqual(mobileLayout.viewport);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.screenshot({ path: testInfo.outputPath('mars-indicators-country-history-mobile.png'), fullPage: true });
  expect(pageErrors).toEqual([]);
});

test('historical MARS case can be audited, exported, verified, and tampering is rejected', async ({ page }) => {
  expect(unexpectedCredentialEnvironmentNames()).toEqual([]);
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  // Keep the E2E deterministic and offline: only the local Vite/API stack is allowed.
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard?sourceId=KAZ_S_159');
  const evidenceReferencesMetric = page.locator('.overview-ring');
  await expect(evidenceReferencesMetric).toHaveAttribute('aria-label', '4 evidence references');
  await expect(evidenceReferencesMetric.locator('strong')).toHaveText('4');
  await expect(evidenceReferencesMetric.locator('span')).toHaveText('evidence links');
  await expect(page.getByText('3 snapshot observations', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const observationCard = page.locator('.overview-card').filter({ hasText: 'Methane Flux Observations' });
  const observationCaption = observationCard.locator('.chart-caption');
  await expect(observationCaption).toContainText('not continuous monitoring');
  const mobileCaptionFits = await observationCaption.evaluate(caption => {
    const card = caption.closest('.overview-card');
    if (!card) return false;
    return caption.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom + 1
      && card.scrollHeight <= card.clientHeight + 1;
  });
  expect(mobileCaptionFits, 'the mobile observation caveat should stay inside its card').toBe(true);
  await page.setViewportSize({ width: 1600, height: 900 });

  await page.goto('/dashboard/map?sourceId=KAZ_S_159');
  await expect(page.getByRole('button', { name: 'Map Explorer' })).toBeVisible();
  await expect(page.getByText('KAZ_S_159', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/unep-mars-675417694883/)).toBeVisible();

  await page.getByRole('button', { name: 'Zoom to source on globe' }).click();
  await page.getByRole('button', { name: /View full case/ }).click();
  const caseDialog = page.getByRole('dialog');
  await expect(caseDialog).toBeVisible();
  await expect(caseDialog).toContainText('KAZ_S_159');
  await caseDialog.getByRole('tab', { name: 'Observations' }).click();
  await expect(caseDialog.getByRole('table')).toBeVisible();
  await expect(caseDialog.getByRole('table')).toContainText('kg/h');
  await caseDialog.getByRole('button', { name: 'Review evidence' }).click();

  const auditSteps = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await auditSteps.getByRole('button', { name: /Observations/ }).click();
  await expect(page.getByText('KAZ_S_159 · Evidence inventory')).toBeVisible();
  await auditSteps.getByRole('button', { name: /Overview/ }).click();
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('#audit-stage-overview').getByText(/An explicit assessment scope with a date period is required/)).toBeVisible();

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports' }).click();
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toMatch(/kaz_s_159-audit\.json$/i);
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();

  const exported = JSON.parse(await readFile(downloadedPath!, 'utf8')) as ExportedAudit;
  expect(exported).toMatchObject({
    sourceDataset: { snapshotId: 'unep-mars-675417694883' },
    latestAudit: {
      sourceId: 'KAZ_S_159',
      claimType: 'mitigation_confirmed',
      result: 'insufficient_evidence',
      synthetic: false,
    },
  });
  expect(exported.latestAudit?.bundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(exported.latestAudit?.bundle?.reason).toContain('An explicit assessment scope');

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Blockchain' }).click();
  const reportInput = page.getByLabel('Choose a JSON audit report');
  await reportInput.setInputFiles(downloadedPath!);
  await expect(page.getByText('Audit bundle SHA-256 digest matches.', { exact: true })).toBeVisible();
  await expect(page.getByText('No blockchain receipt is included in this file.', { exact: true })).toBeVisible();

  const tampered = structuredClone(exported);
  tampered.latestAudit!.bundle!.reason = `${tampered.latestAudit!.bundle!.reason} tampered`;
  await reportInput.setInputFiles({
    name: 'tampered-audit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(tampered)),
  });
  await expect(page.getByText('Audit bundle verification failed.', { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('guided investigation keeps the selected source and exposes discrete audit stages', async ({ page }, testInfo) => {
  expect(unexpectedCredentialEnvironmentNames()).toEqual([]);
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  const journey = page.getByRole('navigation', { name: 'Investigation workflow' });
  await expect(journey).toBeVisible();
  await expect(journey).toContainText('KAZ_S_159');
  await journey.getByRole('button', { name: /Review selected source/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/audit\?sourceId=KAZ_S_159$/);
  await page.screenshot({ path: testInfo.outputPath('guided-auditor-desktop.png'), fullPage: true });

  const stages = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await expect(stages).toBeVisible();
  await stages.getByRole('button', { name: 'Observations' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Observations' })).toBeVisible();
  await expect(page.getByText('Observation timeline', { exact: true })).toBeVisible();
  const timeline = page.getByRole('group', { name: /Timeline of \d+ discrete MARS observation records/ });
  await expect(timeline).toBeVisible();
  await expect(timeline.locator('.evidence-chart-trend-line')).toHaveCount(0);
  await expect(timeline).toHaveAttribute('aria-label', /Each point is a separate satellite overpass/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.app-main').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: Math.round(rect.left), width: Math.round(rect.width) };
  })).toEqual({ left: 0, width: 390 });
  const mobileLayout = await page.evaluate(() => {
    const offenders = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    }).filter(element => element.right > window.innerWidth + 1 || element.left < -1).sort((a, b) => b.right - a.right).slice(0, 8);
    const scrollRoots = [...document.querySelectorAll('body *')].map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), width: Math.round(rect.width), client: element.clientWidth, scroll: element.scrollWidth };
    }).filter(element => element.scroll > element.client + 1).sort((a, b) => (b.scroll - b.client) - (a.scroll - a.client)).slice(0, 12);
    return { viewport: window.innerWidth, document: document.documentElement.scrollWidth, offenders, scrollRoots };
  });
  expect(mobileLayout.document, `mobile auditor should not cause page-level horizontal overflow: ${JSON.stringify(mobileLayout)}`).toBeLessThanOrEqual(mobileLayout.viewport);
  const mobileStepsFit = await page.evaluate(() => [...document.querySelectorAll('.investigation-journey ol, .audit-stage-nav ol')].every(list => list.scrollWidth <= list.clientWidth + 1));
  expect(mobileStepsFit, 'all investigation steps should be visible without horizontal scrolling on mobile').toBe(true);
  await page.screenshot({ path: testInfo.outputPath('guided-auditor-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1600, height: 900 });

  await stages.getByRole('button', { name: 'Document AI' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Document AI' })).toBeVisible();
  await expect(page.getByText(/Document AI is disabled until server-side provider settings/)).toBeVisible();

  await stages.getByRole('button', { name: /^Review\./ }).click();
  await expect(page.getByRole('tabpanel', { name: 'Review' })).toBeVisible();
  const footer = page.locator('.audit-stage-footer');
  await expect(footer.getByRole('button', { name: 'Open report workspace' })).toBeVisible();
  await footer.getByRole('button', { name: 'Open report workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard\/reports\?sourceId=KAZ_S_159$/);
  const reportJourney = page.getByRole('navigation', { name: 'Investigation workflow' });
  await reportJourney.getByRole('button', { name: /Check report integrity/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/blockchain\?sourceId=KAZ_S_159$/);
});

test('collapsed navigation reveals its label on keyboard focus', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Collapse navigation' }).click();
  const mainNav = page.getByRole('navigation', { name: 'Main navigation' });
  const mapLink = mainNav.getByRole('button', { name: 'Map Explorer' });
  const indicatorsLink = mainNav.getByRole('button', { name: 'MARS Indicators' });
  const casesLink = mainNav.getByRole('button', { name: 'Cases' });
  await mapLink.focus();
  await page.keyboard.press('Tab');
  await expect(indicatorsLink).toBeFocused();
  await expect.poll(() => indicatorsLink.evaluate(element => getComputedStyle(element, '::after').opacity)).toBe('1');
  await expect.poll(() => indicatorsLink.evaluate(element => getComputedStyle(element, '::after').content)).toBe('"MARS Indicators"');
  await casesLink.focus();
  await expect.poll(() => casesLink.evaluate(element => getComputedStyle(element, '::after').content)).toBe('"Cases"');
});

test('global historical map becomes usable when remote basemap tiles are unavailable', async ({ page }, testInfo) => {
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  await page.goto('/dashboard/map?sourceId=KAZ_S_159');
  const mapCanvas = page.locator('.geo-map-canvas canvas');
  const mapStatus = page.locator('.geo-map-topline');
  await expect(mapStatus).toHaveAttribute('role', 'status');
  await expect(mapStatus).toHaveAttribute('aria-live', 'polite');
  await expect(mapCanvas).toBeVisible();
  await expect(mapStatus).toContainText(/\d[\d,]* sources/, { timeout: 20_000 });
  await expect(page.locator('.geo-map-fallback')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('historical-map-tile-fallback.png'), fullPage: true });
});

test('unsaved work is guarded and recovered while separate investigations keep independent scopes', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await scope.getByLabel('Period start').fill('2024-06-07'); await scope.getByLabel('Period end').fill('2024-12-31');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  const work = page.getByRole('region', { name: 'Analyst case work' });
  await work.getByLabel('Open question').fill('First episode investigation');
  await work.getByLabel('Working notes').fill('Unsaved first episode notes');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(work.getByLabel('Working notes')).toHaveValue('Unsaved first episode notes');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor' }).click();
  await expect(work.getByRole('status')).toContainText('Recovered unsaved draft');
  await scope.getByLabel('Period start').fill('2024-07-01');
  page.once('dialog', dialog => dialog.accept());
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await expect(work.getByLabel('Working notes')).toHaveValue('');
  await scope.getByLabel('Period start').fill('2024-06-07');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await expect(work.getByLabel('Working notes')).toHaveValue('Unsaved first episode notes');
  await work.getByLabel('Work status').selectOption('awaiting_evidence');
  await work.getByRole('button', { name: 'Save case work' }).click();
  await work.getByRole('button', { name: 'New investigation', exact: true }).click();
  await expect(work.getByLabel('Open question')).toHaveValue('');
  await scope.getByLabel('Period start').fill('2024-07-01');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await work.getByLabel('Open question').fill('Second episode investigation');
  await work.getByLabel('Work status').selectOption('deferred');
  await work.getByRole('button', { name: 'Save case work' }).click();
  const secondId = await work.getByLabel('Saved investigations').inputValue();
  const firstId = await work.getByLabel('Saved investigations').locator('option').filter({ hasText: 'First episode' }).getAttribute('value');
  await work.getByLabel('Saved investigations').selectOption(firstId!);
  await expect(work.getByLabel('Open question')).toHaveValue('First episode investigation');
  await expect(scope).toContainText('2024-06-07 → 2024-12-31');
  await work.getByLabel('Saved investigations').selectOption(secondId);
  await expect(work.getByLabel('Open question')).toHaveValue('Second episode investigation');
  await expect(scope).toContainText('2024-07-01 → 2024-12-31');
  await page.reload();
  await expect(work.getByLabel('Open question')).toHaveValue('Second episode investigation');
  await expect(scope).toContainText('2024-07-01 → 2024-12-31');
  await work.getByLabel('Saved investigations').selectOption(firstId!);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Cases', exact: true }).click();
  await expect(work.getByLabel('Open question')).toHaveValue('First episode investigation');
  await page.getByLabel('Filter by work status').selectOption('awaiting_evidence');
  await expect(page.getByTestId('cases-table')).toContainText('2 saved investigations');
  await expect(page.getByTestId('cases-table')).toContainText('Awaiting evidence');
  await work.getByLabel('Working notes').fill('Case filter must preserve this draft');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('textbox', { name: 'Search cases', exact: true }).fill('CAN_S_002');
  await expect(page.getByRole('textbox', { name: 'Search cases', exact: true })).toHaveValue('');
  await expect(work.getByLabel('Working notes')).toHaveValue('Case filter must preserve this draft');
  await work.getByRole('button', { name: 'Save case work' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('multiple-investigations-mobile.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('human drafts recover exact metadata without credentials or inspection confirmation and skip optional AI', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await scope.getByLabel('Period start').fill('2024-06-07'); await scope.getByLabel('Period end').fill('2024-12-31');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.getByRole('button', { name: /^Human assessment\./ }).click();
  const human = page.getByRole('region', { name: 'Human evidence assessment' });
  await human.getByLabel('Exact claim for human assessment').fill('The source requires independent follow-up evidence for this period.');
  await human.getByLabel('Reason for your determination').fill('The available metadata does not establish the documented action and follow-up.');
  await human.getByLabel('Next evidence request').fill('Obtain dated action and follow-up records.');
  await human.getByRole('button', { name: 'Add evidence reference' }).click();
  await human.getByLabel('Reference title').fill('Temporary title'); await human.getByLabel('Reference title').clear();
  await human.getByLabel('Reference URL', { exact: true }).fill('unfinished URL');
  await human.getByLabel('Human assessment reviewer token (session only)').fill('DO-NOT-PERSIST-DRAFT-TOKEN');
  await human.getByLabel('I inspected the source material').check();
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('methane-session-draft-v1:human:')).map(k => sessionStorage.getItem(k)).join(''))).not.toContain('DO-NOT-PERSIST');
  await page.getByRole('button', { name: /^Overview\./ }).click();
  await scope.getByLabel('Period start').fill('2024-07-01');
  page.once('dialog', dialog => dialog.dismiss());
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await expect(scope).toContainText('2024-06-07 → 2024-12-31');
  page.once('dialog', dialog => dialog.accept());
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await scope.getByLabel('Period start').fill('2024-06-07');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.getByRole('button', { name: /^Human assessment\./ }).click();
  await expect(human.getByLabel('Next evidence request')).toHaveValue('Obtain dated action and follow-up records.');
  await expect(human.getByLabel('Reference title')).toHaveValue('');
  await expect(human.getByLabel('Reference URL', { exact: true })).toHaveValue('unfinished URL');
  await expect(human.getByLabel('Human assessment reviewer token (session only)')).toHaveValue('');
  await expect(human.getByLabel('I inspected the source material')).not.toBeChecked();
  page.once('dialog', dialog => dialog.accept()); await page.reload();
  await page.getByRole('button', { name: /^Human assessment\./ }).click();
  await expect(human.getByLabel('Next evidence request')).toHaveValue('Obtain dated action and follow-up records.');
  await page.getByRole('button', { name: 'Next: Review', exact: true }).click();
  await expect(page.locator('#audit-stage-review')).toBeVisible();
  await page.getByRole('button', { name: /^Overview\./ }).click();
  await expect(page.getByRole('region', { name: 'Claim evidence coverage' })).toContainText('excluded by scope / requirements');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('scoped-coverage-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('chain recovery controls protect credentials and never retry a pending write (UI fixture)', async ({ page }, testInfo) => {
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/audits' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  const audit = await (await created).json();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Blockchain', exact: true }).click();
  const controls = page.getByRole('region', { name: 'Authorized blockchain operations' });
  await expect(controls).toBeVisible();
  await expect(controls.getByRole('button', { name: 'Anchor current audit' })).toBeDisabled();
  await controls.getByLabel('Anchor access token').fill('DEMO-UI-fixture-only');
  await expect(controls.getByLabel('Anchor access token')).toHaveAttribute('type', 'password');
  await controls.getByRole('button', { name: 'Check saved transaction' }).click();
  await expect(controls.getByRole('alert')).toContainText('authorization required');
  // UI-only response fixture; no public transaction is submitted or asserted by this browser test.
  const intent = { auditId: audit.auditId, bundleHash: audit.bundleHash, txHash: `0x${'d'.repeat(64)}`, state: 'pending', chainId: 11155111,
    registryAddress: `0x${'e'.repeat(40)}`, issuer: `0x${'f'.repeat(40)}`, expectedVersion: 1, confirmations: 2 };
  let pending = false, statusAvailable = true;
  const target = { chainId: 11155111, registryAddress: intent.registryAddress, issuer: intent.issuer, confirmations: 2, writeEnabled: true };
  await page.route('**/api/audits/*/anchor-status', route => route.fulfill(statusAvailable ? { json: { auditId: audit.auditId, intent: pending ? intent : null, target } } : { status: 503, json: { error: 'DEMO status unavailable' } }));
  let reconcileCalls = 0, broadcastCalls = 0;
  await page.route('**/api/audits/*/reconcile', route => { reconcileCalls++; return route.fulfill({ status: 202, json: { status: 'pending', intent } }); });
  await page.route('**/api/audits/*/anchor', route => { broadcastCalls++; return route.abort(); });
  await expect(controls.getByRole('button', { name: 'Anchor current audit' })).toBeDisabled();
  await controls.getByRole('button', { name: 'Check saved transaction' }).focus();
  await page.keyboard.press('Enter');
  await expect(controls.getByRole('status')).toContainText('No saved transaction intent');
  await expect(controls.getByRole('button', { name: 'Anchor current audit' })).toBeEnabled();
  await expect(controls).toContainText(`Configured target: Sepolia testnet · ${target.registryAddress}`);
  page.once('dialog', async dialog => { expect(dialog.message()).toContain(target.registryAddress); await dialog.dismiss(); });
  await controls.getByRole('button', { name: 'Anchor current audit' }).click();
  expect(broadcastCalls).toBe(0);
  statusAvailable = false;
  await controls.getByRole('button', { name: 'Check saved transaction' }).click();
  await expect(controls.getByRole('alert')).toContainText('DEMO status unavailable');
  await expect(controls.getByRole('button', { name: 'Anchor current audit' })).toBeDisabled();
  statusAvailable = true; pending = true;
  await controls.getByRole('button', { name: 'Check saved transaction' }).click();
  await expect(controls.getByRole('status')).toContainText('Pending — reconcile');
  await expect(controls.getByRole('button', { name: 'Anchor current audit' })).toBeDisabled();
  await controls.getByRole('button', { name: 'Reconcile transaction' }).click();
  await expect(controls.getByRole('status')).toContainText('Pending — reconcile');
  expect(reconcileCalls).toBe(1); expect(broadcastCalls).toBe(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('DEMO-UI-fixture-only');
  await page.screenshot({ path: testInfo.outputPath('DEMO-chain-controls-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('DEMO-chain-controls-mobile.png'), fullPage: true });
  await controls.getByRole('button', { name: 'Clear credential' }).click();
  await expect(controls.getByLabel('Anchor access token')).toHaveValue('');
});
