import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';
import { unexpectedCredentialEnvironmentNames } from './environment-assertions';

const fixtureTitle = 'Dowd et al. (2024), First validation of high-resolution satellite-derived methane emissions from an active gas leak in the UK';
const fixtureQuote = 'After detecting the leak in March 2023, the local utility company was contacted, and the leak was fixed by mid-June 2023.';
const fixtureExcerpt = fixtureQuote;
const fixtureSourceUrl = 'https://amt.copernicus.org/articles/17/1599/2024/amt-17-1599-2024.html';
const fixtureAttribution = 'Dowd et al. (2024), Atmospheric Measurement Techniques, 17, 1599–1615, DOI 10.5194/amt-17-1599-2024, CC BY 4.0.';
const claimText = 'For KAZ_S_159, this article reports that the leak was fixed by mid-June 2023.';

test('shared dossier schemas load consistently in the Node ESM browser runner', async () => {
  // Keep shared runtime imports ESM: mixing a top-level transformed require with import()
  // creates a different namespace under Playwright's dual CJS/ESM TypeScript loaders.
  const [dossier, shared] = await Promise.all([import('../packages/shared/src/investigation-dossier'), import('../packages/shared/src/index')]);
  expect(dossier.DOSSIER_POLICY).toBe('connected-investigation/1');
  expect(shared.MarsProvenance.safeParse({}).success).toBe(false);
  expect(typeof shared.CaseWorkDraft.parse).toBe('function');
});

test('connected investigation preserves allocation, evidence request, human review and historical changes in one verifiable dossier', async ({ page, request }, testInfo) => {
  const capture=testInfo.project.name==='connected-capture'?await (await import('../docs/demo/connected-2026-10-20/capture-runtime')).beginConnectedCapture(page,testInfo):null;
  page.setDefaultTimeout(20_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=TKM_S_021');
  capture?.mark('Allocate investigation capacity using historical MARS records');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const review = page.getByLabel('Plan reviewer decisions', { exact: true });
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review','private_read'], 600);
  await review.getByLabel('Plan reviewer token (memory only)').fill(token);
  await review.getByRole('button', { name: 'Connect plan reviewer', exact: true }).click();
  await expect(review).toContainText('Connected as trust-demo-reviewer');
  await review.getByLabel('Plan ID', { exact: true }).fill('DEMO-connected-browser-plan');
  await review.getByLabel('Decision rationale', { exact: true }).fill('DEMO software reviewer accepts this historical allocation for evidence investigation. This is not a human pilot.');
  await review.getByRole('button', { name: 'Save reviewer decision', exact: true }).click();
  await expect(review).toContainText('1 preserved decision revisions');
  capture?.mark('Save an authorized software DEMO allocation decision');
  await planner.getByRole('button', { name: 'Evidence TKM_S_021', exact: true }).click();
  await page.locator('#claim-audit').selectOption('source_detected');
  const scope = page.getByRole('region', { name: 'Assessment scope', exact: true });
  await scope.getByLabel('Period start').fill('2020-10-29');
  await scope.getByLabel('Period end').fill('2026-09-13');
  await scope.getByRole('button', { name: 'Apply assessment scope', exact: true }).click();
  // Plan authentication already established the memory-only shared reviewer session.
  const shared = page.getByRole('region', { name: 'Shared case work', exact: true });
  capture?.mark('Scope the source question and issue a specific evidence request');
  const connected = shared.getByRole('region', { name: 'Connected investigation', exact: true });
  await expect(connected).toBeVisible();
  await shared.getByLabel('Open question', { exact: true }).fill('DEMO investigate the source-specific historical observations and follow-up evidence.');
  await shared.getByLabel('Next action', { exact: true }).fill('DEMO inspect the dated operator report and the follow-up measurement.');
  await connected.getByLabel('Evidence acceptance criteria', { exact: true }).fill('Require source identity, action date, follow-up date, method, units and uncertainty.');
  await connected.getByLabel('Accepted plan ID', { exact: true }).fill('DEMO-connected-browser-plan');
  await connected.getByRole('button', { name: 'Attach accepted plan revision', exact: true }).click();
  await expect(connected).toContainText('accepted revision 1');
  await expect(connected.getByRole('button', { name: 'Download verified investigation dossier', exact: true })).toBeDisabled();
  await shared.getByRole('textbox', { name:'Evidence to request',exact:true }).fill('DEMO obtain source-specific follow-up measurements with method and uncertainty.');
  const lifecycle = connected.locator('details.investigation-lifecycle').filter({has:page.locator('summary', {hasText:'Structured evidence requests'})});
  await lifecycle.locator('summary').click();
  await lifecycle.getByLabel('Request due date',{exact:true}).fill('2026-10-25');
  await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();
  await expect(lifecycle).toContainText('1 issued');
  await shared.getByRole('button', { name: 'Save shared work', exact: true }).click();
  await expect(shared).toContainText('Saved shared revision 1');
  await connected.getByRole('button', { name: 'Check historical changes for this investigation', exact: true }).click();
  await expect(connected).toContainText('Record review recommended');
  await expect(connected).toContainText('persistency');
  await shared.getByRole('button', { name: 'Save shared work', exact: true }).click();
  await expect(shared).toContainText('Saved shared revision 2');
  await page.getByRole('navigation', { name: 'Evidence audit steps' }).getByRole('button', { name: /^Human assessment/ }).click();
  const human = page.getByRole('region', { name: 'Human evidence assessment', exact: true });
  capture?.mark('Record a separate assessment; DEMO reviewer, not a human study');
  await human.getByLabel('Exact claim for human assessment').fill('DEMO analyst question: do the available source records establish the requested source-specific follow-up?');
  await human.getByLabel('Reason for your determination').fill('DEMO software workflow: historical detection metadata does not supply an attributable follow-up report. This is not a domain expert assessment.');
  await human.getByLabel('Next evidence request').fill('DEMO obtain the source-linked follow-up measurement and its observation opportunities.');
  await human.getByLabel('Human assessment reviewer token (session only)').fill(token);
  await human.getByLabel('I inspected the source material').check();
  await expect(human.getByRole('button', { name: 'Save human determination', exact: true })).toBeEnabled();
  await human.getByRole('button', { name: 'Save human determination', exact: true }).click();
  await expect(human.locator('.human-saved-result')).toContainText('Human determination saved');
  await human.getByRole('button', { name: 'Add saved request to follow-up', exact: true }).click();
  await expect(shared.getByRole('textbox', { name: 'Evidence to request', exact: true })).toHaveValue(/source-linked follow-up measurement/);
  await shared.getByRole('button', { name: 'Save shared work', exact: true }).click();
  await expect(shared).toContainText('Saved shared revision 3');
  const pending = page.waitForEvent('download');
  await connected.getByRole('button', { name: 'Download verified investigation dossier', exact: true }).click();
  const download = await pending, bytes = await readFile((await download.path())!, 'utf8'), dossier = JSON.parse(bytes);
  const trusted = await connected.getByLabel('Independent verification digest', { exact: true }).inputValue();
  const { verifyInvestigationDossier, investigationDigest } = await import('../packages/shared/src/investigation-dossier');
  const { CaseWorkDraft } = await import('../packages/shared/src/index');
  expect(await verifyInvestigationDossier(dossier, trusted)).toBe(true);
  expect(dossier.history).toHaveLength(3); expect(dossier.plans).toHaveLength(1); expect(dossier.transitions).toHaveLength(1); expect(dossier.assessments).toHaveLength(1);
  expect(dossier.context.sourceId).toBe('TKM_S_021'); expect(bytes).not.toContain(token);
  const crossOrigin = await page.evaluate(async ({ port, token, context, workId }) => {
    const query = new URLSearchParams({ ...context, synthetic: String(context.synthetic) });
    const response = await fetch(`http://127.0.0.1:${port}/api/case-work/${workId}/dossier?${query}`, { headers: { authorization: `Bearer ${token}` } });
    return { status: response.status, digest: response.headers.get('x-investigation-digest') };
  }, { port: process.env.METHANE_E2E_API_PORT || '43139', token, context: dossier.context, workId: dossier.workId });
  expect(crossOrigin).toEqual({ status: 200, digest: trusted });
  expect(dossier.assessments[0].bundle.humanAssessment.nextEvidenceRequest).toContain('source-linked follow-up measurement');
  await writeFile(testInfo.outputPath('connected-investigation.json'), bytes);
  const peer=await request.put(`http://127.0.0.1:${process.env.METHANE_E2E_API_PORT || '43139'}/api/case-work/DEMO-overlap-peer`,{headers:{authorization:`Bearer ${token}`},data:{context:dossier.context,expectedRevision:0,draft:CaseWorkDraft.parse(dossier.history.at(-1))}});
  expect(peer.status()).toBe(201);
  await connected.locator('summary').filter({hasText:'Check related claims & reused evidence'}).click();
  capture?.mark('Compare saved investigations for potentially reused evidence');
  const overlap=connected.getByRole('region',{name:'Evidence overlap review',exact:true});
  const overlapResponse=page.waitForResponse(response=>response.request().method()==='GET'&&response.url().includes('/evidence-overlap?')&&response.status()===200);
  await overlap.getByRole('button',{name:'Check related evidence',exact:true}).click();
  const overlapReport=await (await overlapResponse).json();
  await writeFile(testInfo.outputPath('evidence-overlap.json'),JSON.stringify(overlapReport));
  await expect(overlap).toContainText('No duplicate mitigation finding');
  await overlap.getByRole('button',{name:'Review DEMO-overlap-peer',exact:true}).click();
  await overlap.getByRole('combobox',{name:'Overlap interpretation',exact:true}).selectOption('legitimate_reuse');
  await overlap.getByRole('textbox',{name:'Overlap review rationale',exact:true}).fill('DEMO software reviewer: the same historical source assessment is reused for a separate investigation question; no duplicate physical mitigation is established.');
  await overlap.getByRole('button',{name:'Add interpretation to draft',exact:true}).click();
  await expect(shared.getByRole('textbox',{name:'Working notes',exact:true})).toHaveValue(/Evidence overlap review: legitimate_reuse/);
  await overlap.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('evidence-overlap-desktop.png')});
  await page.setViewportSize({width:390,height:844});await overlap.scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('evidence-overlap-mobile.png')});await page.setViewportSize({width:1440,height:1000});
  const edited = structuredClone(dossier); edited.history[0].notes = 'DEMO tampered notes';
  const { digest: _, ...payload } = edited; edited.digest = await investigationDigest(payload);
  expect(await verifyInvestigationDossier(edited, trusted)).toBe(false);
  await lifecycle.getByRole('combobox',{name:'Evidence event',exact:true}).selectOption('response_received');
  await lifecycle.getByRole('combobox',{name:'Request to respond to',exact:true}).selectOption({index:1});
  await lifecycle.getByLabel('Response HTTPS reference',{exact:true}).fill('https://example.org/DEMO-authorized-follow-up');
  await lifecycle.getByLabel('Response locator',{exact:true}).fill('DEMO page 2; software fixture only');
  await lifecycle.getByLabel('Original response file SHA-256',{exact:true}).fill('a'.repeat(64));
  await lifecycle.getByRole('combobox',{name:'Processing rights declaration',exact:true}).selectOption('explicit_permission');
  await lifecycle.getByRole('combobox',{name:'Document date precision',exact:true}).selectOption('month');
  await lifecycle.getByLabel('Reported document date',{exact:true}).fill('2026-09');
  await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();
  await shared.getByRole('button',{name:'Save shared work',exact:true}).click(); await expect(shared).toContainText('Saved shared revision 4');
  await lifecycle.getByRole('combobox',{name:'Evidence event',exact:true}).selectOption('response_reviewed');
  await lifecycle.getByRole('combobox',{name:'Response to review',exact:true}).selectOption({index:1});
  await lifecycle.getByLabel('Response review rationale',{exact:true}).fill('DEMO response lacks attributable measurement opportunities; request further evidence.');
  await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();
  await shared.getByRole('button',{name:'Save shared work',exact:true}).click(); await expect(shared).toContainText('Saved shared revision 5');
  const decisionPanel = connected.locator('details.investigation-lifecycle').filter({has:page.locator('summary',{hasText:'Review → freeze decision'})});
  capture?.mark('Review the response and freeze the exact investigation dossier');
  await decisionPanel.locator('summary').click();
  await decisionPanel.getByRole('button',{name:'Inspect decision dossier and history',exact:true}).click();
  await expect(decisionPanel).toContainText('3 evidence events');
  await decisionPanel.getByLabel('Decision rationale',{exact:true}).fill('DEMO software reviewer requests source-specific follow-up; the response alone is insufficient.');
  await decisionPanel.getByLabel('I inspected the scoped source, linked assessment, evidence and exact dossier digest.',{exact:true}).check();
  await decisionPanel.getByRole('button',{name:'Freeze reviewed investigation decision',exact:true}).click();
  await expect(decisionPanel).toContainText('Decision 1 frozen');
  const decisionDownload = page.waitForEvent('download');
  await decisionPanel.getByRole('button',{name:'Verify and download decision 1',exact:true}).click();
  const decisionBytes = await readFile((await (await decisionDownload).path())!,'utf8'), decisionRecord = JSON.parse(decisionBytes);
  const { verifyInvestigationDecision } = await import('../packages/shared/src/investigation-decision');
  expect(await verifyInvestigationDecision(decisionRecord.decision,decisionRecord.decision.digest)).toBe(true);
  expect(decisionRecord.decision.dossier.history).toHaveLength(5);
  expect(decisionRecord.decision.dossier.history[4].requestEvents[1].reportedDate).toEqual({precision:'month',value:'2026-09'});
  expect(decisionRecord.chainStatus).toBe('not_anchored'); expect(decisionBytes).not.toContain(token);
  await writeFile(testInfo.outputPath('frozen-investigation-decision.json'),decisionBytes);
  await decisionPanel.scrollIntoViewIfNeeded(); await page.screenshot({path:testInfo.outputPath('decision-desktop.png')});
  // A later response recommends review without rewriting the frozen determination.
  capture?.mark('New evidence recommends reconsideration without rewriting the frozen decision');
  await lifecycle.getByRole('combobox',{name:'Evidence event',exact:true}).selectOption('response_received');
  await lifecycle.getByRole('combobox',{name:'Request to respond to',exact:true}).selectOption({index:1});
  await lifecycle.getByLabel('Original response file SHA-256',{exact:true}).fill('b'.repeat(64));
  await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();
  await shared.getByRole('button',{name:'Save shared work',exact:true}).click(); await expect(shared).toContainText('Saved shared revision 6');
  await decisionPanel.getByRole('button',{name:'Inspect decision dossier and history',exact:true}).click();
  const revisitDownload = page.waitForEvent('download');
  await decisionPanel.getByRole('button',{name:'Verify and download decision 1',exact:true}).click();
  const revisited = JSON.parse(await readFile((await (await revisitDownload).path())!,'utf8'));
  expect(revisited.decision).toEqual(decisionRecord.decision); expect(revisited.revisit.state).toBe('review_recommended');
  expect(revisited.revisit.reasons[0].code).toBe('new_authorized_response');
  await connected.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('connected-investigation-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await connected.boundingBox())?.width || 0).toBeGreaterThan(280);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await connected.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('connected-investigation-mobile.png') });
  let release!: () => void, started!: () => void;
  const held = new Promise<void>(done => { release = done; }), received = new Promise<void>(done => { started = done; });
  await page.route(`**/api/case-work/${dossier.workId}/change-check?*`, async route => {
    const response = await route.fetch(); started(); await held; await route.fulfill({ response });
  });
  await connected.getByRole('button', { name: 'Check historical changes for this investigation', exact: true }).click();
  await received;
  try {
    const latest = await request.put(`http://127.0.0.1:${process.env.METHANE_E2E_API_PORT || '43139'}/api/case-work/${dossier.workId}`, { headers: { authorization: `Bearer ${token}` }, data: {
      context: dossier.context, expectedRevision: 6, draft: { ...CaseWorkDraft.parse((await (await request.get(`http://127.0.0.1:${process.env.METHANE_E2E_API_PORT || '43139'}/api/case-work/${dossier.workId}?${new URLSearchParams({ ...dossier.context, synthetic:'false' })}`,{headers:{authorization:`Bearer ${token}`}})).json()).work), nextAction: 'DEMO concurrent saved update: inspect new evidence before proceeding.' },
    } });
    expect(latest.status()).toBe(200);
    await shared.getByRole('button', { name: 'Refresh shared queue', exact: true }).click();
    await expect(shared).toContainText('A newer shared revision is available');
  } finally { release(); }
  await expect(connected.getByRole('alert')).toContainText('Investigation changed while checking');
  await expect(connected).not.toContainText('Historical change check attached to the draft');
  expect(errors).toEqual([]);
  await capture?.finish();
});

test('Plan reviewers save authenticated immutable revisions, preserve stale drafts and export verified history', async ({ page, request }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const review = page.getByLabel('Plan reviewer decisions', { exact: true });
  await expect(review.getByRole('button', { name: 'Save reviewer decision', exact: true })).toBeDisabled();
  const token = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'trust-demo-reviewer', ['review','private_read'], 600);
  await review.getByLabel('Plan reviewer token (memory only)').fill(token);
  await review.getByRole('button', { name: 'Connect plan reviewer', exact: true }).click();
  await expect(review).toContainText('Connected as trust-demo-reviewer');
  await review.getByLabel('Plan ID', { exact: true }).fill('DEMO-browser-capacity-plan');
  await review.getByLabel('Decision rationale', { exact: true }).fill('DEMO software workflow review: accept these historical sources for document investigation, not physical repair confirmation.');
  await review.getByRole('button', { name: 'Save reviewer decision', exact: true }).click();
  await expect(review).toContainText('1 preserved decision revisions');
  await review.getByRole('combobox', { name: 'Allocation decision', exact: true }).selectOption('defer');
  await review.getByLabel('Decision rationale', { exact: true }).fill('DEMO second review: defer allocation until the original evidence is inspected. This is not a human pilot.');
  const saveSecond = page.waitForResponse(response => response.url().includes('/api/investigation-plans/') && response.request().method() === 'PUT').then(async response => ({url:response.url(),requestData:response.request().postDataJSON(),saved:await response.json()}));
  await review.getByRole('button', { name: 'Save reviewer decision', exact: true }).click();
  const secondResponse = await saveSecond, saved = secondResponse.saved;
  await expect(review).toContainText('2 preserved decision revisions');
  await expect(review).toContainText('accept these historical sources');
  const concurrent = await request.put(secondResponse.url, { headers: { Authorization: `Bearer ${token}` }, data: {
    ...secondResponse.requestData, expectedRevision: 2, expectedHead: saved.revisions.at(-1).hash,
    rationale: 'DEMO concurrent software review: additional documents are required. This is not a real human study.',
  } });
  expect(concurrent.status()).toBe(200);
  const retained = 'DEMO retained analyst draft must survive a conflicting save and explicit history reload.';
  await review.getByLabel('Decision rationale', { exact: true }).fill(retained);
  await review.getByRole('button', { name: 'Save reviewer decision', exact: true }).click();
  await expect(review.getByRole('alert')).toContainText('changed');
  await expect(review.getByLabel('Decision rationale', { exact: true })).toHaveValue(retained);
  await review.getByRole('button', { name: 'Load saved plan history', exact: true }).click();
  await expect(review).toContainText('3 preserved decision revisions');
  await expect(review.getByLabel('Decision rationale', { exact: true })).toHaveValue(retained);
  await review.getByRole('button', { name: 'Save reviewer decision', exact: true }).click();
  await expect(review).toContainText('4 preserved decision revisions');
  const dl = page.waitForEvent('download'); await review.getByRole('button', { name: 'Download reviewed plan history', exact: true }).click();
  const journal = JSON.parse(await readFile((await (await dl).path())!, 'utf8'));
  const { verifyPlanJournal } = await import('../packages/shared/src/plan-journal');
  expect(await verifyPlanJournal(journal, journal.revisions.at(-1).hash)).toBe(true);
  expect(JSON.stringify(journal)).not.toContain(token);
  await review.scrollIntoViewIfNeeded(); await page.screenshot({ path: testInfo.outputPath('plan-review-history-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await review.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('plan-review-mobile.png') });
  await review.getByLabel('Decision rationale', { exact: true }).fill('DEMO private unsaved rationale belonging only to the first reviewer.');
  page.once('dialog', dialog => dialog.accept());
  await review.getByRole('button', { name: 'Disconnect plan reviewer', exact: true }).click();
  await expect(review.getByLabel('Decision rationale', { exact: true })).toHaveValue('');
  const bob = issueReviewerToken(process.env.METHANE_E2E_REVIEWER_SECRET!, 'team-demo-bob', ['review','private_read'], 600);
  await review.getByLabel('Plan reviewer token (memory only)').fill(bob);
  await review.getByRole('button', { name: 'Connect plan reviewer', exact: true }).click();
  await expect(review).toContainText('Connected as team-demo-bob');
  await expect(review.getByLabel('Decision rationale', { exact: true })).toHaveValue('');
  expect(errors).toEqual([]);
});

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
    await shared.getByLabel('Due date', { exact: true }).fill('2026-10-20');
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
    await teammate.getByLabel('Due date', { exact: true }).fill('2026-10-20');
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
    // Directory status filters include all authorized team investigations. The
    // connected journey earlier in this phase deliberately saved another one.
    // The assignment checkbox below only filters the shared-work selector.
    const directory = second.getByTestId('cases-table');
    await expect(directory.getByRole('button', { name: 'Select KAZ_S_159 for investigation', exact: true })).toBeVisible();
    await expect(directory.locator('tbody tr').filter({ hasText: 'No saved work' })).toHaveCount(0);
    await expect(directory.locator('tbody tr').filter({ hasText: 'Investigate' })).toHaveCount(await directory.locator('tbody tr').count());
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

  const statusResponse = await page.request.get('/api/intelligence/status');
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
  const tokenProbe = await page.request.post('/api/intelligence/assessments', {
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
