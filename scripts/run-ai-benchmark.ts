/** Permissioned, explicitly billable runner for a private held-out AI benchmark.
 *
 * This command can transmit document excerpts and incur provider charges. It
 * refuses to run without a second explicit approval flag and per-row rights
 * review. Predictions contain exact quote excerpts and are written mode 0600.
 */
import { link, lstat, mkdtemp, open, readFile, realpath, rm, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { aiConfigured, assessmentInputHashes, DocumentAssessmentInput, PROMPT_VERSION, requestModelAssessment, verifyCitations } from '../apps/api/src/ai-review';
import { canonicalJson } from '../apps/api/src/canonical';

const REQUIRED_RIGHTS_SCOPES = [
  'excerptProcessing', 'providerProcessing', 'privateEvaluationStorage', 'quoteStorage', 'metricsPublication',
] as const;
type RightsScope = typeof REQUIRED_RIGHTS_SCOPES[number];
type DocumentRightsApproval = {
  documentId: string;
  documentUrl: string;
  rightsBasis: { kind: 'license'; title: string; url: string }
    | { kind: 'written_permission' | 'owned'; title: string; referenceId: string };
  scopes: Record<RightsScope, true>;
};
type RightsReview = {
  reviewerId: string;
  reviewedAt: string;
  documents: DocumentRightsApproval[];
};

export type Candidate = {
  claimId: string;
  split: 'test';
  synthetic: false;
  sourceInspected: true;
  reviewerId: string;
  reviewedAt: string;
  claimTextSha256: string;
  assessmentInputSha256: string;
  rightsReview: RightsReview;
  input: unknown;
};

const safeId = /^[a-zA-Z0-9:_-]{1,100}$/;
const reviewerIdPattern = /^[a-zA-Z0-9._:@-]{3,96}$/;
const maxInputBytes = 16 * 1024 * 1024;
const repositoryRoot = resolve(import.meta.dir, '..');

export function validateCandidates(rows: unknown[], maxClaims: number) {
  if (!Number.isSafeInteger(maxClaims) || maxClaims < 1 || maxClaims > 100) throw new Error('Set --max-claims within 1–100');
  if (!rows.length || rows.length > maxClaims) throw new Error(`Refusing ${rows.length} provider claims; approved cap is ${maxClaims}`);
  const seen = new Set<string>();
  return rows.map((row): { claimId: string; input: ReturnType<typeof DocumentAssessmentInput.parse>; rightsReviewSha256: string; claimTextSha256: string; assessmentInputSha256: string } => {
    if (typeof row !== 'object' || !row || Array.isArray(row)) throw new Error('Invalid benchmark JSONL row');
    const candidate = row as Partial<Candidate>;
    if (!candidate.claimId || !safeId.test(candidate.claimId) || seen.has(candidate.claimId)) throw new Error('Duplicate or malformed claim ID');
    if (candidate.split !== 'test' || candidate.synthetic !== false
        || candidate.sourceInspected !== true
        || !candidate.reviewerId || !reviewerIdPattern.test(candidate.reviewerId)
        || !candidate.reviewedAt || !Number.isFinite(Date.parse(candidate.reviewedAt))) {
      throw new Error('Only human-inspected, non-synthetic held-out test claims may be sent');
    }
    const input = DocumentAssessmentInput.parse(candidate.input);
    const actualInputHashes = assessmentInputHashes(input);
    if (!actualInputHashes || candidate.claimTextSha256 !== actualInputHashes.claimTextSha256
        || candidate.assessmentInputSha256 !== actualInputHashes.assessmentInputSha256) {
      throw new Error(`Frozen claim or assessment input digest mismatch for ${candidate.claimId}`);
    }
    const rightsReview = candidate.rightsReview;
    if (!rightsReview || typeof rightsReview !== 'object' || Array.isArray(rightsReview)) {
      throw new Error(`A document-specific rights review is required for ${candidate.claimId}`);
    }
    if (rightsReview.reviewerId !== candidate.reviewerId
        || !reviewerIdPattern.test(rightsReview.reviewerId)
        || rightsReview.reviewedAt !== candidate.reviewedAt
        || !Number.isFinite(Date.parse(rightsReview.reviewedAt))) {
      throw new Error(`Rights review identity and date must match the source-inspection review for ${candidate.claimId}`);
    }
    if (!Array.isArray(rightsReview.documents)) throw new Error(`Rights review must list every submitted document for ${candidate.claimId}`);
    const approvedDocuments = new Map<string, DocumentRightsApproval>();
    for (const approval of rightsReview.documents) {
      if (!approval || typeof approval !== 'object' || !safeId.test(approval.documentId)
          || approvedDocuments.has(approval.documentId)) {
        throw new Error(`Duplicate or malformed rights review document for ${candidate.claimId}`);
      }
      if (!isSafeHttps(approval.documentUrl)) throw new Error(`Document rights source URLs must use credential-free HTTPS for ${candidate.claimId}`);
      if (!approval.rightsBasis || typeof approval.rightsBasis !== 'object'
          || typeof approval.rightsBasis.title !== 'string' || !approval.rightsBasis.title.trim()) {
        throw new Error(`A named license or permission basis is required for ${candidate.claimId}`);
      }
      if (approval.rightsBasis.kind === 'license') {
        if (!isSafeHttps(approval.rightsBasis.url)) throw new Error(`License rights basis URLs must use credential-free HTTPS for ${candidate.claimId}`);
      } else if (approval.rightsBasis.kind === 'written_permission' || approval.rightsBasis.kind === 'owned') {
        if (typeof approval.rightsBasis.referenceId !== 'string' || !safeId.test(approval.rightsBasis.referenceId)) {
          throw new Error(`A private permission/ownership reference is required for ${candidate.claimId}`);
        }
      } else {
        throw new Error(`Unsupported rights basis for ${candidate.claimId}`);
      }
      if (!approval.scopes || REQUIRED_RIGHTS_SCOPES.some(scope => approval.scopes[scope] !== true)) {
        throw new Error(`Rights review must clear excerpt processing, provider processing, private evaluation, quote storage and metrics publication for ${candidate.claimId}`);
      }
      approvedDocuments.set(approval.documentId, approval);
    }
    const inputDocuments = new Map(input.documents.map(document => [document.id, document]));
    if (approvedDocuments.size !== inputDocuments.size
        || [...inputDocuments.keys()].some(documentId => !approvedDocuments.has(documentId))) {
      throw new Error(`Rights review documents must exactly match the submitted documents for ${candidate.claimId}`);
    }
    for (const [documentId, document] of inputDocuments) {
      const approval = approvedDocuments.get(documentId)!;
      if (document.sourceUrl && document.sourceUrl !== approval.documentUrl) {
        throw new Error(`Rights review source URL does not match submitted document ${documentId}`);
      }
    }
    seen.add(candidate.claimId);
    const rightsReviewSha256 = createHash('sha256').update(canonicalJson({
      reviewerId: rightsReview.reviewerId,
      reviewedAt: rightsReview.reviewedAt,
      documents: [...approvedDocuments.values()].sort((a, b) => a.documentId.localeCompare(b.documentId)),
    })).digest('hex');
    return { claimId: candidate.claimId, input, rightsReviewSha256, ...actualInputHashes };
  });
}

function isSafeHttps(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  for (const option of argv) {
    const separator = option.indexOf('=');
    if (!option.startsWith('--') || separator < 0) throw new Error('Expected --name=value parameters');
    const name = option.slice(2, separator);
    if (flags.has(name)) throw new Error(`Duplicate option: --${name}`);
    flags.set(name, option.slice(separator + 1));
  }
  const accepted = new Set(['input', 'output', 'max-claims', 'i-approve-billable-provider-calls']);
  if ([...flags.keys()].some(name => !accepted.has(name))) throw new Error('Unknown benchmark option');
  if (flags.get('i-approve-billable-provider-calls') !== 'yes') {
    throw new Error('Explicit --i-approve-billable-provider-calls=yes is required; a supported claim may trigger two provider requests');
  }
  const source = flags.get('input');
  const output = flags.get('output');
  if (!source || !output) throw new Error('Both --input and --output are required');
  if (!aiConfigured()) throw new Error('AI provider is not configured; no mock predictions are generated');
  const maxClaims = Number(flags.get('max-claims') || '8');
  return { source: resolve(source), output: resolve(output), maxClaims };
}

function privateOutputPath(path: string) {
  const normalized = resolve(path);
  const relativeToRepository = relative(repositoryRoot, normalized);
  const isInsideRepository = relativeToRepository === ''
    || (relativeToRepository !== '..'
      && !relativeToRepository.startsWith(`..${sep}`)
      && !isAbsolute(relativeToRepository));
  if (isInsideRepository) {
    throw new Error('Private benchmark predictions must be written outside the repository');
  }
  if (normalized.split(/[\\/]+/).some(part => ['public', 'design-reference', '.git', 'node_modules'].includes(part.toLowerCase()))) {
    throw new Error('Private benchmark predictions cannot be written under public assets or source-control directories');
  }
}

async function resolvePrivateOutputPath(path: string) {
  privateOutputPath(path);
  let actualParent: string;
  try {
    actualParent = await realpath(dirname(resolve(path)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('Private benchmark output directory must already exist');
    }
    throw error;
  }
  const privateOutput = resolve(actualParent, basename(path));
  privateOutputPath(privateOutput);
  return privateOutput;
}

type BenchmarkAssessor = typeof requestModelAssessment;

/** Write a complete private result atomically, and leave no partial result on failure. */
export async function executeBenchmarkToPrivateFile(
  candidates: ReturnType<typeof validateCandidates>,
  outputPath: string,
  assessor: BenchmarkAssessor = requestModelAssessment,
) {
  const privateOutput = await resolvePrivateOutputPath(outputPath);
  const lockPath = `${privateOutput}.lock`;
  try {
    await lstat(privateOutput);
    throw new Error('Benchmark output already exists; choose a new private path');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  // The lock prevents concurrent runs from paying for duplicate provider calls.
  const lockHandle = await open(lockPath, 'wx', 0o600);
  const lockInfo = await lockHandle.stat();
  await lockHandle.close();

  let scratchDirectory: string | undefined;
  try {
    const records = [];
    for (const { claimId, input, rightsReviewSha256, claimTextSha256, assessmentInputSha256 } of candidates) {
      const raw = await assessor(input);
      const checked = verifyCitations(input, raw);
      records.push({
        claimId,
        verdict: checked.result,
        citations: checked.quotes,
        rightsReviewSha256,
        claimTextSha256,
        assessmentInputSha256,
        modelVersion: String(process.env.AI_MODEL),
        promptVersion: PROMPT_VERSION,
        citationValidationFailures: checked.rejected,
      });
    }

    scratchDirectory = await mkdtemp(join(dirname(privateOutput), '.methane-response-benchmark-'));
    const temporaryPath = join(scratchDirectory, 'predictions.jsonl');
    const temporaryHandle = await open(temporaryPath, 'wx', 0o600);
    try {
      await temporaryHandle.writeFile(records.map(record => `${JSON.stringify(record)}\n`).join(''));
      await temporaryHandle.sync();
    } finally {
      await temporaryHandle.close();
    }

    // link() is an atomic no-overwrite publish on the same filesystem.
    await link(temporaryPath, privateOutput);
    return records.length;
  } finally {
    if (scratchDirectory) await rm(scratchDirectory, { recursive: true, force: true });
    try {
      const currentLock = await lstat(lockPath);
      if (currentLock.dev === lockInfo.dev && currentLock.ino === lockInfo.ino && currentLock.isFile()) {
        await unlink(lockPath);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

async function main() {
  const { source, output, maxClaims } = parseArgs(process.argv.slice(2));
  const sourcePath = await realpath(source);
  const sourceInfo = await stat(sourcePath);
  if (!sourceInfo.isFile() || sourceInfo.size > maxInputBytes) throw new Error('Benchmark input must be a file up to 16 MiB');
  const contents = await readFile(sourcePath, 'utf8');
  if (Buffer.byteLength(contents, 'utf8') > maxInputBytes) throw new Error('Benchmark input exceeds 16 MiB');
  let rows: unknown[];
  try {
    rows = contents.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line) as unknown);
  } catch {
    throw new Error('Benchmark input must be valid private JSONL');
  }
  const candidates = validateCandidates(rows, maxClaims);

  const privateOutput = await resolvePrivateOutputPath(output);
  if (privateOutput === sourcePath) throw new Error('Output must not overwrite evidence inputs');
  const processed = await executeBenchmarkToPrivateFile(candidates, privateOutput);
  process.stdout.write(`Processed ${processed} reviewed held-out claims. Rights-review digests are included; prediction output is private and independent human evaluation is still required.\n`);
}

if (import.meta.main) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`AI benchmark halted: ${message}`);
    process.exitCode = 1;
  });
}
