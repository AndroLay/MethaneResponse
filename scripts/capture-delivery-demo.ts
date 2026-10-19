import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { installDemoCursor } from './delivery-cursor.ts';
import { createDeliveryTempRuntime } from './delivery-runtime.ts';

const repo = resolve(import.meta.dir, '..');
const outputDir = resolve(process.env.METHANE_DELIVERY_OUTPUT_DIR || join(repo, 'delivery-output', 'story-v4'));
const fastMode = process.env.METHANE_DELIVERY_SMOKE_FAST === '1';
const firstStageSmoke = process.env.METHANE_DELIVERY_SMOKE === '1';
const smokeMode = fastMode || firstStageSmoke;
const assetsDir = resolve(process.env.METHANE_DELIVERY_ASSETS_DIR || join(outputDir, 'assets'));
const browserExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium';
const durationSeconds = Number(process.env.METHANE_DELIVERY_DURATION_SECONDS || '290');
const eventId = '941806b5-2afe-46ac-baac-a0230880cede';
const maxDurationMs = fastMode ? 0 : firstStageSmoke ? 68_000 : durationSeconds * 1_000;
const screenshotPaths = [
  '01-case-directory.png', '02-case-observations.png', '03-publisher-reference.png',
  '04-auditor-reference-inventory.png', '05-observation-timeline.png',
  '06-scoped-mitigation-result.png', '07-local-follow-up-note.png',
  '08-report-digest-valid.png', '09-tampered-report-rejected.png', '10-original-report-restored.png',
].map(name => join(assetsDir, name));
const captureScreenshotPaths = firstStageSmoke && !fastMode ? screenshotPaths.slice(0, 4) : screenshotPaths;

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

ensure(Number.isInteger(durationSeconds) && durationSeconds >= 180 && durationSeconds <= 300,
  'METHANE_DELIVERY_DURATION_SECONDS must be an integer from 180 to 300.');

async function waitForHealth(url: string, child: ChildProcess, logs: string[], timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Preview API exited before health check: ${logs.slice(-10).join('\n')}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return await response.json() as Record<string, unknown>;
    } catch { /* server is still starting */ }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Preview API did not become healthy: ${logs.slice(-10).join('\n')}`);
}

async function chooseLocalPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolvePromise));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise()));
  return port;
}

async function writeScreenshot(path: string, page: import('@playwright/test').Page) {
  await page.evaluate(() => document.getElementById('methane-demo-cursor')?.setAttribute('data-capture-hidden', 'true'));
  try {
    await page.screenshot({ path, animations: 'disabled' });
  } finally {
    await page.evaluate(() => document.getElementById('methane-demo-cursor')?.removeAttribute('data-capture-hidden'));
  }
}

function sha256File(path: string) {
  return readFile(path).then(bytes => createHash('sha256').update(bytes).digest('hex'));
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('Unsupported JSON value');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(item => canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new TypeError(`Unsupported JSON value: ${typeof value}`);
}

await mkdir(outputDir, { recursive: true });
await mkdir(assetsDir, { recursive: true });
const rawVideoPath = join(outputDir, smokeMode ? 'smoke-app-capture.webm' : 'actual-app-capture.webm');
const manifestPath = join(outputDir, smokeMode ? 'smoke-capture-manifest.json' : 'capture-manifest.json');
for (const path of [rawVideoPath, manifestPath, ...captureScreenshotPaths]) {
  try { await readFile(path); throw new Error(`Refusing to overwrite delivery capture: ${path}`); }
  catch (error) { if (!(error instanceof Error) || !error.message.includes('ENOENT')) throw error; }
}

const tempRuntime = await createDeliveryTempRuntime(repo);
const originalTmpdir = process.env.TMPDIR;
process.env.TMPDIR = tempRuntime.tempAlias;
const stateDir = await mkdtemp(join(tmpdir(), 'state-'));
const port = Number(process.env.METHANE_DELIVERY_PORT || await chooseLocalPort());
ensure(Number.isInteger(port) && port >= 1024 && port <= 65535, 'METHANE_DELIVERY_PORT must be a valid user-space TCP port.');
const baseURL = `http://127.0.0.1:${port}`;
const serverLogs: string[] = [];
const apiEnvironment: Record<string, string> = {
  PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
  HOME: stateDir,
  TMPDIR: stateDir,
  LANG: process.env.LANG || 'C.UTF-8',
  TZ: 'UTC',
  HOST: '127.0.0.1',
  PORT: String(port),
  NODE_ENV: 'production',
  METHANE_PUBLIC_PREVIEW: 'true',
  AUDIT_STORE_PATH: join(stateDir, 'preview-audits.json'),
  WEB_ORIGIN: baseURL,
};
const api = spawn(process.execPath, ['--no-env-file', 'scripts/start-api.ts'], { cwd: repo, env: apiEnvironment, stdio: ['ignore', 'pipe', 'pipe'] });
api.stdout?.on('data', (chunk: Buffer) => serverLogs.push(chunk.toString().slice(0, 500)));
api.stderr?.on('data', (chunk: Buffer) => serverLogs.push(chunk.toString().slice(0, 500)));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newContext']>> | undefined;
const pageErrors: string[] = [];
const failedExternalHosts = new Set<string>();
const timeline: { atSeconds: number; scene: string }[] = [];
let captureStart = 0;
let contextCreatedAt = 0;

try {
  const health = await waitForHealth(`${baseURL}/api/health`, api, serverLogs);
  ensure((health.preview as { enabled?: boolean } | undefined)?.enabled === true, 'The captured server is not in explicitly labelled preview mode.');
  ensure((health.preview as { auditState?: string } | undefined)?.auditState === 'ephemeral', 'The preview state must remain explicitly ephemeral.');
  ensure((health.chainWriteConfigured as boolean) === false, 'Blockchain write capability must be disabled in this capture.');

  browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
    executablePath: browserExecutable,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
    env: {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      HOME: stateDir,
      TMPDIR: stateDir,
      LANG: process.env.LANG || 'C.UTF-8',
      TZ: 'UTC',
    },
  });
  contextCreatedAt = Date.now();
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 300)));
  const allowedExternalHosts = new Set(['tiles.openfreemap.org', 'server.arcgisonline.com', 'gibs.earthdata.nasa.gov', 'tiles.mapterhorn.com']);
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    if (allowedExternalHosts.has(url.hostname)) return route.continue();
    failedExternalHosts.add(url.hostname);
    return route.abort('blockedbyclient');
  });
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#071723;color:#edf8f8;font-family:Arial,sans-serif}main{height:100%;display:grid;place-items:center}section{text-align:center;padding:48px 64px;border:1px solid #255261;border-radius:18px;background:linear-gradient(135deg,#102d3b,#0a202b)}small{color:#71dcca;letter-spacing:.18em;font-size:15px;text-transform:uppercase}h1{font-size:60px;letter-spacing:-.04em;margin:22px 0 12px}p{font-size:24px;color:#b7cbd0;margin:0}</style></head><body><main><section><small>IEEE ClimateChain · Climate Data &amp; Environmental Monitoring</small><h1>MethaneResponse</h1><p>Evidence before claims</p></section></main></body></html>');
  await page.waitForTimeout(1_000);
  await page.goto(`${baseURL}/dashboard/cases?sourceId=KAZ_S_159`, { waitUntil: 'domcontentloaded' });
  await installDemoCursor(page);
  await page.getByRole('navigation', { name: 'Main navigation' }).waitFor({ timeout: 20_000 });
  const casesTable = page.getByTestId('cases-table');
  const caseSearch = page.getByPlaceholder('Search source, location, sector or date…');
  await caseSearch.fill('KAZ_S_159');
  await expect(casesTable).toContainText('KAZ_S_159', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Open full case for KAZ_S_159' }).waitFor();
  captureStart = Date.now();
  const mark = (atSeconds: number, scene: string) => timeline.push({ atSeconds, scene });
  const holdUntil = async (targetSeconds: number) => {
    if (fastMode) return;
    const remaining = captureStart + targetSeconds * 1_000 - Date.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
    const lateByMs = Date.now() - (captureStart + targetSeconds * 1_000);
    ensure(lateByMs < 4_000, `Capture fell more than four seconds behind the storyboard at ${targetSeconds}s.`);
  };

  mark(0, 'Open the real KAZ_S_159 row from the historical source directory');
  await writeScreenshot(captureScreenshotPaths[0]!, page);
  await page.getByRole('button', { name: 'Open full case for KAZ_S_159' }).click();
  const caseDialog = page.getByRole('dialog');
  await caseDialog.waitFor({ timeout: 15_000 });
  await caseDialog.getByRole('tab', { name: 'Observations' }).click();
  await expect(caseDialog.getByRole('table')).toContainText('kg/h');
  await writeScreenshot(captureScreenshotPaths[1]!, page);
  await holdUntil(18);

  mark(18, 'Read the dated satellite estimates and their reported uncertainty');
  await caseDialog.getByRole('tab', { name: 'Evidence' }).click();
  await expect(caseDialog.getByText(/Methane Alert and Response System.*KAZ_S_159/i)).toBeVisible();
  await writeScreenshot(captureScreenshotPaths[2]!, page);
  await holdUntil(40);

  mark(40, 'Inspect the linked publisher record without opening or copying the report');
  await caseDialog.getByRole('button', { name: 'Review evidence' }).click();
  const auditSteps = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await expect(page.getByRole('heading', { name: 'Choose a claim' })).toBeVisible({ timeout: 15_000 });
  await writeScreenshot(captureScreenshotPaths[3]!, page);
  await holdUntil(68);

  if (firstStageSmoke && !fastMode) {
    ensure(pageErrors.length === 0, `Browser page errors occurred: ${pageErrors.join(' | ')}`);
  } else {

  mark(68, 'Show what the review inventory contains and what it does not');
  await auditSteps.getByRole('button', { name: /Observations/ }).click();
  await page.getByText('KAZ_S_159 · Evidence inventory', { exact: true }).waitFor({ timeout: 15_000 });
  const publisherTitle = page.getByText(/Methane Alert and Response System.*Confirmed Mitigation Action.*KAZ_S_159/i);
  await publisherTitle.scrollIntoViewIfNeeded();
  await expect(publisherTitle).toBeVisible();
  const publisherBoundary = page.getByText(/Linked publisher reference.*contents not included/i);
  await publisherBoundary.waitFor({ timeout: 10_000 });
  await publisherBoundary.scrollIntoViewIfNeeded();
  await expect(publisherBoundary).toBeVisible();
  await writeScreenshot(captureScreenshotPaths[3]!, page);
  await holdUntil(92);

  mark(92, 'Return to the observation timeline and inspect discrete historical records');
  await page.getByText('Observation timeline', { exact: true }).scrollIntoViewIfNeeded();
  await page.getByText('Observation timeline', { exact: true }).waitFor();
  await writeScreenshot(captureScreenshotPaths[4]!, page);
  await holdUntil(117);

  mark(117, 'Select the July 11, 2026 observation and apply its exact UTC day');
  await auditSteps.getByRole('button', { name: /Overview/ }).click();
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await scope.getByLabel('Observation event').selectOption(eventId);
  await scope.getByRole('button', { name: 'Use selected observation day' }).click();
  await scope.getByRole('button', { name: 'Apply assessment scope' }).click();
  await expect(scope).toContainText('2026-07-11 → 2026-07-11');
  await holdUntil(148);

  mark(148, 'Run the mitigation claim against the submitted, date-bounded reference bundle');
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  await page.getByRole('button', { name: 'Run rules baseline' }).click();
  await expect(page.locator('.audit-verdict-card')).toContainText('Insufficient', { timeout: 20_000 });
  await expect(page.getByRole('region', { name: 'Assessment meaning' })).toContainText('Not established by this application');
  await expect(page.locator('.audit-verdict-card')).toContainText('No eligible reference', { timeout: 20_000 });
  await writeScreenshot(captureScreenshotPaths[5]!, page);
  await holdUntil(186);

  mark(186, 'Record the missing date and evidence request as local analyst casework');
  const caseWork = page.getByRole('region', { name: 'Analyst case work' });
  await caseWork.scrollIntoViewIfNeeded();
  await caseWork.getByLabel('Open question').fill('What exact action date is supported by the linked UNEP record?');
  await caseWork.getByLabel('Next action').fill('Review authorized action evidence and compare its date with the July 11 observation.');
  await caseWork.getByLabel('Evidence to request').fill('An authorized, attributable report excerpt or source reference with an exact action date, plus method-appropriate follow-up evidence.');
  await caseWork.getByRole('button', { name: 'Save case work' }).click();
  await expect(caseWork.getByRole('status')).toContainText('Saved in this browser.');
  await writeScreenshot(captureScreenshotPaths[6]!, page);
  await holdUntil(209);

  mark(209, 'Export the scoped audit and locally verify the original JSON report');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Reports', exact: true }).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON report' }).click();
  const download = await downloadReady;
  const originalPath = await download.path();
  ensure(originalPath, 'The report export did not produce a local file.');
  const verifier = page.getByRole('region', { name: 'Verify an exported report' });
  await verifier.getByLabel('Choose a JSON audit report').setInputFiles(originalPath);
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.', { timeout: 20_000 });
  await expect(verifier).toContainText('Export context checksum matches.');
  await expect(verifier).toContainText('No blockchain receipt is included in this file.');
  await verifier.scrollIntoViewIfNeeded();
  await writeScreenshot(captureScreenshotPaths[7]!, page);
  await holdUntil(228);

  mark(228, 'Alter a bundle-bound field and confirm that the local verifier rejects the copy');
  const report = JSON.parse(await readFile(originalPath, 'utf8')) as {
    sourceDataset?: { snapshotId?: string };
    exportIntegrity?: { schemaVersion?: number; algorithm?: string; sha256?: string };
    latestAudit?: { sourceId?: string; claimType?: string; result?: string; reason?: string; bundleHash?: string; bundle?: { reason?: string } };
  };
  ensure(report.sourceDataset?.snapshotId === 'unep-mars-675417694883', 'The exported report is not bound to the pinned MARS snapshot.');
  ensure(report.latestAudit?.sourceId === 'KAZ_S_159' && report.latestAudit.claimType === 'mitigation_confirmed'
    && report.latestAudit.result === 'insufficient_evidence', 'The exported audit does not contain the expected scoped mitigation result.');
  ensure(typeof report.latestAudit.reason === 'string' && typeof report.latestAudit.bundle?.reason === 'string'
    && /^0x[0-9a-f]{64}$/i.test(report.latestAudit.bundleHash || ''), 'The exported audit is missing a hash-bound reason or digest.');
  const alteration = ' altered for integrity test';
  report.latestAudit.reason += alteration;
  report.latestAudit.bundle.reason += alteration;
  ensure(report.exportIntegrity?.schemaVersion === 2 && report.exportIntegrity.algorithm === 'SHA-256'
    && /^0x[0-9a-f]{64}$/i.test(report.exportIntegrity.sha256 || ''), 'The exported context checksum is missing.');
  const exportPayload = { ...report };
  delete exportPayload.exportIntegrity;
  report.exportIntegrity.sha256 = `0x${createHash('sha256').update(canonicalJson(exportPayload)).digest('hex')}`;
  await verifier.getByLabel('Choose a JSON audit report').setInputFiles({
    name: 'methaneresponse-report-altered.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(report)),
  });
  await expect(verifier).toContainText('Audit bundle verification failed.', { timeout: 20_000 });
  await expect(verifier).toContainText('Bundle SHA-256 mismatch.');
  await verifier.scrollIntoViewIfNeeded();
  await writeScreenshot(captureScreenshotPaths[8]!, page);
  await holdUntil(251);

  mark(251, 'Restore the original report and confirm the unaltered bundle still verifies');
  await verifier.getByLabel('Choose a JSON audit report').setInputFiles(originalPath);
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.', { timeout: 20_000 });
  await expect(verifier).toContainText('Export context checksum matches.');
  await expect(verifier).toContainText('No blockchain receipt is included in this file.');
  await verifier.scrollIntoViewIfNeeded();
  await writeScreenshot(captureScreenshotPaths[9]!, page);

  await holdUntil(273);
  mark(273, 'Close on the bounded result, verified original report, and next evidence step');
  await page.waitForTimeout(Math.max(0, captureStart + maxDurationMs - Date.now()));
  ensure(pageErrors.length === 0, `Browser page errors occurred: ${pageErrors.join(' | ')}`);
  }
  ensure(Date.now() - captureStart >= maxDurationMs - 1_000, `The browser capture ended before ${maxDurationMs / 1_000} seconds.`);

  const video = page.video();
  ensure(video, 'Playwright did not create a browser video.');
  await context.close();
  context = undefined;
  await copyFile(await video.path(), rawVideoPath, constants.COPYFILE_EXCL);
  const screenshots = await Promise.all(captureScreenshotPaths.map(async path => ({ path: path.split('/').at(-1), bytes: (await readFile(path)).byteLength, sha256: await sha256File(path) })));
  const manifest = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    base: 'local production build + Bun/Hono API on one origin',
    sourceId: 'KAZ_S_159',
    datasetSnapshotId: 'unep-mars-675417694883',
    mode: 'METHANE_PUBLIC_PREVIEW=true; process-local request limiter; temporary JSON state; no AI, database, reviewer token, RPC or signer credentials',
    browser: { chromium: browserExecutable, sandbox: true, viewport: '1920x1080', webgl: 'Chromium SwiftShader; not a physical GPU measurement' },
    selectedExternalTileHosts: [...new Set(['tiles.openfreemap.org', 'server.arcgisonline.com', 'gibs.earthdata.nasa.gov', 'tiles.mapterhorn.com'])],
    blockedExternalHosts: [...failedExternalHosts].sort(),
    pageErrors,
    storyRevision: 4,
    durationSeconds,
    captureType: fastMode ? 'full-workflow smoke capture; not the final demo' : firstStageSmoke ? 'early-route smoke capture; not the final demo' : 'final 4:50 evidence-review workflow capture',
    pointerOverlay: 'visible white pointer with teal click pulse; pointer-events:none; hidden during evidence screenshots',
    storylineDurationSeconds: Math.round((Date.now() - captureStart) / 1_000),
    prerollSeconds: Number(((captureStart - contextCreatedAt) / 1_000).toFixed(3)),
    timeline,
    verifiedWorkflow: {
      sourceRecord: 'KAZ_S_159 · unep-mars-675417694883',
      publisherReference: 'Official UNEP catalogue item links a confirmed action in July 2026; report content is not included in this audit bundle',
      mitigationClaim: 'insufficient evidence because the submitted, July 11, 2026-scoped bundle has no eligible date-matched mitigation citation',
      report: 'local bundle digest and export-context checksum match',
      alteredReport: 'changing the hashed reason and its summary while leaving bundleHash unchanged produces a SHA-256 mismatch',
      restoredReport: 'the original, unaltered export still matches its bundle digest and export-context checksum',
      receipt: 'not included',
    },
    rawBrowserVideo: { path: rawVideoPath, bytes: (await readFile(rawVideoPath)).byteLength, sha256: await sha256File(rawVideoPath) },
    screenshots,
    limitation: 'A local report digest and export-context checksum are not a blockchain receipt, issuer authentication, or physical mitigation evidence.',
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ status: 'capture-complete', video: rawVideoPath, screenshots: screenshots.length, prerollSeconds: manifest.prerollSeconds, pageErrors: pageErrors.length, blockedExternalHosts: manifest.blockedExternalHosts.length })}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  if (api.exitCode === null) {
    api.kill('SIGTERM');
    await new Promise<void>(resolvePromise => {
      const timeout = setTimeout(() => { api.kill('SIGKILL'); resolvePromise(); }, 4_000);
      api.once('exit', () => { clearTimeout(timeout); resolvePromise(); });
    });
  }
  const { rm } = await import('node:fs/promises');
  await rm(stateDir, { recursive: true, force: true });
  if (originalTmpdir === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = originalTmpdir;
  await tempRuntime.cleanup();
}
