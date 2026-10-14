import { chromium, type Browser, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';
import { isValidMapSnapshotManifest, mapBenchmarkBrowserOptions, parseMapPerformanceServerMode, readMapPerformanceOption, summarizeMapRuns, type MapPerformanceSample } from './map-performance-utils';

const root = resolve(import.meta.dir, '..');
const sampleCount = 5;
const sourceId = readMapPerformanceOption(process.argv.slice(2), 'source', 'KAZ_S_159');
const serverMode = parseMapPerformanceServerMode(readMapPerformanceOption(process.argv.slice(2), 'server', 'production-preview'));
const outputPath = resolve(root, readMapPerformanceOption(process.argv.slice(2), 'output', `docs/evidence/map-performance-cold-runs-${witaDate()}.json`));
const screenshotDirectory = resolve(readMapPerformanceOption(process.argv.slice(2), 'screenshot-dir', join('/tmp', `methaneresponse-map-performance-${witaDate()}`)));
const overwrite = process.argv.includes('--overwrite');

type SampleResult = MapPerformanceSample & {
  ready: boolean;
  readinessFailure?: string;
  cdpResponseCount: number;
  responseHosts: Record<string, number>;
  encodedResponseBytesByHost: Record<string, number>;
  longAnimationFrames: Array<{ durationMs: number; blockingDurationMs: number; scripts: Array<{ durationMs: number; source: string; functionName: string; invokerType: string }> }> | null;
  canvasSize: { width: number; height: number } | null;
  mapStatusText: string | null;
  snapshotVisible: boolean;
  sourceVisible: boolean;
};

type ServerProcess = { child: ChildProcess; log: () => string };

function witaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a loopback port.');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  return port;
}

function launchServer(command: string, args: string[], cwd: string, environment: Record<string, string>): ServerProcess {
  const child = spawn(command, args, { cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let captured = '';
  const collect = (chunk: Buffer) => {
    captured = `${captured}${chunk.toString('utf8')}`.slice(-8_000);
  };
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);
  return { child, log: () => captured };
}

async function waitForEndpoint(url: string, service: ServerProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastError = 'not reached';
  while (Date.now() < deadline) {
    if (service.child.exitCode !== null) {
      throw new Error(`Local server exited before readiness. ${service.log()}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Local server did not become ready (${lastError}). ${service.log()}`);
}

function hostOf(url: string): string {
  try { return new URL(url).hostname; } catch { return 'unparseable-url'; }
}

async function measurePage(
  browser: Browser,
  baseUrl: string,
  viewport: { width: number; height: number },
  sourceCount: number,
  snapshotId: string,
  screenshotPath?: string,
  blockExternal = false,
): Promise<SampleResult> {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'en-US' });
  await context.addInitScript(() => {
    const state = window as Window & {
      __methaneLongTasks?: number[];
      __methaneLongTaskSupported?: boolean;
      __methaneLongAnimationFrames?: Array<{ durationMs: number; blockingDurationMs: number; scripts: Array<{ durationMs: number; source: string; functionName: string; invokerType: string }> }>;
      __methaneLongAnimationFrameSupported?: boolean;
    };
    state.__methaneLongTasks = [];
    state.__methaneLongAnimationFrames = [];
    state.__methaneLongTaskSupported = typeof PerformanceObserver !== 'undefined'
      && PerformanceObserver.supportedEntryTypes.includes('longtask');
    state.__methaneLongAnimationFrameSupported = typeof PerformanceObserver !== 'undefined'
      && PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
    if (state.__methaneLongTaskSupported) {
      try {
        const observer = new PerformanceObserver(entries => {
          for (const entry of entries.getEntries()) state.__methaneLongTasks?.push(entry.duration);
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        state.__methaneLongTaskSupported = false;
      }
    }
    if (state.__methaneLongAnimationFrameSupported) {
      try {
        const observer = new PerformanceObserver(entries => {
          for (const rawEntry of entries.getEntries()) {
            const entry = rawEntry as PerformanceEntry & {
              blockingDuration?: number;
              scripts?: Array<{ duration: number; sourceURL?: string; sourceFunctionName?: string; invokerType?: string }>;
            };
            const scripts = (entry.scripts ?? []).map(script => {
              let source = script.sourceURL || 'inline script';
              try {
                const url = new URL(source, location.href);
                source = `${url.hostname}${url.pathname}`;
              } catch { /* retain the browser-provided source label */ }
              return {
                durationMs: Math.round(script.duration),
                source: source.slice(-120),
                functionName: script.sourceFunctionName || '',
                invokerType: script.invokerType || '',
              };
            }).sort((left, right) => right.durationMs - left.durationMs).slice(0, 5);
            state.__methaneLongAnimationFrames?.push({
              durationMs: Math.round(entry.duration),
              blockingDurationMs: Math.round(entry.blockingDuration ?? 0),
              scripts,
            });
          }
        });
        observer.observe({ type: 'long-animation-frame', buffered: true });
      } catch {
        state.__methaneLongAnimationFrameSupported = false;
      }
    }
  });

  if (blockExternal) {
    await context.route(/^https?:\/\//, route => {
      const host = hostOf(route.request().url());
      if (host === '127.0.0.1' || host === 'localhost') return route.continue();
      return route.abort('internetdisconnected');
    });
  }

  const page = await context.newPage();
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const responseHosts: Record<string, number> = {};
  const encodedResponseBytesByHost: Record<string, number> = {};
  let cdpResponseCount = 0;
  let cdpResponseBytes = 0;
  const requests = new Map<string, string>();
  page.on('pageerror', error => pageErrors.push(error.message.slice(0, 500)));
  page.on('requestfailed', request => failedRequests.push(`${hostOf(request.url())}: ${request.failure()?.errorText ?? 'request failed'}`.slice(0, 300)));

  const cdp = await context.newCDPSession(page);
  cdp.on('Network.requestWillBeSent', event => requests.set(event.requestId, hostOf(event.request.url)));
  cdp.on('Network.loadingFinished', event => {
    cdpResponseCount += 1;
    const encodedBytes = Math.max(0, Math.round(event.encodedDataLength));
    cdpResponseBytes += encodedBytes;
    const host = requests.get(event.requestId) || 'unknown';
    responseHosts[host] = (responseHosts[host] || 0) + 1;
    encodedResponseBytesByHost[host] = (encodedResponseBytesByHost[host] || 0) + encodedBytes;
  });
  await cdp.send('Network.enable');

  let ready = false;
  let readinessMs: number | null = null;
  let readinessFailure: string | undefined;
  try {
    await page.goto(`${baseUrl}/dashboard/map?sourceId=${encodeURIComponent(sourceId)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('.geo-map-topline').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForFunction(expected => {
      const status = document.querySelector('.geo-map-topline')?.textContent ?? '';
      return status.includes(`${expected.toLocaleString('en-US')} sources`);
    }, sourceCount, { timeout: 60_000 });
    ready = true;
    readinessMs = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return navigation ? Math.round(performance.now() - navigation.startTime) : null;
    });
  } catch (error) {
    readinessFailure = error instanceof Error ? error.message.slice(0, 800) : String(error).slice(0, 800);
  }

  if (ready) await page.waitForTimeout(1_000);
  const browserMetrics = await page.evaluate(expectedContext => {
    const state = window as Window & {
      __methaneLongTasks?: number[];
      __methaneLongTaskSupported?: boolean;
      __methaneLongAnimationFrames?: Array<{ durationMs: number; blockingDurationMs: number; scripts: Array<{ durationMs: number; source: string; functionName: string; invokerType: string }> }>;
      __methaneLongAnimationFrameSupported?: boolean;
    };
    const canvas = document.querySelector('.geo-map-canvas canvas')?.getBoundingClientRect();
    const body = document.body.innerText;
    return {
      decodedBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry as PerformanceResourceTiming).decodedBodySize, 0),
      resourceCount: performance.getEntriesByType('resource').length,
      longTasksMs: state.__methaneLongTaskSupported ? state.__methaneLongTasks ?? [] : null,
      longAnimationFrames: state.__methaneLongAnimationFrameSupported ? state.__methaneLongAnimationFrames ?? [] : null,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      canvasSize: canvas ? { width: Math.round(canvas.width), height: Math.round(canvas.height) } : null,
      mapStatusText: document.querySelector('.geo-map-topline')?.textContent?.trim() ?? null,
      degradedNoticeVisible: Boolean(document.querySelector('.geo-map-degraded-notice')),
      fatalMapFallbackVisible: Boolean(document.querySelector('.geo-map-fallback')),
      snapshotVisible: body.includes(expectedContext.snapshotId),
      sourceVisible: body.includes(expectedContext.sourceId),
    };
  }, { sourceId, snapshotId });

  if (screenshotPath) {
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' }).catch(() => undefined);
  }
  await cdp.detach().catch(() => undefined);
  await context.close();

  return {
    readinessMs: readinessMs ?? Number.NaN,
    transferBytes: cdpResponseBytes,
    decodedBytes: browserMetrics.decodedBytes,
    encodedResponseBytesByHost,
    longTasksMs: browserMetrics.longTasksMs,
    longAnimationFrames: browserMetrics.longAnimationFrames,
    horizontalOverflow: browserMetrics.horizontalOverflow,
    pageErrors,
    failedRequests,
    ready,
    ...(readinessFailure ? { readinessFailure } : {}),
    cdpResponseCount,
    responseHosts,
    canvasSize: browserMetrics.canvasSize,
    mapStatusText: browserMetrics.mapStatusText,
    degradedNoticeVisible: browserMetrics.degradedNoticeVisible,
    fatalMapFallbackVisible: browserMetrics.fatalMapFallbackVisible,
    snapshotVisible: browserMetrics.snapshotVisible,
    sourceVisible: browserMetrics.sourceVisible,
  };
}

async function stopServer(service: ServerProcess | undefined): Promise<void> {
  if (!service || service.child.exitCode !== null) return;
  service.child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>(resolveExit => service.child.once('exit', () => resolveExit())),
    new Promise<void>(resolveTimeout => setTimeout(resolveTimeout, 3_000)),
  ]);
  if (service.child.exitCode === null) service.child.kill('SIGKILL');
}

async function main(): Promise<void> {
  if (!overwrite && await Bun.file(outputPath).exists()) throw new Error(`Refusing to overwrite existing evidence: ${outputPath}`);

  const manifestValue = JSON.parse(await readFile(join(root, 'apps/web/public/data/mars-snapshot-manifest.json'), 'utf8')) as unknown;
  if (!isValidMapSnapshotManifest(manifestValue)) throw new Error('The benchmark requires a valid pinned MARS snapshot manifest.');
  const manifest = manifestValue;

  const originalEnvironment = { ...process.env };
  const temporaryRoot = chooseE2ETemporaryRoot(originalEnvironment);
  const safeEnvironment = buildE2ERunnerEnvironment(originalEnvironment, temporaryRoot);
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, safeEnvironment);

  const stateDirectory = await mkdtemp(join(temporaryRoot, 'methane-response-map-perf-'));
  const isolatedViteEnvironmentDirectory = join(stateDirectory, 'vite-env');
  await mkdir(isolatedViteEnvironmentDirectory);
  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(screenshotDirectory, { recursive: true });

  let api: ServerProcess | undefined;
  let web: ServerProcess | undefined;
  let browser: Browser | undefined;
  let finalReport: Record<string, unknown> | undefined;
  let failed = false;
  let buildSummary: { exitCode: number; outputTail: string } | null = null;

  try {
    const apiPort = await freePort();
    const webPort = await freePort();
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    const webUrl = `http://127.0.0.1:${webPort}`;
    const serviceEnvironment = {
      ...safeEnvironment,
      HOST: '127.0.0.1',
      PORT: String(apiPort),
      WEB_ORIGIN: webUrl,
      DATABASE_URL: '',
      TEST_DATABASE_URL: '',
      AUDIT_STORE_PATH: join(stateDirectory, 'audits.json'),
      AI_BASE_URL: '',
      AI_API_KEY: '',
      AI_MODEL: '',
      AI_REVIEW_TOKEN: '',
      HUMAN_REVIEW_TOKEN: '',
      HUMAN_REVIEWER_ID: '',
      REVIEWER_AUTH_SECRET: '',
      ADMIN_API_TOKEN: '',
      SEPOLIA_RPC_URL: '',
      AUDIT_REGISTRY_ADDRESS: '',
      SEPOLIA_PRIVATE_KEY: '',
      RATE_LIMIT_HASH_SECRET: '',
    };
    api = launchServer('bun', ['--no-env-file', '--hot', 'apps/api/src/index.ts'], root, serviceEnvironment);
    await waitForEndpoint(`${apiUrl}/api/health`, api);

    const webEnvironment = {
      ...safeEnvironment,
      METHANE_API_PROXY_TARGET: apiUrl,
      METHANE_E2E_ISOLATED_ENV_DIR: isolatedViteEnvironmentDirectory,
      ...(serverMode === 'production-preview' ? { VITE_API_BASE_URL: apiUrl } : {}),
    };
    if (serverMode === 'production-preview') {
      const build = Bun.spawnSync(['bun', 'run', 'build:web'], {
        cwd: root,
        env: { ...webEnvironment },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const buildOutput = `${new TextDecoder().decode(build.stdout)}\n${new TextDecoder().decode(build.stderr)}`.trim();
      buildSummary = { exitCode: build.exitCode ?? 1, outputTail: buildOutput.slice(-4_000) };
      if (build.exitCode !== 0) throw new Error(`Production build failed. ${buildSummary.outputTail}`);
    }

    const webCommand = serverMode === 'development' ? 'dev' : 'preview';
    web = launchServer('bun', ['--no-env-file', 'run', webCommand, '--', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'], join(root, 'apps/web'), webEnvironment);
    await waitForEndpoint(webUrl, web);

    const executablePath = originalEnvironment.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    browser = await chromium.launch(mapBenchmarkBrowserOptions(executablePath));

    const viewportCases = [
      { name: 'desktop', width: 1_280, height: 800 },
      { name: 'mobileViewportEmulation', width: 390, height: 844 },
    ] as const;
    const viewports: Record<string, unknown> = {};
    for (const viewport of viewportCases) {
      const runs: SampleResult[] = [];
      for (let index = 0; index < sampleCount; index += 1) {
        const shot = index === 0 ? join(screenshotDirectory, `${viewport.name}.png`) : undefined;
        runs.push(await measurePage(browser, webUrl, viewport, manifest.sourceCount, manifest.datasetSnapshotId, shot));
      }
      const usableRuns = runs.filter(run => run.ready && run.readinessMs >= 0);
      const summary = summarizeMapRuns(usableRuns);
      const firstCanvas = runs.find(run => run.canvasSize)?.canvasSize ?? null;
      viewports[viewport.name] = {
        viewport: { width: viewport.width, height: viewport.height },
        canvasCssPixels: firstCanvas,
        attemptedRunCount: runs.length,
        usableRunCount: usableRuns.length,
        ...summary,
        runs,
      };
      if (usableRuns.length !== sampleCount || runs.some(run => run.horizontalOverflow || run.pageErrors.length > 0 || !run.snapshotVisible || !run.sourceVisible)) failed = true;
    }

    const fallbackRun = await measurePage(
      browser,
      webUrl,
      { width: 1_280, height: 800 },
      manifest.sourceCount,
      manifest.datasetSnapshotId,
      join(screenshotDirectory, 'external-tiles-blocked.png'),
      true,
    );
    const fallback = {
      externalHttpBlocked: true,
      mapRemainedUsable: fallbackRun.ready && fallbackRun.canvasSize !== null && fallbackRun.snapshotVisible && fallbackRun.sourceVisible && !fallbackRun.fatalMapFallbackVisible,
      degradedNoticeVisible: fallbackRun.degradedNoticeVisible,
      fatalMapFallbackVisible: fallbackRun.fatalMapFallbackVisible,
      mapStatusText: fallbackRun.mapStatusText,
      horizontalOverflow: fallbackRun.horizontalOverflow,
      pageErrors: fallbackRun.pageErrors,
      failedRequestCount: fallbackRun.failedRequests.length,
      screenshot: join(screenshotDirectory, 'external-tiles-blocked.png'),
    };
    if (!fallback.mapRemainedUsable || !fallback.degradedNoticeVisible || fallback.horizontalOverflow || fallback.pageErrors.length > 0) failed = true;

    const git = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: root });
    const sourceRevision = new TextDecoder().decode(git.stdout).trim();
    finalReport = {
      schemaVersion: 2,
      recordedAt: new Date().toISOString(),
      sourceRevision,
      dataset: {
        snapshotId: manifest.datasetSnapshotId,
        sourceCount: manifest.sourceCount,
        plumeCount: manifest.plumeCount,
        sourceArchiveSha256: manifest.sourceArchiveSha256,
      },
      environment: {
        browser: `Chromium ${browser.version()}`,
        platform: `${process.platform} ${process.arch}`,
        runtime: `Bun ${Bun.version}`,
        server: serverMode === 'development'
          ? 'isolated Vite development server + isolated local file-store API'
          : 'Vite production preview + isolated local file-store API',
        renderTier: 'forced software WebGL (SwiftShader); not a physical GPU benchmark',
        devicePixelRatio: 1,
        route: `/dashboard/map?sourceId=${sourceId}`,
      },
      build: buildSummary ? { exitCode: buildSummary.exitCode, outputTail: buildSummary.outputTail } : null,
      method: {
        sampleCountPerViewport: sampleCount,
        contextPolicy: 'A new Chromium browser context is created for each sample; HTTP cache is isolated per context. OS, host and upstream caches are not cleared.',
        readinessDefinition: `Elapsed page navigation time until the map status announces ${manifest.sourceCount.toLocaleString('en-US')} sources after MapLibre becomes usable.`,
        transferBytesDefinition: 'Chromium CDP encoded response body bytes received before sampling ended; excludes request/response headers and does not represent every byte on the wire.',
        decodedBytesDefinition: 'Sum of decodedBodySize values exposed by PerformanceResourceTiming; cross-origin entries can be unavailable.',
        longTaskWindow: 'Observed from document initialization through one second after map readiness.',
        externalFallback: 'One additional desktop context blocks all non-loopback HTTP(S) requests before navigation.',
      },
      viewports,
      fallback,
      screenshots: {
        directory: screenshotDirectory,
        retention: 'Local diagnostic only; not copied into the public repository because imagery-provider redistribution rights have not been cleared.',
      },
      limitations: [
        'Software WebGL and viewport emulation do not establish physical-phone GPU performance or FPS.',
        'Development-server timing is not a deployed production/CDN measurement.',
        'Third-party tile availability, browser scheduling and network conditions can change between runs.',
        'Transfer bytes omit headers and may differ from operating-system network totals.',
      ],
      result: failed ? 'measurement_failed_acceptance' : 'measurement_completed_local',
    };
  } finally {
    await browser?.close().catch(() => undefined);
    await stopServer(web);
    await stopServer(api);
    await rm(stateDirectory, { recursive: true, force: true });
  }

  if (!finalReport) throw new Error('No performance report was produced.');
  await writeFile(outputPath, `${JSON.stringify(finalReport, null, 2)}\n`, { flag: overwrite ? 'w' : 'wx' });
  process.stdout.write(`${JSON.stringify({ outputPath, result: finalReport.result, sourceRevision: finalReport.sourceRevision, dataset: finalReport.dataset, screenshots: screenshotDirectory }, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Map performance measurement failed: ${message}\n`);
  process.exitCode = 1;
});
