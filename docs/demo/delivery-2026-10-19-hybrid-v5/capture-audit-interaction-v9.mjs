#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium, expect } from '@playwright/test';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const captureName = process.env.MR_CAPTURE_NAME ?? 'audit-interaction-v9-3-final-source';
if (!/^[a-z0-9-]+$/.test(captureName)) throw new Error('MR_CAPTURE_NAME must contain only lowercase letters, digits, or hyphens.');
const outputDir = path.join(repo, 'delivery-output/story-v5', captureName);
const videoTempDir = await mkdtemp(path.join(tmpdir(), 'methane-response-v9.3-'));
const baseUrl = process.env.MR_CAPTURE_BASE_URL ?? 'http://127.0.0.1:4179';
const videoSize = { width: 1920, height: 1080 };
const waitUntil = async (markerMs, offsetMs) => {
  const remaining = markerMs + offsetMs - Date.now();
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/usr/bin/chromium',
  headless: true,
  chromiumSandbox: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
});
const context = await browser.newContext({
  viewport: videoSize,
  deviceScaleFactor: 1,
  recordVideo: { dir: videoTempDir, size: videoSize },
});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.route(/^https?:\/\//, route => {
  const url = new URL(route.request().url());
  return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
});
await page.addInitScript(() => {
  const install = () => {
    if (document.getElementById('mr-demo-pointer')) return;
    const style = document.createElement('style');
    style.textContent = `
      html, body, * { cursor: none !important; }
      #mr-demo-pointer { position: fixed; z-index: 2147483647; width: 15px; height: 15px; border-radius: 50%;
        border: 2px solid #e9fffb; background: #12cdbc; box-shadow: 0 0 0 3px #062b39, 0 2px 12px #001923;
        pointer-events: none; transform: translate(-50%, -50%); opacity: 0; transition: opacity .08s linear; }
      #mr-demo-pointer.visible { opacity: 1; }
      #mr-demo-pointer.click::after { content: ''; position: absolute; inset: -8px; border: 2px solid #12cdbc;
        border-radius: 50%; animation: mr-demo-click .44s ease-out both; }
      @keyframes mr-demo-click { from { transform: scale(.45); opacity:.9; } to { transform:scale(1.65); opacity:0; } }
      @media (prefers-reduced-motion: reduce) { #mr-demo-pointer.click::after { animation-duration:.2s; } }
    `;
    document.head.appendChild(style);
    const dot = document.createElement('div');
    dot.id = 'mr-demo-pointer';
    document.body.appendChild(dot);
    document.addEventListener('pointermove', event => {
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
      dot.classList.add('visible');
    }, true);
    document.addEventListener('pointerdown', () => {
      dot.classList.remove('click');
      requestAnimationFrame(() => dot.classList.add('click'));
      setTimeout(() => dot.classList.remove('click'), 500);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
});

const recordingStartedAt = Date.now();
const pageVideo = page.video();
let captureError;
let interactionStartSeconds = 0;
try {
await page.goto(`${baseUrl}/dashboard/audit?sourceId=KAZ_S_159`, { waitUntil: 'domcontentloaded' });
const scope = page.getByRole('region', { name: 'Assessment scope' });
await scope.waitFor({ state: 'visible', timeout: 60_000 });
const periodStart = scope.getByLabel('Period start');
const periodEnd = scope.getByLabel('Period end');
const useLoadedPeriod = scope.getByRole('button', { name: 'Use loaded observation period' });
const observationEvent = scope.getByLabel('Observation event');
const useObservationDay = scope.getByRole('button', { name: 'Use selected observation day' });
const applyScope = scope.getByRole('button', { name: 'Apply assessment scope' });
const runBaseline = page.getByRole('button', { name: 'Run rules baseline' });

await expect(useLoadedPeriod).toBeEnabled();
await expect(observationEvent).toContainText(/2026-07-11/);
await scope.scrollIntoViewIfNeeded();
await page.waitForTimeout(1_000);
interactionStartSeconds = Number(((Date.now() - recordingStartedAt) / 1_000).toFixed(3));
const markerMs = Date.now();

await waitUntil(markerMs, 350);
await useLoadedPeriod.click();
await expect(periodStart).toHaveValue('2024-06-07');
await expect(periodEnd).toHaveValue('2026-07-11');

await waitUntil(markerMs, 1_650);
await observationEvent.selectOption('941806b5-2afe-46ac-baac-a0230880cede');
await useObservationDay.click();
await expect(periodStart).toHaveValue('2026-07-11');
await expect(periodEnd).toHaveValue('2026-07-11');

await waitUntil(markerMs, 3_850);
await applyScope.click();
await expect(scope.getByText(/2026-07-11\s*→\s*2026-07-11/)).toBeVisible();
await expect(runBaseline).toBeEnabled();

await waitUntil(markerMs, 10_850);
await runBaseline.click();
await expect(page.locator('.audit-verdict-card')).toContainText(/Insufficient reference coverage/i, { timeout: 20_000 });
await waitUntil(markerMs, 32_500);
} catch (error) {
  captureError = error;
}

await context.close().catch(() => {});
await browser.close().catch(() => {});
if (captureError) {
  await rm(videoTempDir, { recursive: true, force: true });
  throw captureError;
}
const videoPath = await pageVideo.path();
const videoName = `${captureName}.webm`;
const destination = path.join(outputDir, videoName);
await copyFile(videoPath, destination);
await rm(videoTempDir, { recursive: true, force: true });
const sha256 = createHash('sha256').update(await readFile(destination)).digest('hex');
const { stdout: durationOutput } = await execFileAsync(process.env.FFPROBE_PATH ?? '/usr/bin/ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', destination,
], { timeout: 30_000, maxBuffer: 1_000_000 });
const sourceDurationSeconds = Number(durationOutput.trim());
if (!Number.isFinite(sourceDurationSeconds) || sourceDurationSeconds < interactionStartSeconds + 31) throw new Error('Recorded source is too short for both video scenes.');
const manifest = {
  schemaVersion: 1,
  localOnly: true,
  sourceId: 'KAZ_S_159',
  claim: 'mitigation_confirmed',
  video: videoName,
  sha256,
  sourceDurationSeconds,
  viewport: videoSize,
  interactionStartSeconds,
  scenes: {
    scope: { sourceStartSeconds: interactionStartSeconds, durationSeconds: 8 },
    audit: { sourceStartSeconds: Number((interactionStartSeconds + 8).toFixed(3)), durationSeconds: 23 },
  },
  verifiedActions: [
    'Load the historical observation period from the local snapshot.',
    'Select the 2026-07-11 observation event and apply its single-day UTC scope.',
    'Run the deterministic rules baseline for the mitigation-confirmation claim.',
  ],
  expectedResult: 'Insufficient Reference Coverage',
  pageErrors,
};
await writeFile(path.join(outputDir, 'capture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
if (pageErrors.length) throw new Error(`The recorded application raised page errors: ${pageErrors.join(' | ')}`);
process.stdout.write(`Local app interaction recorded: ${destination}\n`);
process.stdout.write(`Interaction begins at ${interactionStartSeconds}s · ${sha256}\n`);
