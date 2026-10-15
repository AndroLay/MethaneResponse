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
  await expect(page.locator('#audit-stage-overview').getByText(/No evidence of the required type\. Absence does not prove the claim is false\./)).toBeVisible();

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
  expect(exported.latestAudit?.bundle?.reason).toContain('No evidence of the required type');

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

  await stages.getByRole('button', { name: 'Review' }).click();
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
