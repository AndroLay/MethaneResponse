# MethaneResponse — Independent Methane Evidence Audit

**Track:** Climate Data & Environmental Monitoring · **Status:** locally runnable MVP, not a methane-monitoring authority.

MethaneResponse helps a reviewer check whether a narrowly stated methane claim is supported by traceable records. It does not replace UNEP's Methane Alert and Response System (MARS), detect methane, or certify physical repairs.

## What works

- The dashboard loads the full, attributed UNEP MARS browser snapshot: 4,218 source rows and 30,414 plume rows from 2020-10-29 through 2026-09-13. It retains all 6,553 plume rows without a source ID as unresolved records. The deterministic baseline accepts sources in the pinned snapshot: it can support a detection claim from a linked plume record, while notification and mitigation claims without attributable evidence abstain. The active four-source casebook includes link-only UNEP publisher references; the earlier three-source rules benchmark remains separately pinned to its original casebook revision. Optional document assessment can resolve any exact source ID in the validated full snapshot. Synthetic demo sources remain separate.
- The Documents page lists source-linked official report metadata and records four locally captured dataset releases with hashes and date coverage. Neither the dashboard nor API treats a metadata link, feedback field, or gap in observations as verified physical mitigation.
- The source explorer offers Esri natural-color satellite imagery, adjustable grayscale, OpenFreeMap street/dark styles, clustering, and flat/globe projections. Globe is the default where supported; software-only WebGL uses a reduced-cost flat map, and unavailable WebGL leaves the case review usable.
- The API returns case/source records, evaluates typed claims with a deterministic evidence-coverage baseline, returns citations and provenance, and stores immutable audit revisions.
- Local runs persist to an atomic JSON file under `data/state/`. Configured PostgreSQL/PostGIS runs apply migrations and seed the pinned casebook; first use of an otherwise-unseeded pinned source registers its minimal provenance row in the same audit transaction. Production refuses to start without `DATABASE_URL`.
- The audit bundle has a canonical SHA-256 digest. The receipt panel can record and verify a Sepolia registry transaction when an administrator configures the API. `bun run verify:audit <report.json>` verifies an exported bundle locally and checks an on-chain event when read-only RPC settings are present.
- The Verification Center can verify a downloaded v2/v3 audit JSON locally in the browser without uploading it. The check covers the canonical audit bundle and matching summary fields; export-wrapper context is outside that digest, and receipt metadata still needs the CLI/RPC verifier for on-chain event validation.
- A 15-claim baseline conformance set covers the three sources in the October 14 casebook revision and separate synthetic adversarial fixtures. It remains pinned to that revision: it is a small rule-behavior check, not a generalizable accuracy estimate or an AI benchmark.
- The auditor now supports uncurated source IDs from the server-pinned MARS snapshot. For these sources it cites at most one latest linked plume observation for the detection claim and binds the result to the dataset archive provenance. It does not turn plume notification metadata into proof of operator receipt or mitigation.
- The offline intelligence pipeline publishes a reproducible, hash-bound snapshot for all 4,218 sources and 23,861 explicitly linked observations in the pinned MARS release. It exposes historical priority and anomaly-screen results across the global map; both are uncalibrated investigation aids, never future probabilities or proof of mitigation.
- An optional server-side document assessment path validates exact excerpt quotations and binds full-snapshot reports to dataset/input/analysis hashes plus plume ID–timestamp pairs. A distinct authenticated reviewer can create a new immutable v3 revision; approval requires an explicit source-inspection attestation and at least one exact validated quotation. Assessment stays disabled until provider and reviewer configuration is supplied; no model accuracy is claimed.
- The v3 assessment applies a conservative second pass to strong model suggestions using only the server-validated quotations. It is the same configured provider, not independent validation, and can make two billable calls. Provider failure saves no assessment; an oversized provider response is rejected.
- A local PDF/TXT preparation tool creates a private, hashed excerpt manifest. The browser can verify and import the JSON without uploading the original file; the user must separately consent before provider transmission. PDF extraction uses local Poppler (`pdfinfo` and `pdftotext`) and does not perform OCR.
- PostgreSQL adds a durable anchor-intent table. An uncertain Sepolia write remains pending until an authorized operator verifies the exact transaction event and reconciles it; the API never retries an ambiguous send automatically. Scoped, expiring reviewer capabilities separate private report reading, review, and anchoring.
- An independent benchmark evaluator checks source-disjoint human labels, exact citation digests, abstention quality and false-supported results; it can compare an AI prediction file with deterministic-rules predictions on the same held-out claims. A guarded CLI can call a real model only with explicit billable-call approval, a per-run cap and per-row rights/source-review attestations. No independent labeled corpus or AI score is bundled or claimed.

## Evidence boundaries

- Detection observations support only a detection claim. MARS's source-level `notified` field is retained as metadata; by itself it does not identify whether the operator received a notice or when.
- Source-level feedback does not prove equipment repair or reduced emissions. A later observation gap is not proof of zero methane.
- Linked UNEP report items are link-only metadata. Their contents have not been included or independently reviewed, so all three real benchmark `mitigation_confirmed` assessments abstain with `insufficient_evidence`.
- A synthetic fixture may exercise a supported or contradicted rule, but its result is always marked synthetic.
- A blockchain receipt proves the committed bundle hash and version chronology; it does not prove physical methane mitigation.
- The pinned MARS casebook is a historical snapshot, not a live feed. Its specific attribution, archive hash and CC BY-NC-SA 4.0 terms are in [`data/real/README.md`](data/real/README.md). Interface image redistribution rights still need confirmation; see [`NOTICE`](NOTICE).

## Run locally

Requirements: Bun 1.4.2 (pinned in `.bun-version`), Python 3.11+ with `uv`, and Foundry for contract tests. Local PDF preparation additionally requires Poppler's `pdfinfo` and `pdftotext`; TXT preparation does not.

```bash
bun install --frozen-lockfile
# Copy only if apps/api/.env does not already exist.
cp .env.example apps/api/.env
```

Terminal 1:

```bash
bun run dev:api
```

Terminal 2:

```bash
bun run dev:web
```

Open <http://localhost:5173>. The API is at <http://localhost:3001>; the Vite development server proxies `/api` to it. If `DATABASE_URL` is unset, the API uses the local file store. The example `.env` uses paths relative to `apps/api/` and leaves optional database/chain settings unset.

For a guided tour of all six user-facing benefits and the exact prototype limits, see [`docs/user-workflow.md`](docs/user-workflow.md).

The API health route is <http://localhost:3001/api/health>. It checks casebook and store availability and identifies the actual storage backend. With a database, configure a PostgreSQL/PostGIS URL; the database user must be allowed to run the bundled migrations, including `CREATE EXTENSION postgis`.

## Main routes and commands

| Route / command | Purpose |
|---|---|
| `GET /api/cases` and `/api/cases/:id` | Read the pinned real casebook and provenance |
| `GET /api/sources` | Read the real casebook sources |
| `GET /api/sources?mode=demo` | Read explicitly synthetic fixtures |
| `POST /api/audits` | Evaluate one typed claim and persist a version |
| `GET /api/intelligence/insights?sourceId=...` | Read historical analysis for any source in the hash-bound pinned MARS snapshot |
| `POST /api/intelligence/assessments` | Optional, consent-gated server-side assessment; every excerpt must declare `owned` or `explicit_permission`, and the declaration is recorded in the report |
| `POST /api/audits/:id/review` | Create an authenticated, immutable human-review revision for a v3 draft |
| `GET /api/audits?sourceId=...&claimType=...` | Read audit history |
| `GET /api/audits/:id/verify` | Verify local digest and, if configured, the exact registry transaction; private v3 reports require a `private_read` capability |
| `POST /api/audits/:id/anchor` | Privileged write; v3 drafts require human review, plus configured server-side signer and explicit action |
| `POST /api/audits/:id/reconcile` | Reconcile a previously submitted/uncertain transaction only after exact Sepolia event verification |
| `bun run verify:audit report.json` | Independently check an exported local report and optional chain receipt |

Run the full local gates from the repository root after starting a disposable PostGIS database and setting `TEST_DATABASE_URL`:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/methane_test \
bun run check:all
```

The complete gate refuses to start when this variable is missing, rejects an exact match with `DATABASE_URL`, and forces API tests to run in CI mode, so database integration tests cannot be counted as passing when skipped. The integration suite applies migrations and seeds pinned casebook rows; never point it at production data. If PostGIS is unavailable, run the individual non-database checks and report the database gate as not run; do not label that a complete pass.

For a one-command run when Docker is available, use:

```bash
bun run check:all:postgis
```

This starts the same PostGIS image used by CI on a random localhost port, stores database files in a temporary container tmpfs, refuses to replace an existing `TEST_DATABASE_URL`, and removes the container after the gate succeeds, fails, or is interrupted. The first run may need to download the container image.

In restricted environments, set `TMPDIR` and `UV_CACHE_DIR` to writable locations if the default temporary mount/cache is unavailable. On Linux, for example: `TMPDIR=/dev/shm UV_CACHE_DIR=/dev/shm/methane-response-uv-cache bun run check:all:postgis`.

To write the reproducible benchmark report:

```bash
cd services/data-pipeline
uv run python evaluate_baseline.py --output reports/baseline-evaluation.json
```

Prepare a rights-cleared local excerpt (example):

```bash
python scripts/prepare_evidence.py /path/to/report.pdf \
  --source-id KAZ_S_159 --claim-type mitigation_confirmed \
  --document-id inspection-01 --title "Inspection report excerpt" \
  --source-url https://publisher.example/report.pdf \
  --rights-status explicit_permission --page 4 --output /tmp/evidence.json
```

The preparation command never calls a provider. Import the resulting JSON in the Evidence Auditor, verify the publisher and rights, then use the separate on-screen consent before any AI transmission.

To issue a short-lived reviewer token, configure `REVIEWER_AUTH_SECRET` only in the API environment, then run this locally and store its stdout as a credential:

```bash
REVIEWER_AUTH_SECRET="<server secret>" bun scripts/issue-reviewer-token.ts reviewer-01 private_read,review 3600
```

Do not paste the emitted token into tickets, source control, browser build variables, or shared logs. To anchor, issue an `anchor` scope separately; a `private_read` scope is only needed if the reviewer should retrieve private report contents.

For an independently adjudicated evaluation, see [`docs/ANCHOR_RECOVERY_AND_AI_GROUNDING_2026-10-13.md`](docs/ANCHOR_RECOVERY_AND_AI_GROUNDING_2026-10-13.md). The provider benchmark runner requires `--i-approve-billable-provider-calls=yes`, non-synthetic held-out claims, and a per-document rights review; it validates the recorded review but does not independently determine legal permission. Predictions are written only to an existing directory outside the repository (including through symlinks). Do not run it without cleared documents and an explicit budget.

Read [`docs/data-and-claims.md`](docs/data-and-claims.md) for methodology and [`docs/deployment.md`](docs/deployment.md) for deployment limits and setup.
See [`docs/AI_BLOCKCHAIN_IMPLEMENTATION_2026-10-12.md`](docs/AI_BLOCKCHAIN_IMPLEMENTATION_2026-10-12.md) and [`docs/ANCHOR_RECOVERY_AND_AI_GROUNDING_2026-10-13.md`](docs/ANCHOR_RECOVERY_AND_AI_GROUNDING_2026-10-13.md) for document-review, snapshot hashes, token scopes, outbox reconciliation, benchmark inputs, and remaining validation boundaries.

## Deployment and competition status

No external deployment, Sepolia transaction, video, Devpost registration, or submission has been performed. A possible no-cost setup is Cloudflare Pages for static files, a free Render web service for the API, and a free Neon Postgres project. It is not an always-on or durable free production service: Render free services can sleep and their local filesystem is ephemeral; Neon has per-project storage and compute quotas. Configure and test an owned account before treating it as available. See the dated provider notes in [`docs/deployment.md`](docs/deployment.md).

The public source release is commit `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d`. Anonymous `git ls-remote` with system/global Git configuration and credential helpers disabled returned this commit, and GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) completed successfully. This is a locally tested hackathon MVP, not a production monitoring authority. The event's published submission checklist asks for a public source-code repository and a 3–5 minute demo video. Image rights for old Git history, account setup, event eligibility and conflicting time instructions remain external work. See [`docs/research/event.md`](docs/research/event.md).

## Repository map

```text
apps/web                         React dashboard, MapLibre explorer and audit UI
apps/api                         Hono API, rules baseline, optional AI review, persistence and chain verifier
packages/shared                  Zod contracts and synthetic demo fixtures
services/data-pipeline           MARS importer, intelligence snapshot, training gate and baseline evaluation
data/real                        Attributed three-source audit casebook and snapshot history
data/processed/intelligence-snapshot.json
                                 Reproducible all-source investigation analysis
platform/database/migrations     PostgreSQL/PostGIS schema and audit revisions
contracts                        Solidity receipt registry and Foundry tests
scripts                          Local report verifier, evidence preparation, scoped-token and benchmark tools
docs                             Architecture, provenance, deployment and delivery status
```
