import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';
import { unexpectedCredentialEnvironmentNames } from './environment-assertions';

const fixtureTitle = 'Dowd et al. (2024), First validation of high-resolution satellite-derived methane emissions from an active gas leak in the UK';
const fixtureQuote = 'After detecting the leak in March 2023, the local utility company was contacted, and the leak was fixed by mid-June 2023.';
const fixtureExcerpt = fixtureQuote;
const fixtureSourceUrl = 'https://amt.copernicus.org/articles/17/1599/2024/amt-17-1599-2024.html';
const fixtureAttribution = 'Dowd et al. (2024), Atmospheric Measurement Techniques, 17, 1599–1615, DOI 10.5194/amt-17-1599-2024, CC BY 4.0.';
const claimText = 'For KAZ_S_159, this article reports that the leak was fixed by mid-June 2023.';

test('shared team investigations import explicitly, hand off across isolated sessions, and retain conflicting drafts', async ({ page, browser, request }, testInfo) => {
  const alice = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review', 'private_read'], 600);
  const bob = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'team-demo-bob', ['review', 'private_read'], 600);
  const secondContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const second = await secondContext.newPage();
  const errors: string[] = [];
  for (const target of [page, second]) {
    target.on('pageerror', error => errors.push(error.message));
    await target.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await target.setViewportSize({ width: 1440, height: 1000 });
    await target.goto('/dashboard/audit?sourceId=KAZ_S_159');
    await target.locator('#claim-audit').selectOption('source_detected');
    await expect(target.getByRole('region', { name: 'Analyst case work' })).toBeVisible();
  }
  try {
    const local = page.getByRole('region', { name: 'Analyst case work' });
    await local.getByLabel('Open question').fill('DEMO P1 import and team handoff');
    await local.getByLabel('Working notes').fill('DEMO original browser note');
    await local.getByRole('button', { name: 'Save case work', exact: true }).click();
    const connect = async (target: typeof page, token: string) => {
      await target.getByRole('button', { name: 'Open shared workspace', exact: true }).click();
      const panel = target.getByRole('region', { name: 'Shared case work', exact: true });
      await panel.getByLabel('Shared reviewer token (memory only)').fill(token);
      await panel.getByRole('button', { name: 'Connect shared workspace', exact: true }).click();
      await expect(panel.getByLabel('Shared investigations')).toBeVisible();
      return panel;
    };
    const shared = await connect(page, alice);
    await shared.getByRole('button', { name: 'Preview browser import', exact: true }).click();
    await expect(shared.getByRole('region', { name: 'Browser import preview' })).toContainText('DEMO original browser note');
    const importing = page.waitForResponse(response => response.url().includes('/api/case-work/') && response.request().method() === 'PUT');
    await shared.getByRole('button', { name: 'Import as new shared investigation', exact: true }).click();
    const importedResponse = await importing; expect(importedResponse.status()).toBe(201);
    const imported = (await importedResponse.json()).work;
    await expect(shared.getByLabel('Working notes')).toHaveValue('DEMO original browser note');
    const teammate = await connect(second, bob);
    const releaseOldHistories: (() => void)[] = [];
    let allowLatestHistory = false;
    let deliveredOldHistories = 0;
    await second.route(`**/api/case-work/${imported.workId}?*`, async route => {
      if (allowLatestHistory) { await route.continue(); return; }
      const response = await route.fetch();
      expect((await response.json()).work.revision).toBe(1);
      // React StrictMode may start a cancelled first effect too; hold every old response.
      await new Promise<void>(resolve => { releaseOldHistories.push(resolve); });
      await route.fulfill({ response });
      deliveredOldHistories++;
    });
    await teammate.getByLabel('Shared investigations').selectOption(`${imported.context.sourceId}/${imported.workId}`);
    await expect.poll(() => releaseOldHistories.length).toBeGreaterThan(0);
    await expect(teammate.getByLabel('Working notes')).toHaveValue('DEMO original browser note');
    await teammate.getByLabel('Working notes').fill('DEMO Bob retained draft');
    await shared.getByLabel('Working notes').fill('DEMO Alice accepted revision');
    await shared.getByLabel('Assignee reviewer ID').fill('team-demo-bob');
    await shared.getByLabel('Due date').fill('2026-10-20');
    await shared.getByRole('button', { name: 'Save shared work', exact: true }).click();
    await expect(shared).toContainText('Saved shared revision 2');
    await teammate.getByRole('button', { name: 'Save shared work', exact: true }).click();
    await expect(teammate.getByRole('alert')).toContainText('changed');
    await expect(teammate.getByLabel('Working notes')).toHaveValue('DEMO Bob retained draft');
    allowLatestHistory = true;
    await teammate.getByRole('button', { name: 'Review latest revision', exact: true }).click();
    await expect(teammate.getByRole('region', { name: 'Latest shared revision' })).toContainText('DEMO Alice accepted revision');
    await expect(teammate.getByRole('region', { name: 'Shared revision history' })).toContainText('Revision 2');
    releaseOldHistories.forEach(release => release());
    await expect.poll(() => deliveredOldHistories).toBe(releaseOldHistories.length);
    await second.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(teammate.getByRole('region', { name: 'Shared revision history' })).toContainText('Revision 2');
    await teammate.getByLabel('I reviewed the differences before applying my draft').check();
    await teammate.getByLabel('Assignee reviewer ID').fill('team-demo-bob');
    await teammate.getByLabel('Due date').fill('2026-10-20');
    await teammate.getByRole('button', { name: 'Keep my draft on this revision', exact: true }).click();
    await teammate.getByRole('button', { name: 'Save shared work', exact: true }).click();
    await expect(teammate).toContainText('Saved shared revision 3');
    const query = new URLSearchParams({ ...imported.context, synthetic: String(imported.context.synthetic) });
    const result = await request.get(`/api/case-work/${imported.workId}?${query}`, { headers: { authorization: `Bearer ${alice}` } });
    expect(result.status()).toBe(200);
    expect((await result.json()).history.map((item: { updatedBy: string }) => item.updatedBy)).toEqual(['trust-demo-reviewer', 'trust-demo-reviewer', 'team-demo-bob']);
    await second.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Cases', exact: true }).click();
    await expect(second.getByText('Shared team queue for team-demo-bob.', { exact: false })).toBeVisible();
    await second.getByLabel('Filter by work status').selectOption('investigate');
    await expect(second.getByTestId('cases-table').locator('tbody tr')).toHaveCount(1);
    await expect(second.getByTestId('cases-table')).toContainText('KAZ_S_159');
    await second.getByRole('region', { name: 'Shared case work', exact: true }).getByLabel('Assigned to me').check();
    expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('DEMO original browser note')))).toBe(true);
    for (const target of [page, second]) {
      expect(await target.evaluate(tokens => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => tokens.some(token => value.includes(token))), [alice, bob])).toBe(false);
    }
    await teammate.getByRole('region', { name: 'Shared revision history' }).screenshot({ path: testInfo.outputPath('shared-casework-history-desktop.png') });
    await second.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => second.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await teammate.screenshot({ path: testInfo.outputPath('shared-casework-mobile.png') });
    await page.reload();
    await page.getByRole('region', { name: 'Analyst case work' }).getByLabel('Saved investigations').selectOption('default');
    await expect(page.getByRole('region', { name: 'Analyst case work' }).getByLabel('Working notes')).toHaveValue('DEMO original browser note');
    const reconnected = await connect(page, alice);
    await reconnected.getByLabel('Shared investigations').selectOption(`${imported.context.sourceId}/${imported.workId}`);
    await expect(reconnected.getByLabel('Working notes')).toHaveValue('DEMO Bob retained draft');
    await reconnected.getByLabel('Working notes').fill('DEMO retained while shared storage is unavailable');
    await page.route('**/api/case-work?*', route => route.fulfill({ status: 503, json: { error: 'Shared storage unavailable' } }));
    await reconnected.getByRole('button', { name: 'Refresh shared queue', exact: true }).click();
    await expect(reconnected.getByRole('button', { name: 'Save shared work', exact: true })).toBeDisabled();
    await expect(reconnected.getByLabel('Shared investigations').locator('option')).toHaveCount(1);
    await expect(reconnected.getByRole('region', { name: 'Shared revision history' })).toHaveCount(0);
    await expect(reconnected.getByLabel('Working notes')).toHaveValue('DEMO retained while shared storage is unavailable');
    await page.unroute('**/api/case-work?*');
    await reconnected.getByRole('button', { name: 'Refresh shared queue', exact: true }).click();
    await expect(reconnected.getByRole('button', { name: 'Save shared work', exact: true })).toBeEnabled();
    await expect(reconnected.getByLabel('Working notes')).toHaveValue('DEMO retained while shared storage is unavailable');
    await expect(reconnected.getByRole('region', { name: 'Shared revision history' })).toContainText('Revision 3');
    expect(errors).toEqual([]);
  } finally { await secondContext.close(); }
});

test('DEMO trust controls publish only an opted-in redacted summary with independently checked checksum', async ({ page, request }, testInfo) => {
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review', 'private_read'], 600);
  const pageErrors: string[] = []; let aiRequests = 0;
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/intelligence/assessments') aiRequests++; });
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor', exact: true }).click();
  await page.locator('#claim-audit').selectOption('source_detected');
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await scope.getByLabel('Period start').fill('2026-09-01');
  await scope.getByLabel('Period end').fill('2026-09-30');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.getByRole('navigation', { name: 'Evidence audit steps' }).getByRole('button', { name: /^Human assessment/ }).click();
  const human = page.getByRole('region', { name: 'Human evidence assessment' });
  await human.getByLabel('Human assessment reviewer token (session only)').fill(token);
  await human.getByRole('button', { name: 'Check reviewer approval' }).click();
  await expect(human).toContainText('Operator-attested identity and claim authority');
  await human.getByLabel('Exact claim for human assessment').fill('PRIVATE DEMO claim: a synthetic detection was registered in September.');
  await human.getByLabel('Reason for your determination').fill('PRIVATE DEMO reasoning: I inspected the fictional reference for this synthetic workflow test.');
  await human.getByRole('combobox', { name: /^Your determination/ }).selectOption('supported');
  await human.getByRole('button', { name: 'Add evidence reference' }).click();
  await human.getByLabel('Reference kind').selectOption('detection');
  await human.getByLabel('Reference title').fill('PRIVATE DEMO fixture');
  await human.getByLabel('Reference URL', { exact: true }).fill('https://example.org/PRIVATE-demo-reference');
  await human.getByLabel('Page / record locator').fill('PRIVATE DEMO row 1');
  await human.getByLabel('Evidence date').fill('2026-09-01');
  await human.getByLabel('Conflict of interest declaration').selectOption('none_declared');
  await human.getByLabel('Check public publisher references when saving').check();
  await human.getByLabel('I authorize a public redacted summary').check();
  await human.getByLabel('I inspected the source material').check();
  const created = page.waitForResponse(response => response.url().endsWith('/api/human-assessments') && response.request().method() === 'POST');
  await human.getByRole('button', { name: 'Save human determination', exact: true }).click();
  const response = await created; expect(response.status()).toBe(201);
  const { audit } = await response.json();
  expect(audit.synthetic).toBe(true);
  await expect(human.getByRole('region', { name: 'Assessment trust record' })).toContainText('not checked');
  await expect(human.getByLabel('I authorize a public redacted summary')).not.toBeChecked();
  await human.getByLabel('Human assessment reviewer token (session only)').clear();
  expect((await request.get(`/api/audits/${audit.auditId}`)).status()).toBe(404);
  const publicResponse = await request.get(`/api/transparency/${audit.auditId}`);
  expect(publicResponse.status()).toBe(200);
  const publicRecord = await publicResponse.json();
  expect(JSON.stringify(publicRecord)).not.toContain('PRIVATE');
  expect(JSON.stringify(publicRecord)).not.toContain('trust-demo-reviewer');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const summaries = page.getByRole('region', { name: 'Public transparency summaries' });
  await expect(summaries).toContainText('Summary checksum matches');
  await expect(summaries).not.toContainText('PRIVATE');
  await expect(page.getByText('Private assessment: this preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download JSON report (private)', exact: true })).toBeEnabled();
  const downloading = page.waitForEvent('download');
  await summaries.getByRole('button', { name: `Download summary revision ${audit.revision}`, exact: true }).click();
  const downloaded = await downloading;
  const summaryFile = await readFile((await downloaded.path())!, 'utf8');
  expect(JSON.parse(summaryFile)).toEqual(publicRecord);
  const upload = summaries.getByLabel('Verify a public summary JSON');
  await upload.setInputFiles({ name: 'summary.json', mimeType: 'application/json', buffer: Buffer.from(summaryFile) });
  await expect(summaries.getByRole('status')).toContainText('Summary checksum matches. This does not certify');
  await upload.setInputFiles({ name: 'tampered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...publicRecord, summary: { ...publicRecord.summary, result: 'contradicted' } })) });
  await expect(summaries.getByRole('status')).toContainText('Summary verification: invalid');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('trust-transparency-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('trust-transparency-mobile.png'), fullPage: true });
  expect(aiRequests).toBe(0); expect(pageErrors).toEqual([]);
});

test('DEMO publication correction and withdrawal stay consistent after reload and failed refresh', async ({ page, request }, testInfo) => {
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review', 'private_read'], 600);
  const headers = { authorization: `Bearer ${token}` };
  const body = { sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected',
    scope: { startDate: '2026-08-01', endDate: '2026-08-31' }, result: 'insufficient_evidence', evidence: [], sourceInspected: true,
    claimText: 'PRIVATE DEMO publication lifecycle assessment claim.', rationale: 'PRIVATE DEMO reasoning remains confidential throughout publication.', publicSummaryConsent: true };
  const create = async (extra = {}) => {
    const response = await request.post('/api/human-assessments', { headers, data: { ...body, ...extra } });
    expect(response.status()).toBe(201); return (await response.json()).audit;
  };
  const first = await create();
  const privateRevision = await create({ parentAuditId: first.auditId, publicSummaryConsent: false });
  const corrected = await create({ parentAuditId: privateRevision.auditId });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  const reports = () => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await reports();
  const panel = page.getByRole('region', { name: 'Public transparency summaries' });
  const current = panel.locator(`li[data-audit-id="${corrected.auditId}"]`);
  await expect(current).toContainText('Published');
  await expect(panel.locator(`li[data-audit-id="${first.auditId}"]`)).toHaveCount(0);
  await panel.getByLabel('Show publication history').check();
  await expect(panel.locator(`li[data-audit-id="${first.auditId}"]`)).toContainText('Superseded');
  await expect(panel).not.toContainText(privateRevision.auditId);
  await panel.getByText('Reviewer publication controls', { exact: true }).click();
  await panel.getByLabel('Publication reviewer token (session only)').fill(token);
  await current.getByRole('button', { name: 'Withdraw publication' }).focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: 'Confirm withdrawal', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Cancel withdrawal', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Confirm withdrawal', exact: true })).toHaveCount(0);
  await current.getByRole('button', { name: 'Withdraw publication' }).click();
  await panel.getByLabel('Withdrawal reason').selectOption('evidence_under_review');
  await panel.getByLabel('I confirm withdrawing this public summary').check();
  const saved = page.waitForResponse(response => response.url().endsWith(`/api/transparency/${corrected.auditId}/withdraw`));
  await panel.getByRole('button', { name: 'Confirm withdrawal', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect((await saved).status()).toBe(200);
  await expect(current).toContainText('Withdrawn');
  await expect(current).toContainText('Evidence requires further review');
  await panel.getByRole('button', { name: 'Clear publication credential' }).click();
  expect(await page.evaluate(secret => [localStorage, sessionStorage].every(storage => Object.values(storage).every(value => !String(value).includes(secret))), token)).toBe(true);
  const direct = await request.get(`/api/transparency/${first.auditId}`);
  expect((await direct.json()).publication.replacementAuditId).toBe(corrected.auditId);
  expect((await request.get(`/api/transparency/${corrected.auditId}/verify`)).status()).toBe(200);
  expect((await request.get(`/api/audits/${corrected.auditId}`)).status()).toBe(404);
  await page.reload();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await reports();
  await expect(current).toContainText('Withdrawn');
  await page.screenshot({ path: testInfo.outputPath('DEMO-publication-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('DEMO-publication-mobile.png'), fullPage: true });
  await page.route('**/api/transparency?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"DEMO unavailable"}' }));
  await panel.getByRole('button', { name: 'Refresh public summaries' }).click();
  await expect(panel.getByRole('alert')).toBeVisible();
  await expect(current).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('DEMO publication history loads older pages without reviving superseded versions', async ({ page, request }) => {
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'publication-demo-reviewer', ['review', 'private_read'], 600);
  let parent: string | undefined;
  const ids: string[] = [];
  for (let index = 0; index < 11; index++) {
    const response = await request.post('/api/human-assessments', { headers: { authorization: `Bearer ${token}` }, data: {
      sourceId: 'DEMO-002', datasetSnapshotId: 'DEMO', claimType: 'source_detected', scope: { startDate: '2026-07-01', endDate: '2026-07-31' },
      result: 'insufficient_evidence', evidence: [], sourceInspected: true, publicSummaryConsent: true,
      claimText: 'PRIVATE DEMO paginated synthetic source evidence assessment.', rationale: `PRIVATE DEMO revision ${index + 1} requires additional reference inspection.`,
      ...(parent ? { parentAuditId: parent } : {}),
    } });
    expect(response.status()).toBe(201); parent = (await response.json()).audit.auditId; ids.push(parent!);
  }
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard'); await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search source cases for evidence audit' }).fill('DEMO-002');
  await page.getByRole('combobox', { name: 'Matching source cases for evidence audit' }).selectOption('DEMO-002');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Public transparency summaries' });
  await expect(panel.locator('li[data-audit-id]')).toHaveCount(1);
  await expect(panel.locator(`li[data-audit-id="${ids.at(-1)}"]`)).toContainText('Published');
  await panel.getByLabel('Show publication history').check();
  await expect(panel.locator('li[data-audit-id]')).toHaveCount(10);
  await panel.getByRole('button', { name: 'Load older public summaries', exact: true }).click();
  await expect(panel.locator('li[data-audit-id]')).toHaveCount(11);
  await expect(panel.locator(`li[data-audit-id="${ids[0]}"]`)).toContainText('Superseded');
  await expect(panel).not.toContainText('PRIVATE');
});

test('DEMO human correction recovers its parent after a baseline and protects an unsaved draft', async ({ page, request }) => {
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'publication-demo-reviewer', ['review', 'private_read'], 600);
  const scope = { startDate: '2026-05-01', endDate: '2026-05-31' };
  const created = await request.post('/api/human-assessments', { headers: { authorization: `Bearer ${token}` }, data: {
    sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected', scope,
    claimText: 'PRIVATE DEMO recover the parent human determination.', rationale: 'PRIVATE DEMO additional inspection is still required.',
    result: 'insufficient_evidence', evidence: [], sourceInspected: true, publicSummaryConsent: true,
  } });
  expect(created.status()).toBe(201); const first = (await created.json()).audit;
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard'); await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Evidence Auditor', exact: true }).click();
  const scopePanel = page.getByRole('region', { name: 'Assessment scope' });
  await page.locator('#claim-audit').selectOption('source_detected');
  await scopePanel.getByLabel('Period start').fill(scope.startDate); await scopePanel.getByLabel('Period end').fill(scope.endDate);
  await scopePanel.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.getByRole('button', { name: 'Run rules baseline', exact: true }).click();
  await page.getByRole('navigation', { name: 'Evidence audit steps' }).getByRole('button', { name: /^Human assessment/ }).click();
  const human = page.getByRole('region', { name: 'Human evidence assessment' });
  await human.getByLabel('Human assessment reviewer token (session only)').fill(token);
  await human.getByLabel('Exact claim for human assessment').fill('DEMO unsaved draft should survive cancellation.');
  page.once('dialog', dialog => dialog.dismiss());
  await human.getByRole('button', { name: 'Load latest human assessment', exact: true }).click();
  await expect(human.getByLabel('Exact claim for human assessment')).toHaveValue('DEMO unsaved draft should survive cancellation.');
  page.once('dialog', dialog => dialog.accept());
  await human.getByRole('button', { name: 'Load latest human assessment', exact: true }).click();
  await expect(human).toContainText('Loaded human revision 1.');
  await expect(human.getByLabel('I authorize a public redacted summary')).not.toBeChecked();
  await expect(human.getByLabel('I inspected the source material')).not.toBeChecked();
  await human.getByLabel('Reason for your determination').fill('PRIVATE DEMO revised inspection still requires stronger evidence.');
  await human.getByLabel('I inspected the source material').check();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/human-assessments') && response.request().method() === 'POST');
  await human.getByRole('button', { name: 'Save revised human determination', exact: true }).click();
  const response = await saved; expect(response.status()).toBe(201);
  const corrected = (await response.json()).audit;
  expect(corrected.revision).toBe(3); expect(corrected.bundle.humanAssessment.parentBundleHash).toBe(first.bundleHash);
  expect((await (await request.get(`/api/transparency/${first.auditId}`)).json()).publication.status).toBe('published');
  expect((await request.get(`/api/transparency/${corrected.auditId}`)).status()).toBe(404);
});

test('DEMO withdrawal reloads the current list after a concurrent public correction', async ({ page, request }) => {
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review', 'private_read'], 600);
  const body = { sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected', scope: { startDate: '2026-04-01', endDate: '2026-04-30' },
    claimText: 'PRIVATE DEMO concurrent publication correction.', rationale: 'PRIVATE DEMO further inspection remains required.', result: 'insufficient_evidence', evidence: [], sourceInspected: true, publicSummaryConsent: true };
  const create = async (parentAuditId?: string) => {
    const response = await request.post('/api/human-assessments', { headers: { authorization: `Bearer ${token}` }, data: { ...body, ...(parentAuditId ? { parentAuditId } : {}) } });
    expect(response.status()).toBe(201); return (await response.json()).audit;
  };
  const first = await create();
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard'); await page.getByRole('button', { name: 'Synthetic demo', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Public transparency summaries' });
  const oldRow = panel.locator(`li[data-audit-id="${first.auditId}"]`);
  await expect(oldRow).toContainText('Published');
  const corrected = await create(first.auditId);
  await oldRow.getByRole('button', { name: 'Check current publication status', exact: true }).click();
  await expect(oldRow).toContainText('Superseded');
  await panel.getByText('Reviewer publication controls', { exact: true }).click();
  await panel.getByLabel('Publication reviewer token (session only)').fill(token);
  await oldRow.getByRole('button', { name: 'Withdraw publication', exact: true }).click();
  await panel.getByLabel('I confirm withdrawing this public summary').check();
  await panel.getByRole('button', { name: 'Confirm withdrawal', exact: true }).click();
  await expect(oldRow).toHaveCount(0);
  await expect(panel.locator(`li[data-audit-id="${corrected.auditId}"]`)).toContainText('Published');
});

type ExportedReview = {
  latestAudit?: {
    auditId?: string;
    sourceId?: string;
    claimType?: string;
    result?: string;
    revision?: number;
    bundleHash?: string;
    anchored?: boolean;
    synthetic?: boolean;
    bundle?: {
      reason?: string;
      intelligence?: {
        reviewStatus?: string;
        claimText?: string;
        claimTextSha256?: string;
        assessmentInputSha256?: string;
        quotations?: Array<{ documentId: string; quote: string }>;
        documentDigests?: Array<{ title: string; rightsDeclared?: string; licenseName?: string; licenseUrl?: string; attribution?: string; licenseScopeConfirmed?: boolean; sha256?: string }>;
        review?: { reviewerId?: string; note?: string; sourceInspected?: boolean; parentBundleHash?: string };
        citationPublication?: { status?: string; authorConsent?: boolean };
      };
    };
  };
  sourceDataset?: { snapshotId?: string };
};

test('human-only evidence decisions save private revisions and export without invoking document AI', async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  const secret = process.env.METHANE_E2E_REVIEWER_SECRET!;
  const token = issueReviewerToken(secret, 'human-only-analyst', ['review', 'private_read'], 600);
  const pageErrors: string[] = [];
  let aiRequests = 0;
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/intelligence/assessments') aiRequests++; });
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await expect(page.getByRole('region', { name: 'Claim evidence coverage' })).toContainText('3 loaded observation records');
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await scope.getByLabel('Period start').fill('2024-06-07');
  await scope.getByLabel('Period end').fill('2024-12-31');
  await scope.getByLabel('Observation event').selectOption('82758651-76f4-4e06-b4ab-c247ce765192');
  await scope.getByLabel('Intended notification recipient').fill('Test facility operator');
  await page.locator('#claim-audit').selectOption('operator_notified');
  // Claim selection resets the scope draft; apply after choosing the claim.
  await scope.getByLabel('Period start').fill('2024-06-07');
  await scope.getByLabel('Period end').fill('2024-12-31');
  await scope.getByLabel('Observation event').selectOption('82758651-76f4-4e06-b4ab-c247ce765192');
  await scope.getByLabel('Intended notification recipient').fill('Test facility operator');
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await page.getByRole('navigation', { name: 'Evidence audit steps' }).getByRole('button', { name: /^Human assessment/ }).click();
  const human = page.getByRole('region', { name: 'Human evidence assessment' });
  await human.getByLabel('Exact claim for human assessment').fill('CONFIDENTIAL: the test facility operator received a notice for the June 2024 event.');
  await human.getByRole('combobox', { name: /^Your determination/ }).selectOption('supported');
  await human.getByRole('button', { name: 'Add evidence reference' }).click();
  await human.getByLabel('Reference kind').selectOption('notification');
  await human.getByLabel('Reference title').fill('CONFIDENTIAL test receipt');
  await human.getByLabel('Reference URL', { exact: true }).fill('https://example.org/test-private-receipt');
  await human.getByLabel('Page / record locator').fill('Page 2, delivery row');
  await human.getByLabel('Evidence date').fill('2024-06-10');
  await human.getByLabel('Recorded notification recipient').fill('Test facility operator');
  await human.getByLabel('Reason for your determination').fill('CONFIDENTIAL: I inspected this fixture receipt and matched the recipient, date and event.');
  await human.getByLabel('Human assessment reviewer token (session only)').fill(token);
  await human.getByLabel('I inspected the source material').check();
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/human-assessments') && response.request().method() === 'POST');
  await human.getByRole('button', { name: 'Save human determination', exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const first = (await created.json()).audit;
  await expect(human.locator('.human-saved-result')).toContainText('Human determination saved · supported');
  await human.getByRole('combobox', { name: /^Your determination/ }).selectOption('insufficient_evidence');
  await human.getByLabel('Reason for your determination').fill('CONFIDENTIAL: I need an independent delivery record before accepting this receipt.');
  await human.getByLabel('Next evidence request').fill('Request the independently attributable delivery register.');
  await human.getByLabel('I inspected the source material').check();
  await human.getByRole('button', { name: 'Save revised human determination' }).click();
  await expect(human.locator('.human-saved-result')).toContainText('Human determination saved · insufficient evidence');
  await expect(human.locator('.human-saved-result')).toContainText('Rules coverage: supported');
  const work = page.getByRole('region', { name: 'Analyst case work' });
  await work.getByLabel('Work status').selectOption('deferred');
  await work.getByLabel('Evidence to request').fill('Existing field request.');
  await work.getByRole('button', { name: 'Save case work' }).click();
  await human.getByRole('button', { name: 'Add saved request to follow-up' }).click();
  await expect(work.getByLabel('Evidence to request')).toHaveValue('Existing field request.\n\nRequest the independently attributable delivery register.');
  await expect(work.getByLabel('Work status')).toHaveValue('deferred');
  await expect(work).toContainText('Follow-up from assessment');
  await work.getByRole('button', { name: 'Save case work' }).click();
  await page.getByRole('button', { name: 'Next: Review', exact: true }).click();
  await expect(page.locator('#audit-stage-review')).toBeVisible();
  await page.getByRole('button', { name: /^Overview\./ }).click();
  await expect(page.locator('.coverage-plan')).toContainText('Review the saved human determination');
  await expect(page.locator('.coverage-plan')).not.toContainText('rules baseline found');
  await page.getByRole('button', { name: /^Human assessment\./ }).click();

  await human.getByLabel('Human assessment reviewer token (session only)').clear();
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('human-assessment-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: testInfo.outputPath('human-assessment-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  expect((await request.get(`/api/audits/${first.auditId}`)).status()).toBe(404);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download investigation brief' }).click();
  const brief = await readFile((await (await download).path())!, 'utf8');
  expect(brief).toContain('Human evidence assessment');
  expect(brief).toContain('PRIVATE REVIEW DRAFT');
  expect(brief).not.toContain('CONFIDENTIAL');
  expect(brief).not.toContain('test-private-receipt');
  const history = page.locator('.audit-history-panel');
  await history.getByLabel('Human reviewer token (session only)').fill(token);
  await history.getByRole('button', { name: 'Unlock private history' }).click();
  await expect(history).toContainText('Human determination · private');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Blockchain', exact: true }).click();
  await page.getByRole('button', { name: 'Verify saved digest' }).click();
  await expect(page.getByText(/Verifier result: Local SHA-256 valid/)).toBeVisible();
  await history.getByRole('button', { name: 'Lock private history' }).click();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download JSON report' })).toBeDisabled();
  expect(aiRequests).toBe(0);
  expect(pageErrors).toEqual([]);
});

test('local mock AI citations receive a separate scoped review and remain private until publication consent', async ({ page }, testInfo) => {
  expect(unexpectedCredentialEnvironmentNames([
    'METHANE_E2E_AI_ACCESS_TOKEN',
    'METHANE_E2E_REVIEWER_SECRET',
  ])).toEqual([]);
  const aiAccessToken = process.env.METHANE_E2E_AI_ACCESS_TOKEN;
  const reviewerSecret = process.env.METHANE_E2E_REVIEWER_SECRET;
  expect(aiAccessToken).toBeTruthy();
  expect(reviewerSecret).toBeTruthy();
  const reviewerToken = issueReviewerToken(reviewerSecret!, 'e2e-reviewer', ['review'], 600);
  const historyToken = issueReviewerToken(reviewerSecret!, 'e2e-reader', ['private_read'], 600);

  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route(/^https?:\/\//, route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') return route.continue();
    return route.abort();
  });

  const statusResponse = await page.request.get(new URL('/api/intelligence/status', 'http://127.0.0.1:4179').toString());
  const capability = await statusResponse.json();
  expect(capability).toMatchObject({
    documentModelConfigured: true,
    humanReviewConfigured: true,
    chainConfigured: false,
    chainWriteConfigured: false,
    modelMode: 'server-side-document-assessment',
  });
  expect(JSON.stringify(capability)).not.toContain(aiAccessToken);
  expect(JSON.stringify(capability)).not.toContain(reviewerSecret);

  // A malformed body is rejected only after the API accepts the ephemeral test token.
  // This checks the runner-to-server environment boundary without invoking the provider.
  const tokenProbe = await page.request.post('http://127.0.0.1:4179/api/intelligence/assessments', {
    headers: { authorization: `Bearer ${aiAccessToken}` },
    data: {},
  });
  expect(tokenProbe.status(), 'ephemeral assessment token reaches the isolated API process').toBe(400);

  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const auditSteps = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await auditSteps.getByRole('button', { name: /Observations/ }).click();
  await expect(page.getByText('KAZ_S_159 · Evidence inventory')).toBeVisible();
  await auditSteps.getByRole('button', { name: /Document AI/ }).click();
  await expect(page.getByText('DOCUMENT AI AVAILABLE', { exact: true })).toBeVisible();
  const validationStatus = page.getByText('Same-snapshot development holdout · prospective/external validation pending', { exact: true });
  await expect(validationStatus).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.app-main')).toHaveCSS('margin-left', '0px');
  await validationStatus.scrollIntoViewIfNeeded();
  await expect(validationStatus).toBeVisible();
  const statusBounds = await validationStatus.boundingBox();
  expect(statusBounds).not.toBeNull();
  expect(statusBounds!.x).toBeGreaterThanOrEqual(0);
  expect(statusBounds!.x + statusBounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth), 'the loaded Auditor layout should fit a 390px viewport').toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('record-recurrence-validation-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByLabel('Exact claim to assess').fill(claimText);
  await page.getByLabel('Source document title').fill(fixtureTitle);
  await page.getByLabel('Document processing rights').selectOption('open_license');
  await expect(page.getByRole('group', { name: 'Open-license details' })).toBeVisible();
  const sourceUrlInput = page.getByLabel('Document URL (required for open license)');
  await expect(sourceUrlInput).toHaveAttribute('required', '');
  await sourceUrlInput.fill(fixtureSourceUrl);
  await expect(page.getByRole('button', { name: 'Assess documented claim' })).toBeDisabled();
  await page.getByLabel('License name').fill('CC BY 4.0');
  await page.getByLabel('License deed URL').fill('https://creativecommons.org/licenses/by/4.0/');
  await page.getByLabel('Required attribution').fill(fixtureAttribution);
  await page.getByLabel('Authorized document excerpt').fill(fixtureExcerpt);
  await page.getByLabel(/I checked that this license and provider terms allow/).check();
  await page.getByLabel('Assessment access token (session only)').fill(aiAccessToken!);
  await page.getByLabel(/I am authorized to process this text and consent to transmission/).check();

  await page.getByRole('button', { name: 'Assess documented claim' }).click();
  await expect(page.getByText(/AI suggestion · insufficient evidence/i)).toBeVisible();
  const mockAiPort = process.env.METHANE_E2E_MOCK_AI_PORT || '43140';
  const earlyMetricsResponse = await page.request.get(`http://127.0.0.1:${mockAiPort}/metrics`);
  expect(earlyMetricsResponse.ok()).toBe(true);
  const earlyMetrics = await earlyMetricsResponse.json();
  expect(earlyMetrics, 'the API should make a grounded first pass and a skeptical second pass').toMatchObject({
    totalRequests: 2,
    firstPassRequests: 1,
    skepticalPassRequests: 1,
    sourceIdMatches: true,
    claimTypeMatches: true,
    claimTextMatches: true,
    exactInputQuoteMatches: true,
    skepticalQuoteMatches: true,
  });
  const evidenceRegion = page.getByRole('region', { name: 'Evidence and predictive' });
  await expect(evidenceRegion.getByText('The exact submitted passages were not conclusive for this claim; human review is required.')).toBeVisible();
  await expect(evidenceRegion.locator('blockquote')).toContainText(fixtureQuote);
  await expect(evidenceRegion.locator('blockquote')).toContainText(fixtureTitle);
  await expect(evidenceRegion).toContainText('Submitter declared open-license basis: CC BY 4.0');
  await expect(evidenceRegion).toContainText(fixtureAttribution);

  await page.getByLabel('Human reviewer token (session only)').fill(reviewerToken);
  await page.getByLabel('Review note').fill('Request an independent follow-up measurement before evaluating the outcome.');
  await page.getByRole('button', { name: 'Request more evidence' }).click();
  await expect(page.getByText(/Human review: more evidence requested · insufficient evidence/i)).toBeVisible();
  await expect(page.getByText(/Revision 2 · 1 exact validated quotation/)).toBeVisible();
  await expect(page.getByText(/report private/)).toBeVisible();

  const downloadReady = page.waitForEvent('download');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports' }).click();
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const download = await downloadReady;
  const downloadedPath = await download.path();
  expect(downloadedPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadedPath!, 'utf8')) as ExportedReview;
  const audit = exported.latestAudit;
  expect(exported.sourceDataset?.snapshotId).toBe('unep-mars-675417694883');
  expect(audit).toMatchObject({
    sourceId: 'KAZ_S_159',
    claimType: 'mitigation_confirmed',
    result: 'insufficient_evidence',
    revision: 2,
    anchored: false,
    synthetic: false,
    bundle: {
      intelligence: {
        reviewStatus: 'needs_more_evidence',
        review: {
          reviewerId: 'e2e-reviewer',
          note: 'Request an independent follow-up measurement before evaluating the outcome.',
          sourceInspected: false,
        },
        citationPublication: { status: 'private', authorConsent: false },
      },
    },
  });
  expect(audit?.bundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(audit?.bundle?.intelligence?.review?.parentBundleHash).toMatch(/^0x[0-9a-f]{64}$/i);
  expect(audit?.bundle?.intelligence?.review?.parentBundleHash).not.toBe(audit?.bundleHash);
  expect(audit?.bundle?.intelligence?.quotations).toEqual([
    expect.objectContaining({ documentId: 'submitted-excerpt-01', quote: fixtureQuote }),
  ]);
  expect(audit?.bundle?.intelligence?.documentDigests).toEqual([
    expect.objectContaining({
      title: fixtureTitle, rightsDeclared: 'open_license', licenseName: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: fixtureAttribution,
      licenseScopeConfirmed: true, sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    }),
  ]);
  expect(audit?.bundle?.intelligence).toMatchObject({
    claimText,
    claimPublication: { status: 'private', authorConsent: false },
  });
  expect(audit?.bundle?.intelligence?.claimTextSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit?.bundle?.intelligence?.assessmentInputSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(audit?.bundle?.reason).toContain('Reviewer requested additional evidence');
  expect(JSON.stringify(audit?.bundle?.intelligence?.documentDigests)).not.toContain(fixtureExcerpt);

  const privateReportPath = `/api/audits/${encodeURIComponent(audit!.auditId!)}`;
  expect((await page.request.get(privateReportPath)).status()).toBe(404);
  expect((await page.request.get(privateReportPath, {
    headers: { authorization: `Bearer ${aiAccessToken}` },
  })).status()).toBe(404);
  expect((await page.request.get(privateReportPath, {
    headers: { authorization: `Bearer ${reviewerToken}` },
  })).status()).toBe(404);

  const providerMetricsResponse = await page.request.get(`http://127.0.0.1:${mockAiPort}/metrics`);
  expect(providerMetricsResponse.ok()).toBe(true);
  expect(await providerMetricsResponse.json()).toMatchObject({
    totalRequests: 2,
    firstPassRequests: 1,
    skepticalPassRequests: 1,
    sourceIdMatches: true,
    claimTypeMatches: true,
    claimTextMatches: true,
    exactInputQuoteMatches: true,
    skepticalQuoteMatches: true,
  });

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Blockchain' }).click();
  await page.getByLabel('Choose a JSON audit report').setInputFiles(downloadedPath!);
  await expect(page.getByText('Audit bundle SHA-256 digest matches.', { exact: true })).toBeVisible();
  await expect(page.getByText('No blockchain receipt is included in this file.', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  const briefReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download investigation brief' }).click();
  const briefFile = await briefReady;
  const brief = await readFile((await briefFile.path())!, 'utf8');
  expect(brief).toContain('PRIVATE REVIEW DRAFT');
  expect(brief).not.toContain(claimText);
  expect(brief).not.toContain(fixtureQuote);
  await page.getByLabel('Human reviewer token (session only)').fill(historyToken);
  await page.getByRole('button', { name: 'Unlock private history' }).click();
  await expect(page.locator('.audit-history-list')).toContainText('Revision 2');
  const comparison = page.getByRole('region', { name: 'Compare saved assessments' });
  await expect(comparison).toContainText('Human review');
  await expect(comparison).toContainText('records the selected earlier bundle as its parent');
  // Simulate normal history navigation without reloading the React session.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/dashboard/reports?sourceId=CAN_S_002');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.locator('.report-summary-grid')).toContainText('CAN_S_002');
  await page.getByRole('button', { name: 'Lock private history' }).click();
  await page.goBack();
  await expect(page.locator('.report-summary-grid')).toContainText('KAZ_S_159');
  await expect(page.getByRole('button', { name: 'Download JSON report' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download investigation brief' })).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test('late document responses stay out of a restarted claim investigation', async ({ page }) => {
  const aiAccessToken = process.env.METHANE_E2E_AI_ACCESS_TOKEN;
  expect(aiAccessToken).toBeTruthy();
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  const steps = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await steps.getByRole('button', { name: /Document AI/ }).click();
  await page.getByLabel('Exact claim to assess').fill(claimText);
  await page.getByLabel('Source document title').fill(fixtureTitle);
  await page.getByLabel('Document processing rights').selectOption('open_license');
  await page.getByLabel('Document URL (required for open license)').fill(fixtureSourceUrl);
  await page.getByLabel('License name').fill('CC BY 4.0');
  await page.getByLabel('License deed URL').fill('https://creativecommons.org/licenses/by/4.0/');
  await page.getByLabel('Required attribution').fill(fixtureAttribution);
  await page.getByLabel('Authorized document excerpt').fill(fixtureExcerpt);
  await page.getByLabel(/I checked that this license and provider terms allow/).check();
  await page.getByLabel('Assessment access token (session only)').fill(aiAccessToken!);
  await page.getByLabel(/I am authorized to process this text and consent to transmission/).check();
  let release: (() => void) | undefined;
  await page.route('**/api/intelligence/assessments', async route => {
    const response = await route.fetch();
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'Assess documented claim' }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await steps.getByRole('button', { name: /Overview/ }).click();
  await page.locator('#claim-audit').selectOption('operator_notified');
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  await steps.getByRole('button', { name: /Document AI/ }).click();
  const received = page.waitForResponse(response => new URL(response.url()).pathname === '/api/intelligence/assessments' && response.request().method() === 'POST');
  release!();
  await (await received).finished();
  await expect(page.getByRole('button', { name: 'Assess documented claim' })).toBeVisible();
  await expect(page.locator('.intel-result')).toHaveCount(0);
  await expect(page.getByLabel('Exact claim to assess')).toHaveValue('');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download JSON report' })).toBeDisabled();
});
