#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const htmlPath = path.join(here, 'composition-v9.html');
const outDir = path.join(repo, 'delivery-output/story-v5/slides-v9-final');
const manifestPath = path.join(repo, 'delivery-output/story-v4/capture-manifest.json');
const chromium = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
const stages = [
  { id: 'reveal', delayMs: 1400 },
  { id: 'build', delayMs: 2600 },
  { id: 'settled', delayMs: 4300 },
];
await stat(chromium);
const html = await readFile(htmlPath, 'utf8');
const jsonMatch = /<script id="timeline-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
if (!jsonMatch) throw new Error('The composition has no canonical timeline-data block.');
const scenes = JSON.parse(jsonMatch[1]);
const captureManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const preroll = Number(captureManifest.prerollSeconds);
if (!Number.isFinite(preroll)) throw new Error('The app capture manifest has no valid prerollSeconds.');
const slideScenes = scenes.filter((scene) => scene.kind === 'slide');
if (!slideScenes.length || scenes.at(-1)?.end !== 290) throw new Error('The 290-second timeline is incomplete.');

await mkdir(outDir, { recursive: true });
const profileDir = await mkdtemp(path.join(repo, 'delivery-output/story-v5/.chromium-profile-v9-'));
const configDir = path.join(profileDir, 'config');
await mkdir(configDir, { recursive: true });
const generated = [];
try {
  for (const scene of slideScenes) {
    for (const stage of stages) {
      const outputPath = path.join(outDir, `${String(scene.start).padStart(3, '0')}-${scene.id}-${stage.id}.png`);
      try {
        await lstat(outputPath);
        throw new Error(`Refusing to overwrite slide frame: ${outputPath}`);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      const url = new URL(pathToFileURL(htmlPath));
      url.searchParams.set('preroll', String(preroll));
      url.searchParams.set('preview', String(scene.start));
      try {
        await execFileAsync(chromium, [
          '--headless', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files',
          '--disable-background-networking', '--disable-component-update', '--disable-extensions', '--no-first-run',
          `--user-data-dir=${profileDir}`,
          '--window-size=1920,1080', `--virtual-time-budget=${stage.delayMs}`,
          '--run-all-compositor-stages-before-draw', '--hide-scrollbars', `--screenshot=${outputPath}`, url.href,
        ], { env: { ...process.env, XDG_CONFIG_HOME: configDir }, timeout: 45_000, maxBuffer: 4 * 1024 * 1024 });
      } catch (error) {
        throw new Error(`Chromium failed to capture ${scene.id}/${stage.id}: ${(error.stderr ?? error.message).trim().slice(-1400)}`);
      }
      const image = await stat(outputPath);
      if (image.size < 20_000) throw new Error(`Slide image is unexpectedly small: ${outputPath} (${image.size} bytes).`);
      generated.push({ id: scene.id, stage: stage.id, atSeconds: scene.start, path: outputPath, bytes: image.size });
    }
  }
} finally {
  await rm(profileDir, { recursive: true, force: true });
}

process.stdout.write(`Rendered ${generated.length} progressive slide frames at 1920×1080.\n`);
for (const frame of generated) process.stdout.write(`${String(frame.atSeconds).padStart(3, '0')}s  ${frame.id}/${frame.stage}  ${frame.bytes} bytes\n`);
