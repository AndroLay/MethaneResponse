/** Freeze only claim/input digests before reviewers label private assessment inputs.
 *
 * This command is local-only. It never calls an AI provider and writes a digest
 * manifest, not claim wording or excerpt text, to a private no-overwrite file.
 */
import { createHash } from 'node:crypto';
import { link, lstat, mkdtemp, open, readFile, realpath, rm, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DocumentAssessmentInput, assessmentInputHashes } from '../apps/api/src/ai-review';

const MAX_INPUT_BYTES = 16 * 1024 * 1024;
const MAX_CLAIMS = 100;
const ID = /^[a-zA-Z0-9:_-]{1,100}$/;
const repositoryRoot = resolve(import.meta.dir, '..');

type FrozenClaimDigest = {
  claimId: string;
  claimTextSha256: string;
  assessmentInputSha256: string;
};

export type FrozenAssessmentInputManifest = {
  schemaVersion: 1;
  inputFileSha256: string;
  claimCount: number;
  claims: FrozenClaimDigest[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInside(path: string, directory: string): boolean {
  const pathFromDirectory = relative(directory, path);
  return pathFromDirectory === '' || (pathFromDirectory !== '..'
    && !pathFromDirectory.startsWith(`..${sep}`) && !isAbsolute(pathFromDirectory));
}

function assertOutsideRepository(path: string, label: string) {
  if (isInside(resolve(path), repositoryRoot)) {
    throw new Error(`${label} must be outside the repository`);
  }
}

function requireOwnerOnly(mode: number, label: string) {
  if (process.platform !== 'win32' && (mode & 0o077) !== 0) {
    throw new Error(`Private ${label} must have owner-only permissions`);
  }
}

export function freezeAssessmentInputManifest(rows: unknown[], rawInput: Uint8Array): FrozenAssessmentInputManifest {
  if (rawInput.byteLength < 1 || rawInput.byteLength > MAX_INPUT_BYTES) {
    throw new Error(`Candidate inputs must be between 1 byte and ${MAX_INPUT_BYTES} bytes`);
  }
  if (!rows.length || rows.length > MAX_CLAIMS) throw new Error(`Candidate file must contain 1 to ${MAX_CLAIMS} claims`);
  const seen = new Set<string>();
  const claims = rows.map((row): FrozenClaimDigest => {
    if (!isRecord(row) || typeof row.claimId !== 'string' || !ID.test(row.claimId)) throw new Error('Candidate row requires a valid claimId');
    if (seen.has(row.claimId)) throw new Error(`Duplicate claimId: ${row.claimId}`);
    const input = DocumentAssessmentInput.parse(row.input);
    const hashes = assessmentInputHashes(input);
    if (!hashes) throw new Error(`An exact bounded claim statement is required for ${row.claimId}`);
    seen.add(row.claimId);
    return { claimId: row.claimId, ...hashes };
  });
  return {
    schemaVersion: 1,
    inputFileSha256: createHash('sha256').update(rawInput).digest('hex'),
    claimCount: claims.length,
    claims,
  };
}

async function resolvePrivateInput(path: string) {
  const resolved = await realpath(resolve(path));
  assertOutsideRepository(resolved, 'Private benchmark inputs');
  const info = await stat(resolved);
  if (!info.isFile() || info.size > MAX_INPUT_BYTES) throw new Error('Candidate input must be a regular file up to 16 MiB');
  requireOwnerOnly(info.mode, 'candidate input file');
  const parent = await realpath(dirname(resolved));
  requireOwnerOnly((await stat(parent)).mode, 'candidate input directory');
  return resolved;
}

async function resolvePrivateOutput(path: string) {
  const parent = await realpath(dirname(resolve(path)));
  assertOutsideRepository(parent, 'Private digest output directory');
  requireOwnerOnly((await stat(parent)).mode, 'digest output directory');
  const target = join(parent, basename(resolve(path)));
  assertOutsideRepository(target, 'Private digest output');
  return target;
}

function parseCandidateJsonl(text: string) {
  const rows: unknown[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let row: unknown;
    try { row = JSON.parse(line) as unknown; }
    catch { throw new Error(`Invalid candidate JSONL row ${index + 1}`); }
    rows.push(row);
    if (rows.length > MAX_CLAIMS) throw new Error(`Candidate file exceeds ${MAX_CLAIMS} rows`);
  }
  return rows;
}

export async function writeFrozenAssessmentInputManifest(inputPath: string, outputPath: string) {
  const source = await resolvePrivateInput(inputPath);
  const target = await resolvePrivateOutput(outputPath);
  if (source === target) throw new Error('Digest output must not overwrite candidate inputs');
  const raw = await readFile(source);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  const manifest = freezeAssessmentInputManifest(parseCandidateJsonl(text), raw);
  const payload = `${JSON.stringify(manifest, null, 2)}\n`;
  const parent = dirname(target);
  const scratch = await mkdtemp(join(parent, '.methane-response-input-digests-'));
  let outputPublished = false;
  try {
    const temporary = join(scratch, 'manifest.json');
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(payload, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await link(temporary, target);
    outputPublished = true;
    return manifest;
  } finally {
    await rm(scratch, { recursive: true, force: true });
    if (!outputPublished) {
      try {
        const existing = await lstat(target);
        if (!existing.isFile()) throw new Error('Refusing to remove non-file digest output');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }
}

function parseArguments(args: string[]) {
  const values = new Map<string, string>();
  for (const argument of args) {
    const separator = argument.indexOf('=');
    if (!argument.startsWith('--') || separator < 0) throw new Error('Expected --input=PATH and --output=PATH');
    const key = argument.slice(2, separator);
    if (!['input', 'output'].includes(key) || values.has(key)) throw new Error('Expected one --input and one --output option');
    values.set(key, argument.slice(separator + 1));
  }
  const input = values.get('input');
  const output = values.get('output');
  if (!input || !output) throw new Error('Both --input and --output are required');
  return { input, output };
}

async function main() {
  const { input, output } = parseArguments(process.argv.slice(2));
  const manifest = await writeFrozenAssessmentInputManifest(input, output);
  process.stdout.write(`Frozen ${manifest.claimCount} assessment input digests. The output contains hashes only and no provider was called.\n`);
}

if (import.meta.main) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`Assessment input freeze halted: ${message}`);
    process.exitCode = 1;
  });
}
