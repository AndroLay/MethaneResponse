import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';

const assetsDirectory = resolve(import.meta.dir, '../apps/web/dist/assets');
const appGzipBudgetBytes = 75_000;
const lazyWorkspaceChunks = [
  'CasesWorkspace',
  'IntelligencePanel',
  'EvidenceObservationPanel',
  'CaseDetailsDialog',
  'AuditHistoryPanel',
  'ImportedAuditVerifier',
  'OperatorsWorkspace',
  'SettingsWorkspace',
];

if (!statSync(assetsDirectory, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error('Production web assets are missing; run `bun run build:web` first.');
}

const assets = readdirSync(assetsDirectory);
const appFiles = assets.filter(name => /^App-[\w-]+\.js$/.test(name));
const mapFiles = assets.filter(name => /^MapPanel-[\w-]+\.js$/.test(name));
const appFile = appFiles.sort((a, b) => statSync(join(assetsDirectory, b)).size - statSync(join(assetsDirectory, a)).size)[0];
const appGzipBytes = appFile ? gzipSync(readFileSync(join(assetsDirectory, appFile))).byteLength : null;
const missingChunks = lazyWorkspaceChunks.filter(name => !assets.some(asset => asset.startsWith(`${name}-`) && asset.endsWith('.js')));
const failures: string[] = [];

if (!appFile || appGzipBytes === null) failures.push('App entry chunk is missing.');
else if (appGzipBytes > appGzipBudgetBytes) failures.push(`App entry is ${appGzipBytes} gzip bytes; budget is ${appGzipBudgetBytes}.`);
if (mapFiles.length !== 1) failures.push(`Expected one independently lazy MapPanel chunk; found ${mapFiles.length}.`);
if (missingChunks.length) failures.push(`Missing lazy workspace chunks: ${missingChunks.join(', ')}.`);

if (failures.length) {
  console.error('Web bundle budget failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Web bundle budget passed: App ${appGzipBytes} gzip bytes; ${lazyWorkspaceChunks.length} route chunks; MapPanel ${statSync(join(assetsDirectory, mapFiles[0]!)).size} raw bytes.`);
}
