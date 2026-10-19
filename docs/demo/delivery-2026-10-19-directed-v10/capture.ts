import { chromium, expect, type Locator } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { createDeliveryTempRuntime } from '../../../scripts/delivery-runtime.ts';

const repo = resolve(import.meta.dir, '../../..');
const output = resolve(process.env.MR_DIRECTED_CAPTURE_OUTPUT_DIR || join(repo, 'delivery-output/story-v10/capture-master'));
const videoDir = join(output, 'raw');
const sourceId = 'KAZ_S_159';
const eventId = '941806b5-2afe-46ac-baac-a0230880cede';
const snapshotId = 'unep-mars-675417694883';
await mkdir(videoDir, { recursive: true });
try { await readFile(join(output, 'capture.json')); throw new Error('Preserving existing v10 capture.'); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const runtime = await createDeliveryTempRuntime(repo);
const originalTmp = process.env.TMPDIR;
process.env.TMPDIR = runtime.tempAlias;
const state = join(runtime.backingDir, 'state');
await mkdir(state, { recursive: true });
const socket = createServer();
await new Promise<void>((yes, no) => socket.once('error', no).listen(0, '127.0.0.1', yes));
const port = (socket.address() as { port: number }).port;
await new Promise<void>(yes => socket.close(() => yes()));
const origin = `http://127.0.0.1:${port}`;
const logs: string[] = [];
const env = {
  PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
  TMPDIR: runtime.tempAlias, LANG: 'C.UTF-8', TZ: 'UTC',
  HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production',
  METHANE_PUBLIC_PREVIEW: 'true', WEB_ORIGIN: origin,
  AUDIT_STORE_PATH: join(state, 'preview.json'),
};
const api: ChildProcess = spawn(process.execPath, ['--no-env-file', 'scripts/start-api.ts'], {
  cwd: repo, env, stdio: ['ignore', 'pipe', 'pipe'],
});
api.stdout?.on('data', data => logs.push(String(data).slice(0, 200)));
api.stderr?.on('data', data => logs.push(String(data).slice(0, 200)));
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let context: Awaited<ReturnType<NonNullable<typeof browser>['newContext']>> | undefined;
const shots: any[] = [];
const pointer: any[] = [];
const pageErrors: string[] = [];
const sha = (buffer: Uint8Array) => createHash('sha256').update(buffer).digest('hex');
const canonical = (v: any): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
};

try {
  let healthy = false;
  let lastHealth = 'no response';
  for (let i = 0; i < 150; i++) {
    if (api.exitCode !== null) throw new Error(`Local API failed: ${logs.slice(-4).join(' ')}`);
    try {
      const response = await fetch(`${origin}/api/health`, {signal:AbortSignal.timeout(1500)});
      const h: any = await response.json();
      lastHealth = JSON.stringify({status:response.status,preview:h.preview,casebookReady:h.casebookReady,storage:h.storage,caseWorkStorage:h.caseWorkStorage});
      if (response.ok) {
        if (!h.preview?.enabled || h.chainWriteConfigured) throw new Error('Unsafe capture mode.');
        healthy = true; break;
      }
    } catch (error) { lastHealth=String(error); }
    await Bun.sleep(200);
  }
  if (!healthy) throw new Error(`Local preview did not become healthy: ${lastHealth}; ${logs.slice(-4).join(' ')}`);
  browser = await chromium.launch({
    executablePath: '/usr/bin/chromium', headless: true, chromiumSandbox: true,
    env: { PATH: env.PATH, TMPDIR: runtime.tempAlias, LANG: env.LANG, TZ: env.TZ },
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const contextStart = Date.now();
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    acceptDownloads: true, recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.exposeFunction('capturePointerEvent', (event: any) => pointer.push(event));
  await page.addInitScript(() => {
    document.addEventListener('pointermove', e => {
      (window as any).capturePointerEvent({ kind: 'move', x: e.clientX, y: e.clientY, wall: Date.now() });
    }, true);
    document.addEventListener('pointerdown', e => {
      (window as any).capturePointerEvent({ kind: 'click', x: e.clientX, y: e.clientY, wall: Date.now() });
    }, true);
  });
  const allowed = new Set(['127.0.0.1', 'localhost', 'tiles.openfreemap.org', 'server.arcgisonline.com', 'gibs.earthdata.nasa.gov', 'tiles.mapterhorn.com']);
  await page.route('**/*', r => allowed.has(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  const css = 'html,body,*{cursor:none!important;scroll-behavior:auto!important}';
  await page.goto(`${origin}/dashboard/cases?sourceId=${sourceId}`, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: css });
  await page.getByPlaceholder('Search source, location, sector or date…').fill(sourceId);
  await expect(page.getByTestId('cases-table')).toContainText(sourceId);
  const video = page.video()!;
  let current: any;
  let last = { x: 1500, y: 850 };
  const elapsed = () => (Date.now() - current.startWall) / 1000;
  const at = async (seconds: number) => { const remaining = seconds * 1000 - (Date.now() - current.startWall); if (remaining > 0) await Bun.sleep(remaining); };
  async function start(id: string, duration: number) {
    const marker = [42 + shots.length * 23, 226 - shots.length * 17, 190 - shots.length * 11];
    await page.evaluate((color) => {
      const el = document.createElement('div'); el.id = 'mr-sync';
      el.style.cssText = `position:fixed;inset:0;z-index:2147483647;background:rgb(${color.join(',')});pointer-events:none`;
      document.body.append(el);
    }, marker);
    // Force an actual painted recording frame before holding the sync slate.
    // Short wall-clock-only flashes can disappear during a heavy route render.
    await page.screenshot();
    await Bun.sleep(700);
    await page.evaluate(() => document.getElementById('mr-sync')?.remove());
    current = { id, duration, marker, startWall: Date.now(), actions: [], focus: [], scrolls: [], active:true };
    shots.push(current);
    await page.screenshot({ path: join(output, `${id}-start.png`) });
  }
  async function finish() {
    await at(current.duration + 0.4);
    current.endWall = Date.now();
    current.active = false;
    await page.screenshot({ path: join(output, `${current.id}-end.png`) });
  }
  async function moveTo(target: Locator, seconds = 0.65, anchorX = .53) {
    const box = await target.boundingBox(); if (!box) throw new Error('Invisible capture target.');
    if (box.y < 0 || box.y + box.height > 1080) throw new Error(`Target is outside the settled viewport: ${await target.getAttribute('name')}`);
    const dest = { x: box.x + box.width * anchorX, y: box.y + box.height * .55 };
    const from = { ...last }; const startWall = Date.now();
    for (let i = 1; i <= Math.ceil(seconds * 30); i++) {
      const u = i / Math.ceil(seconds * 30), e = u*u*u*(10+u*(-15+6*u));
      await page.mouse.move(from.x + (dest.x-from.x)*e, from.y+(dest.y-from.y)*e);
      const wait = seconds*1000*i/Math.ceil(seconds*30)-(Date.now()-startWall); if (wait>0) await Bun.sleep(wait);
    }
    last = dest; return box;
  }
  async function action(target: Locator, label: string, opts: { type?: string; select?: string; click?: boolean; zoom?: number; anchorX?:number } = {}) {
    const box = await moveTo(target,.65,opts.anchorX ?? .53);
    const begin = elapsed();
    current.focus.push({ start: Math.max(0, begin-.7), end: begin+2.0+(opts.type?.length || 0)*.026, rect: box, label, zoom: opts.zoom || 1.55 });
    await Bun.sleep(300);
    if (opts.type !== undefined) { await page.mouse.click(last.x, last.y); await target.pressSequentially(opts.type, { delay: 24 }); }
    else if (opts.select) { await page.mouse.click(last.x, last.y); await page.keyboard.press('Escape'); await target.selectOption(opts.select); }
    else if (opts.click !== false) await page.mouse.click(last.x, last.y);
    current.actions.push({ at: elapsed(), label, rect: box });
    await Bun.sleep(250);
  }
  async function settleOn(target: Locator) {
    if (current?.active) {
      const start=elapsed();
      await target.evaluate(element => element.scrollIntoView({behavior:'smooth',block:'center'}));
      await Bun.sleep(1100);
      current.scrolls.push({start,end:elapsed()});
    } else {
      await target.scrollIntoViewIfNeeded();
      await Bun.sleep(600);
    }
  }
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await Bun.sleep(700); // Give the recording encoder time to initialize before its first slate.
  await start('source', 8);
  await at(.5); await action(page.getByRole('button', { name: `Open full case for ${sourceId}` }), 'Open the historical source', { zoom: 1.25 });
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  await action(dialog.getByRole('tab', { name: 'Observations' }), 'Read dated satellite estimates', { zoom: 1.25 });
  await expect(dialog.getByRole('table')).toContainText('kg/h');
  await finish();

  await dialog.getByRole('button', { name: 'Review evidence' }).click();
  const steps = page.getByRole('navigation', { name: 'Evidence audit steps' });
  await steps.getByRole('button', { name: /Observations/ }).click();
  const title = page.getByText(/Methane Alert and Response System.*Confirmed Mitigation Action.*KAZ_S_159/i);
  await settleOn(title);
  await start('catalog', 12);
  await at(.7); await action(title, 'Inspect the publisher reference', { click: false, zoom: 1.4 });
  const boundary = page.getByText(/Linked publisher reference.*contents not included/i);
  await expect(boundary).toBeVisible();
  await finish();

  const timeline = page.getByText('Observation timeline', { exact: true });
  await settleOn(timeline);
  await start('observations', 15);
  await at(.6); await action(timeline, 'Compare the observation dates', { click: false, zoom: 1.18 });
  await finish();

  await steps.getByRole('button', { name: /Overview/ }).click();
  const scope = page.getByRole('region', { name: 'Assessment scope' });
  await page.locator('#claim-audit').selectOption('mitigation_confirmed');
  await settleOn(scope);
  await start('audit', 31);
  await at(.3); await action(scope.getByRole('button', { name: 'Use loaded observation period' }), 'Load the historical date range', { zoom: 1.4 });
  await at(2.2); await action(scope.getByLabel('Observation event'), 'Select the 11 July observation', { select: eventId, zoom: 1.4 });
  await at(4.1); await action(scope.getByRole('button', { name: 'Use selected observation day' }), 'Use the selected UTC day', { zoom: 1.4 });
  await expect(scope.getByLabel('Period start')).toHaveValue('2026-07-11');
  await at(6.4); await action(scope.getByRole('button', { name: 'Apply assessment scope' }), 'Apply the review scope', { zoom: 1.4 });
  await expect(scope).toContainText('2026-07-11 → 2026-07-11');
  const run = page.getByRole('button', { name: 'Run rules baseline' });
  await at(9.5);
  current.scrolls.push({ start: elapsed(), end: elapsed()+1.1 });
  await run.evaluate(element => element.scrollIntoView({behavior:'smooth',block:'center'}));
  await Bun.sleep(1100); await run.scrollIntoViewIfNeeded(); await Bun.sleep(400);
  await at(12.0); await action(run, 'Run the rules baseline', { zoom: 1.5 });
  const verdict = page.locator('.audit-verdict-card');
  await expect(verdict).toContainText(/Insufficient reference coverage/i);
  const verdictBox = await verdict.boundingBox();
  if (verdictBox) current.focus.push({ start: elapsed()+.5, end: 24, rect: verdictBox, label: 'Read the result and its limits', zoom: 1.42, color: 'amber' });
  await finish();

  const work = page.getByRole('region', { name: 'Analyst case work' });
  await settleOn(work);
  await start('casework', 14);
  await at(.3); await action(work.getByLabel('Open question'), 'Record the open question', { type: 'What exact day was the mitigation action completed?', zoom: 1.4 });
  await action(work.getByLabel('Next action'), 'Write the next evidence request', { type: 'Request the action date and compare the July 11 observation.', zoom: 1.35 });
  await action(work.getByLabel('Evidence to request'), 'Specify the evidence needed', { type: 'An authorized report passage and dated follow-up evidence.', zoom: 1.35 });
  await action(work.getByRole('button', { name: 'Save case work' }), 'Save local analyst casework', { zoom: 1.3 });
  await expect(work.getByRole('status')).toContainText('Saved in this browser.');
  await finish();

  await nav.getByRole('button', { name: 'Reports', exact: true }).click();
  const downloadButton = page.getByRole('button', { name: 'Download JSON report' });
  const verifier = page.getByRole('region', { name: 'Verify an exported report' });
  await settleOn(downloadButton);
  await start('report', 11);
  await at(.5);
  const downloadPromise = page.waitForEvent('download');
  await action(downloadButton, 'Export the scoped audit report', { zoom: 1.4 });
  const downloaded = await downloadPromise;
  const originalPath = await downloaded.path(); if (!originalPath) throw new Error('No exported file.');
  const originalBuffer = await readFile(originalPath);
  const report: any = JSON.parse(originalBuffer.toString());
  if (report.sourceDataset?.snapshotId !== snapshotId || report.latestAudit?.sourceId !== sourceId || report.latestAudit?.result !== 'insufficient_evidence') throw new Error('Unexpected report context.');
  await copyFile(originalPath, join(output, 'original-report.json'));
  await at(3.1); await settleOn(verifier);
  const input = verifier.getByLabel('Choose a JSON audit report');
  const originalChooser=page.waitForEvent('filechooser');
  await action(input, 'Load the original export', { anchorX:.035, zoom: 1.4 });
  await (await originalChooser).setFiles(originalPath);
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.');
  await expect(verifier).toContainText('Export context checksum matches.');
  await expect(verifier).toContainText('No blockchain receipt is included in this file.');
  await finish();

  const altered = structuredClone(report);
  altered.latestAudit.reason += ' altered for integrity test';
  altered.latestAudit.bundle.reason += ' altered for integrity test';
  const payload = { ...altered }; delete payload.exportIntegrity;
  altered.exportIntegrity.sha256 = `0x${sha(Buffer.from(canonical(payload)))}`;
  await writeFile(join(output, 'altered-report.json'), JSON.stringify(altered,null,2));
  await settleOn(verifier);
  await start('tamper', 13);
  await at(1.2); const alteredChooser=page.waitForEvent('filechooser');
  await action(input, 'Load the deliberately altered copy', { anchorX:.035, zoom: 1.4 });
  await (await alteredChooser).setFiles({ name: 'methaneresponse-report-altered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(altered)) });
  await expect(verifier).toContainText('Bundle SHA-256 mismatch.');
  await expect(verifier).toContainText('Audit bundle verification failed.');
  await finish();
  await start('original', 10);
  await at(1.2); const restoreChooser=page.waitForEvent('filechooser');
  await action(input, 'Select the untouched original again', { anchorX:.035, zoom: 1.4 });
  await (await restoreChooser).setFiles(originalPath);
  await expect(verifier).toContainText('Audit bundle SHA-256 digest matches.');
  await expect(verifier).toContainText('Export context checksum matches.');
  await finish();
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  await context.close(); context=undefined;
  const destination = join(output, 'actual-ui.webm');
  await copyFile(await video.path(), destination);
  await writeFile(join(output, 'capture.json'), JSON.stringify({
    schemaVersion: 10, createdAt: new Date().toISOString(), localOnly: true, sourceId, snapshotId,
    mode: 'local production build; isolated temporary preview state; no AI, DB, RPC, reviewer or signing credentials',
    contextStart, viewport: { width:1920,height:1080 }, fps:25, video:'actual-ui.webm', sha256:sha(await readFile(destination)),
    shots, pointer, pageErrors,
    claims: { result:'insufficient_evidence', original:'local digest and checksum match', altered:'bundle SHA-256 mismatch', restored:'local digest and checksum match', receipt:'none' },
    report: { originalSha256:sha(originalBuffer), bundleHash:report.latestAudit.bundleHash,
      alteredBundleHash:`0x${sha(Buffer.from(canonical(altered.latestAudit.bundle)))}`,
      reason:report.latestAudit.reason, alteredReason:altered.latestAudit.reason },
    cursor: 'Compositor draws a high-contrast arrow from actual browser pointer and click events. Browser movements use a minimum-jerk path before each real action.',
  },null,2));
  console.log(JSON.stringify({status:'captured',shots:shots.length,pageErrors:pageErrors.length,path:destination}));
} finally {
  await context?.close().catch(()=>{}); await browser?.close().catch(()=>{});
  if (api.exitCode===null) { api.kill('SIGTERM'); await Bun.sleep(400); if (api.exitCode===null) api.kill('SIGKILL'); }
  if (originalTmp===undefined) delete process.env.TMPDIR; else process.env.TMPDIR=originalTmp;
  await runtime.cleanup();
}
