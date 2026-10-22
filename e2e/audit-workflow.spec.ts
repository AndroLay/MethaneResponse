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

test('Historical snapshot watch connects real release changes to selected investigations, exact fields and paged records', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  const watch = planner.getByLabel('Historical snapshot change watch', { exact: true });
  await expect(watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true })).toBeDisabled();
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const response = page.waitForResponse(r => r.url().endsWith('/api/investigations/snapshot-transition') && r.request().method() === 'POST');
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  const data = await (await response).json();
  expect(data.requestedSourceIds).toHaveLength(10);
  expect(data.items.map((row: { sourceId: string }) => row.sourceId)).toEqual(['DZA_S_011','IRN_S_065','TKM_S_021']);
  await expect(watch.getByRole('heading', { name: '3 of 10 selected sources need record review' })).toBeVisible();
  await expect(watch).toContainText('95 added records'); await expect(watch).toContainText('13 are historical backfill');
  await watch.getByText('Original record changes for TKM_S_021', { exact: true }).click();
  await expect(watch.getByRole('region', { name: 'Changed fields TKM_S_021', exact: true })).toContainText('persistency');
  await watch.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('snapshot-watch-selected-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await watch.boundingBox())?.width || 0).toBeGreaterThan(280);
  await watch.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('snapshot-watch-selected-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 1500, height: 1000 });
  await watch.getByText('Provenance, export & verification', { exact: true }).click();
  const downloaded = page.waitForEvent('download'); await watch.getByRole('button', { name: 'Download complete historical change report', exact: true }).click();
  const report = JSON.parse(await readFile((await (await downloaded).path())!, 'utf8'));
  expect(report.digest).toBe(data.digest); expect(report.observationChanges).toHaveLength(98);
  await watch.getByLabel('Snapshot change scope', { exact: true }).selectOption('all');
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  await expect(watch.getByRole('heading', { name: '178 sources have record or metadata changes' })).toBeVisible();
  const first = await watch.locator('.snapshot-source-list>li>header>div>strong').allTextContents(); expect(first).toHaveLength(20);
  await watch.getByRole('button', { name: 'Next changed sources', exact: true }).click();
  await expect(watch).toContainText('Sources 21–40 of 178');
  const second = await watch.locator('.snapshot-source-list>li>header>div>strong').allTextContents();
  expect(second).toHaveLength(20); expect(second.filter(id => first.includes(id))).toEqual([]);
  await watch.getByLabel('Snapshot change scope', { exact: true }).selectOption('selected');
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  await watch.getByRole('button', { name: 'Inspect changed source TKM_S_021', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/audit\?sourceId=TKM_S_021/);
  expect(errors).toEqual([]);
});

test('Historical snapshot watch discards delayed results after the selected strategy changes', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const watch = planner.getByLabel('Historical snapshot change watch', { exact: true });
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  let reached!: () => void; const pending = new Promise<void>(resolve => { reached = resolve; });
  await page.route('**/api/investigations/snapshot-transition', async route => { const response = await route.fetch(); reached(); await gate; await route.fulfill({ response }).catch(() => {}); });
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click(); await pending;
  await planner.getByRole('group', { name: 'Alternative investigation plans' }).getByRole('button', { name: /Median flux first/ }).click();
  release(); await page.unroute('**/api/investigations/snapshot-transition');
  await expect(watch.getByLabel('Historical snapshot change results', { exact: true })).toHaveCount(0);
  await expect(watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true })).toBeEnabled();
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  await expect(watch.getByLabel('Historical snapshot change results', { exact: true })).toBeVisible();
});

test('Historical snapshot failure explains the blocker and permits an explicit retry', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const watch = planner.getByLabel('Historical snapshot change watch', { exact: true });
  await page.route('**/api/investigations/snapshot-transition', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'DEMO stale dataset response; reload before comparing.' }) }));
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  await expect(watch.getByRole('alert')).toContainText('stale dataset');
  await expect(watch.getByLabel('Historical snapshot change results', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/investigations/snapshot-transition');
  await watch.getByRole('button', { name: 'Check historical snapshot changes', exact: true }).click();
  await expect(watch.getByRole('heading', { name: '3 of 10 selected sources need record review' })).toBeVisible();
  await expect(watch.getByRole('alert')).toHaveCount(0);
});

test('Active investigation plan keeps exact 10 to 20 source membership across queue, globe and evidence handoff', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && consoleErrors.length < 8) consoleErrors.push(message.text().slice(0, 500)); });
  await page.addInitScript(() => {
    const timings: { method: string; start: number; duration: number }[] = [];
    const contexts = new WeakSet<object>();
    Object.assign(window, { publicMapGpuTiming: timings, publicMapContextCount: 0 });
    // Count actual allocated WebGL contexts, without replacing any GL methods.
    const holder = HTMLCanvasElement.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    const original = holder.getContext;
    holder.getContext = function (...args: unknown[]) {
      const start = performance.now();
      const result = original.apply(this, args);
      if (typeof args[0] === 'string' && /^webgl/.test(args[0]) && result && typeof result === 'object' && !contexts.has(result)) {
        contexts.add(result);
        (window as unknown as { publicMapContextCount: number }).publicMapContextCount++;
      }
      const duration = performance.now() - start;
      if (duration > 5 && timings.length < 25) timings.push({ method: 'getContext', start, duration });
      return result;
    };
  });
  // Simulate a delayed viewport notification. Explicit Locate must not depend
  // on the map intersecting a viewport whose layout/fonts differ on CI.
  await page.addInitScript(() => {
    const Observer = window.IntersectionObserver;
    window.IntersectionObserver = class extends Observer {
      observe(target: Element) {
        if (!target.classList.contains('real-world-map')) super.observe(target);
      }
    };
  });
  await page.route(/^https?:\/\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const download = page.waitForEvent('download'); await planner.getByRole('button', { name: 'Download reproducible plan', exact: true }).click();
  const ten = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  await planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true }).click();
  const queue = page.getByRole('region', { name: 'Active investigation plan', exact: true });
  await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
  expect(await queue.locator('li strong').allTextContents()).toEqual(ten.portfolios[0].selectedIds);
  await planner.getByLabel('Investigation slots', { exact: true }).fill('20');
  await expect(planner).toContainText('Editing parameters clears this preview only; your active plan stays unchanged');
  expect(await queue.locator('li strong').allTextContents()).toEqual(ten.portfolios[0].selectedIds);
  await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const secondDownload = page.waitForEvent('download'); await planner.getByRole('button', { name: 'Download reproducible plan', exact: true }).click();
  const twenty = JSON.parse(await readFile((await (await secondDownload).path())!, 'utf8'));
  await planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true }).click();
  await expect(queue.getByRole('heading')).toHaveText('20 sources in your active plan');
  expect(await queue.locator('li strong').allTextContents()).toEqual(twenty.portfolios[0].selectedIds.slice(0,10));
  await queue.getByRole('button', { name: 'Next planned sources', exact: true }).click();
  expect(await queue.locator('li strong').allTextContents()).toEqual(twenty.portfolios[0].selectedIds.slice(10));
  await queue.getByRole('button', { name: 'Previous planned sources', exact: true }).click();
  // Public fixture only: capture whether CI is waiting for a module, a main-
  // thread task or a state transition. No document contents or credentials.
  await page.evaluate(() => {
    const events: { kind: string; at: number; duration?: number }[] = [];
    Object.assign(window, { publicMapTiming: events });
    events.push({ kind: 'before-locate', at: performance.now() });
    let shellSeen = false, captionSeen = false;
    new MutationObserver(() => {
      if (!shellSeen && document.querySelector('.geo-map-shell')) { shellSeen = true; events.push({ kind: 'shell', at: performance.now() }); }
      if (!captionSeen && document.querySelector('.plan-map-caption')) { captionSeen = true; events.push({ kind: 'caption', at: performance.now() }); }
    }).observe(document.body, { childList: true, subtree: true });
    new PerformanceObserver(list => {
      for (const task of list.getEntries()) if (events.length < 30 && task.duration > 100) events.push({ kind: 'longtask', at: task.startTime, duration: task.duration });
    }).observe({ type: 'longtask' });
  });
  const contextsBeforeLocate = await page.evaluate(() => (window as unknown as { publicMapContextCount: number }).publicMapContextCount);
  await queue.locator('.plan-queue-list>li').first().getByText('Source details & map', { exact: true }).click();
  await queue.getByRole('button', { name: `Locate planned source ${twenty.portfolios[0].selectedIds[0]}`, exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/map/);
  try {
    await expect(page.locator('.plan-map-caption')).toContainText('20 planned sources');
  } catch (error) {
    // This is the public, credential-free fixture. Retain a bounded diagnostic
    // rather than discarding the CI failure behind a longer assertion timeout.
    console.log('Public plan/map failure:', JSON.stringify({ errors, consoleErrors,
      map: (await page.locator('.real-world-map').textContent())?.slice(0, 2500),
      queue: (await queue.textContent())?.slice(0, 300),
      timing: await page.evaluate(() => ({
        now: performance.now(), events: (window as unknown as { publicMapTiming?: unknown }).publicMapTiming,
        captionCount: document.querySelectorAll('.plan-map-caption').length,
        gpu: (window as unknown as { publicMapGpuTiming?: unknown }).publicMapGpuTiming,
        modules: performance.getEntriesByType('resource').filter(entry => /MapPanel-/.test(entry.name)).map(entry => ({ start: entry.startTime, duration: entry.duration })),
      })),
      shells: await page.locator('.geo-map-shell').count(),
      loadFailures: await page.locator('.map-component-fallback').count(),
    }));
    throw error;
  }
  console.log('Public map readiness:', JSON.stringify(await page.evaluate(() => ({
    events: (window as unknown as { publicMapTiming?: unknown }).publicMapTiming,
    gpu: (window as unknown as { publicMapGpuTiming?: unknown }).publicMapGpuTiming,
    contexts: (window as unknown as { publicMapContextCount: number }).publicMapContextCount,
  }))));
  expect(await page.evaluate(() => (window as unknown as { publicMapContextCount: number }).publicMapContextCount) - contextsBeforeLocate).toBe(1);
  await expect(page.getByRole('application', { name: 'Interactive methane map; drag to pan, scroll to zoom and select a source', exact: true })).toBeInViewport();
  await page.getByLabel('Map layer legend', { exact: true }).locator('summary').click();
  await page.screenshot({ path: testInfo.outputPath('active-plan-globe-desktop.png') });
  await page.getByRole('region', { name: 'Active investigation plan' }).getByRole('button', { name: 'Edit capacity & strategy', exact: true }).click();
  await expect(planner.getByLabel('Investigation slots', { exact: true })).toHaveValue('20');
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  await page.setViewportSize({ width: 390, height: 844 }); await queue.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('active-plan-queue-mobile.png') });
  await queue.getByRole('button', { name: `Investigate planned source ${twenty.portfolios[0].selectedIds[0]}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/audit\\?sourceId=${twenty.portfolios[0].selectedIds[0]}`));
  expect(errors).toEqual([]);
});

test('Delayed activation cannot publish a strategy that the analyst has already changed', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  await page.evaluate(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    const gate = new Promise<void>(resolve => Object.assign(window, { releasePlanReplay: resolve }));
    crypto.subtle.digest = (...args: Parameters<SubtleCrypto['digest']>) => gate.then(() => digest(...args));
  });
  const activate = planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true });
  await activate.click(); await expect(activate).toBeDisabled();
  await planner.getByRole('group', { name: 'Alternative investigation plans' }).getByRole('button', { name: /Geographic \/ sector breadth/ }).click();
  await page.evaluate(() => (window as unknown as { releasePlanReplay: () => void }).releasePlanReplay());
  await expect(activate).toBeEnabled();
  const queue = page.getByRole('region', { name: 'Active investigation plan', exact: true });
  await expect(queue).toHaveCount(0);
  await activate.click(); await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
  await expect(queue).toContainText('Geographic / sector breadth');
});

test('Earlier plan import requires trusted digest and separates capacity differences from dataset changes', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner.getByTestId('planner-summary')).toContainText('4,218');
  const dl = page.waitForEvent('download'); await planner.getByRole('button', { name: 'Download reproducible plan', exact: true }).click();
  const path = (await (await dl).path())!, report = JSON.parse(await readFile(path, 'utf8'));
  await planner.getByLabel('Earlier plan file', { exact: true }).setInputFiles(path);
  await expect(planner.getByRole('button', { name: 'Verify earlier plan', exact: true })).toBeDisabled();
  await planner.getByLabel('Expected plan or history digest').fill('0x'+'f'.repeat(64));
  await planner.getByRole('button', { name: 'Verify earlier plan', exact: true }).click();
  await expect(planner.getByRole('alert')).toContainText('failed');
  await planner.getByLabel('Expected plan or history digest').fill(report.digest);
  await planner.getByRole('button', { name: 'Verify earlier plan', exact: true }).click();
  await expect(planner).toContainText('Earlier plan verified against supplied digest');
  await planner.getByLabel('Investigation slots', { exact: true }).fill('20');
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  const delta = planner.getByLabel('Plan change comparison');
  await expect(delta).toContainText('10 added'); await expect(delta).toContainText('Same dataset snapshot');
  await expect(delta).toContainText('Strategy or analyst constraints also changed');
  await expect(delta).toContainText('0 selected sources with changed summaries');
});

test('Scoped active plans never restore reports under different visible country controls', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const planner = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await planner.getByLabel('Country scope', { exact: true }).selectOption('Kazakhstan');
  await planner.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(planner).toContainText('8 slots remain unfilled');
  await planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true }).click();
  const queue = page.getByRole('region', { name: 'Active investigation plan', exact: true });
  await queue.getByRole('button', { name: /Investigate planned source/ }).first().click();
  await page.getByRole('button', { name: 'Cases', exact: true }).click();
  await expect(planner.getByLabel('Country scope', { exact: true })).toHaveValue('All regions');
  await expect(planner.getByTestId('planner-summary')).toHaveCount(0);
  await expect(planner.getByRole('button', { name: 'Use this plan on map & queue', exact: true })).toHaveCount(0);
});

test('Investigation planner compares capacity-constrained portfolios, exports replay and opens exact cases on desktop and mobile', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const tool = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool.getByTestId('planner-summary')).toContainText('4,218 eligible sources');
  const choices = tool.getByRole('group', { name: 'Alternative investigation plans' });
  await expect(choices.getByRole('button', { name: /Weighted historical indicators/ })).toContainText('7 countries · 1 sectors');
  await expect(choices.getByRole('button', { name: /Geographic \/ sector breadth/ })).toContainText('10 countries · 7 sectors');
  await tool.evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 85, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('planner-desktop.png') });
  const download = page.waitForEvent('download');
  await tool.getByRole('button', { name: 'Download reproducible plan', exact: true }).click();
  const replay = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(replay.input.candidates.length).toBe(4218); expect(replay.physicalBenefitEstimated).toBe(false);
  expect(replay.input.dataset.provenance.license).toBe('CC BY-NC-SA 4.0');
  expect(replay.portfolios[0].selectedIds[0]).toBe('MEX_S_003');
  await tool.getByLabel('Planner rows to inspect').selectOption('excluded');
  await expect(tool.getByRole('region', { name: 'Planned and excluded source records' })).toContainText('Capacity filled by earlier selections');
  await tool.getByRole('button', { name: 'Next planner page', exact: true }).click();
  await expect(tool).toContainText('Showing 21–40 of 4,208');
  await choices.getByRole('button', { name: /Geographic \/ sector breadth/ }).click();
  await tool.getByLabel('Planner rows to inspect').selectOption('selected');
  await tool.getByRole('button', { name: 'Inspect case MEX_S_003', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('MEX_S_003');
  await page.getByRole('button', { name: 'Close case details', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await tool.evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 75, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tool.getByLabel('Investigation slots', { exact: true }).focus();
  await page.screenshot({ path: testInfo.outputPath('planner-mobile.png') });
  await choices.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('planner-comparisons-mobile.png') });
  await tool.getByRole('button', { name: 'Map MEX_S_003', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/map\?sourceId=MEX_S_003/);
  await expect(page.getByRole('heading', { name: 'MEX_S_003', exact: true })).toBeVisible();
  await page.goto('/dashboard/cases?sourceId=MEX_S_003');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool.getByTestId('planner-summary')).toContainText('4,218 eligible sources');
  await tool.getByRole('button', { name: 'Evidence MEX_S_003', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/audit\?sourceId=MEX_S_003/);
  expect(errors).toEqual([]);
});

test('Investigation planner invalidates pending results, recovers from API failure and reports unfilled quotas', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const tool = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await tool.getByLabel('Country scope', { exact: true }).selectOption('Kazakhstan');
  await tool.getByLabel('Maximum investigations per country').fill('1');
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool).toContainText('9 slots remain unfilled');
  let release!: () => void, intercepted!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; }), arrived = new Promise<void>(resolve => { intercepted = resolve; });
  await page.route('**/api/investigations/portfolios', async route => {
    const response = await route.fetch(); intercepted(); await held;
    try { await route.fulfill({ response }); } catch { /* Deliberately invalidated request. */ }
  });
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click(); await arrived;
  await tool.getByLabel('Investigation slots', { exact: true }).fill('5'); release();
  await page.unroute('**/api/investigations/portfolios');
  await expect(tool.getByTestId('planner-summary')).toHaveCount(0);
  await expect(tool.getByRole('button', { name: 'Compare investigation plans', exact: true })).toBeEnabled();
  await page.route('**/api/investigations/portfolios', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool.getByRole('alert')).toContainText('Planning data unavailable');
  await page.unroute('**/api/investigations/portfolios');
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool).toContainText('4 slots remain unfilled');
  await tool.getByLabel('Investigation slots', { exact: true }).fill('0');
  await expect(tool.getByRole('button', { name: 'Compare investigation plans', exact: true })).toBeDisabled();
});

test('Investigation planner handoff clears hiding filters and confirms unsaved work exactly once', async ({ page }) => {
  await page.goto('/dashboard/cases?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: 'Plan investigation capacity', exact: true }).click();
  const tool = page.getByRole('region', { name: 'Investigation capacity planner', exact: true });
  await tool.getByLabel('Country scope', { exact: true }).selectOption('Kazakhstan');
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool.getByTestId('planner-summary')).toContainText('eligible sources');
  await tool.getByLabel('Planner rows to inspect').selectOption('excluded');
  await page.getByPlaceholder('Search source, location, sector or date…', { exact: true }).fill('Kazakhstan');
  await page.getByLabel('Filter by work status', { exact: true }).selectOption('awaiting_evidence');
  await tool.getByRole('button', { name: 'Inspect case AFG_S_001', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('AFG_S_001');
  await page.getByRole('button', { name: 'Close case details', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected source investigation' })).toContainText('AFG_S_001');
  await expect(tool.getByLabel('Country scope', { exact: true })).toHaveValue('All regions');
  await expect(page.getByPlaceholder('Search source, location, sector or date…', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Filter by work status', { exact: true })).toHaveValue('all');
  await tool.getByRole('button', { name: 'Compare investigation plans', exact: true }).click();
  await expect(tool.getByTestId('planner-summary')).toContainText('4,218 eligible sources');
  await tool.getByLabel('Planner rows to inspect').selectOption('selected');
  await page.getByRole('region', { name: 'Analyst case work' }).getByLabel('Open question').fill('DEMO unsaved navigation regression');
  let dialogs = 0;
  const dismiss = async (dialog: import('@playwright/test').Dialog) => { dialogs++; await dialog.dismiss(); };
  page.on('dialog', dismiss);
  await tool.getByRole('button', { name: 'Map MEX_S_003', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/cases\?sourceId=AFG_S_001/);
  expect(dialogs).toBe(1); page.off('dialog', dismiss);
  page.on('dialog', async dialog => { dialogs++; await dialog.accept(); });
  await tool.getByRole('button', { name: 'Map MEX_S_003', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/map\?sourceId=MEX_S_003/);
  expect(dialogs).toBe(2);
});

test('Observation cross-check exposes exact historical counterexamples, refuses repair inference and invalidates stale results', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await page.getByRole('button', { name: /^Decision Lab\./ }).click();
  await page.getByRole('button', { name: 'Observation cross-check', exact: true }).click();
  const tool = page.getByRole('region', { name: 'Observation claim cross-check', exact: true });
  await tool.getByRole('button', { name: 'Use loaded observation period', exact: true }).click();
  await expect(tool.getByLabel('Check period start (UTC)')).toHaveValue('2024-06-07');
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await expect(tool.getByTestId('observation-outcome')).toHaveText('Exact record counterexample found');
  await expect(tool).toContainText('3 counterexamples');
  await expect(tool.getByRole('region', { name: 'Exact observation records', exact: true })).toContainText('82758651-76f4-4e06-b4ab-c247ce765192');
  const replayDownload = page.waitForEvent('download');
  await tool.getByRole('button', { name: 'Download replay file', exact: true }).click();
  const replay = JSON.parse(await readFile((await (await replayDownload).path())!, 'utf8'));
  expect(replay.physicalMitigationEstablished).toBe(false);
  expect(replay.input.synthetic).toBe(false);
  expect(replay.counterexampleIds.length).toBe(3);
  await tool.evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 85, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('observation-counterexample-desktop.png') });
  await tool.getByLabel('Statement to check').selectOption('reported_flux_at_most');
  await expect(tool.getByTestId('observation-outcome')).toHaveCount(0);
  await tool.getByLabel('Point-estimate threshold (kg/h)').fill('500');
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await expect(tool.getByTestId('observation-outcome')).toHaveText('Exact record counterexample found');
  await expect(tool).toContainText('straddles threshold');
  const draftDownload = page.waitForEvent('download');
  await tool.getByRole('button', { name: 'Download follow-up draft', exact: true }).click();
  const draft = await readFile((await (await draftDownload).path())!, 'utf8');
  expect(draft).toContain('82758651-76f4-4e06-b4ab-c247ce765192');
  expect(draft).toContain('CC BY-NC-SA');
  expect(draft).toContain('not sent');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('observation-threshold-mobile.png'), fullPage: true });
  await tool.getByLabel('Statement to check').selectOption('physical_mitigation');
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await expect(tool.getByTestId('observation-outcome')).toHaveText('Physical outcome requires document review');
  await tool.getByLabel('Statement to check').selectOption('no_linked_detections');
  await tool.getByLabel('Check period start (UTC)').fill('2026-08-01');
  await tool.getByLabel('Check period end (UTC)').fill('2026-08-31');
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await expect(tool.getByTestId('observation-outcome')).toHaveText('No records in this period — outcome unknown');
  await expect(tool).toContainText('Missing flux is not plotted as zero');
  // Delay a genuine response, then edit the question: late data must not resurrect the prior result.
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let intercepted!: () => void;
  const arrived = new Promise<void>(resolve => { intercepted = resolve; });
  await page.route('**/api/investigations/observation-check', async route => {
    const response = await route.fetch(); intercepted(); await held;
    try { await route.fulfill({ response }); } catch { /* Aborted by a deliberate query edit. */ }
  });
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await arrived;
  await tool.getByLabel('Check period start (UTC)').fill('2026-08-02');
  release();
  await page.unroute('**/api/investigations/observation-check');
  await expect(tool.getByTestId('observation-outcome')).toHaveCount(0);
  await expect(tool.getByRole('button', { name: 'Check observation claim', exact: true })).toBeEnabled();
  await page.route('**/api/investigations/observation-check', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await tool.getByRole('button', { name: 'Check observation claim', exact: true }).click();
  await expect(tool.getByRole('alert')).toContainText('Observation check unavailable');
  await expect(tool.getByRole('button', { name: 'Check observation claim', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Reference coverage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Explain current evidence', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Decision Lab explains real record eligibility, exports requests and keeps authored challenges separate', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await page.locator('#claim-audit').selectOption('source_detected');
  await page.getByRole('button', { name: /^Decision Lab\./ }).click();
  const lab = page.getByRole('region', { name: 'Evidence Decision Lab' });
  await lab.getByRole('button', { name: 'Explain current evidence' }).click();
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Required references present');
  await expect(lab).toContainText('3 supporting');
  const requestDownload = page.waitForEvent('download');
  await lab.getByRole('button', { name: 'Download evidence request' }).click();
  const requestFile = await (await requestDownload).path();
  const requestText = await readFile(requestFile!, 'utf8');
  expect(requestText.split('\n').length).toBeGreaterThan(15);
  expect(requestText).toContain('CC BY-NC-SA');
  expect(requestText).toContain('KAZ_S_159');
  await lab.evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 85, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('decision-lab-real-desktop.png') });
  await lab.getByRole('button', { name: 'Open synthetic evidence challenges' }).click();
  await expect(lab).toContainText('SYNTHETIC DEMO');
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Required references present');
  await lab.getByLabel('Synthetic challenge').selectOption('missing-follow-up');
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Insufficient reference coverage');
  await lab.getByLabel('Synthetic challenge').selectOption('contrary');
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Contrary reference present');
  await lab.getByLabel('Synthetic challenge').selectOption('conflict');
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Insufficient reference coverage');
  await expect(lab).toContainText('Adjudicate conflicting evidence');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('decision-lab-challenge-mobile.png'), fullPage: true });
  await lab.getByRole('button', { name: 'Return to selected MARS source' }).click();
  await expect(lab).toContainText('KAZ_S_159');
  await expect(lab.getByTestId('decision-outcome')).toHaveText('Required references present');
  expect(errors).toEqual([]);
});

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
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
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
  expect(pageErrors).toEqual([]);
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


test('Polished Auditor and mobile header keep tasks readable, searchable and keyboard accessible', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:\/\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard/audit?sourceId=KAZ_S_159');
  await page.getByRole('navigation', { name: 'Evidence audit steps' }).getByRole('button', { name: /Document AI/ }).click();
  const claim = page.getByRole('textbox', { name: 'Exact claim to assess', exact: true });
  await expect(claim).toBeVisible();
  const context = page.locator('.intel-context');
  await expect(context).not.toHaveAttribute('open');
  const processingLimits = page.locator('.intel-processing-limits');
  await expect(processingLimits).not.toHaveAttribute('open');
  await processingLimits.locator(':scope > summary').click();
  await expect(processingLimits.getByText(/Full excerpts are not persisted/)).toBeVisible();
  await processingLimits.locator(':scope > summary').click();
  await expect(page.getByRole('group', { name: '1. Claim & supporting document', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: '2. Permission & assessment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assess documented claim', exact: true })).toBeDisabled();
  await claim.fill('DEMO claim draft remains intact when inspecting historical context.');
  await context.locator(':scope > summary').click();
  await expect(context).toHaveAttribute('open');
  await context.locator(':scope > summary').click();
  await expect(claim).toHaveValue('DEMO claim draft remains intact when inspecting historical context.');
  await page.locator('.intelligence-heading').evaluate(node => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
  expect((await page.locator('.intelligence-heading').boundingBox())!.y).toBeGreaterThanOrEqual(64);
  await page.screenshot({ path: testInfo.outputPath('auditor-focused-desktop.png') });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    const openSearch = page.getByRole('button', { name: 'Open source search', exact: true });
    await expect(openSearch).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search methane sources', exact: true })).toBeHidden();
    await openSearch.click();
    const search = page.getByRole('textbox', { name: 'Search methane sources', exact: true });
    await expect(search).toBeFocused();
    await expect(search).toHaveCSS('font-size', '16px');
    await search.fill('KAZ_S_159');
    await expect(page.locator('.search-results').getByRole('button', { name: /KAZ_S_159/ })).toBeVisible();
    await search.press('Escape');
    await expect(openSearch).toBeFocused();
    await expect(openSearch).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const bounds = await openSearch.boundingBox(); expect(bounds!.height).toBeGreaterThanOrEqual(44); expect(bounds!.width).toBeGreaterThanOrEqual(44);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('mobile-header-collapsed.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Control+k');
  const search = page.getByRole('textbox', { name: 'Search methane sources', exact: true });
  await expect(search).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('mobile-header-search.png') });
  await page.getByRole('button', { name: 'Close source search', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open source search', exact: true })).toBeFocused();
  await expect(claim).toHaveCSS('font-size', '16px');
  await claim.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('auditor-focused-mobile.png') });
  await page.getByRole('button', { name: 'Open source search', exact: true }).click();
  await search.fill('KAZ_S_159');
  await page.locator('.search-results').getByRole('button', { name: /KAZ_S_159/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/cases/);
  await expect(page.getByRole('button', { name: 'Open source search', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#dashboard-main')).toBeFocused();
  expect(errors).toEqual([]);
});
