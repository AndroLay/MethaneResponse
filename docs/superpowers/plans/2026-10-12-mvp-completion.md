# MethaneResponse MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally runnable, independently reviewable MethaneResponse MVP that audits its three attributed UNEP MARS cases, preserves audit revisions, and reports integrity receipts without claiming physical mitigation.

**Architecture:** Keep the selected Bun/Hono + React/Vite + Python pipeline + PostgreSQL/PostGIS + Solidity stack. Serve the tracked, licensed casebook as the deterministic demo dataset; use a local append-only file store for offline development and PostgreSQL for configured deployments; keep the rules baseline as the only decision authority until a larger human-reviewed benchmark justifies model assistance.

**Tech Stack:** Bun 1.4, TypeScript, Hono, Zod, React 19, Vite, TanStack Query, MapLibre, Python 3.11+/uv/pytest, PostgreSQL/PostGIS, Solidity/Foundry, viem.

**Spec:** `docs/history/next-steps.md`, `docs/architecture/overview.md`, `docs/research/methane-response-repository-design.md`, `docs/product/data-and-claims.md`, and the user-provided MethaneResponse IEEE ClimateChain 2026 blueprint.

## Global Constraints

- Treat source detection, source-level notification, feedback, and physical mitigation as distinct claims.
- Keep mitigation `insufficient_evidence` unless attributable report contents are legally usable and actually reviewed.
- Preserve the MARS casebook attribution, archive hash, CC BY-NC-SA 4.0 license, link-only external reports, and visible limitations.
- Keep synthetic fixtures clearly labeled and never imply the real casebook or MARS snapshot is a live feed.
- Blockchain receipts establish bundle integrity and chronology only; no private keys or secrets enter frontend files.
- Do not enable an LLM/model path before a reproducible rules benchmark; report sample limitations rather than inflating scores.
- Do not publish the private GitHub repository, deploy external services, submit to Devpost, or spend real funds as part of local implementation.

---

## File Structure and Ownership

- `packages/shared/src/index.ts`: shared casebook/evidence/audit contracts; keep synthetic fixtures explicit.
- `apps/api/src/app.ts`: versioned case, source, audit, and verification HTTP routes.
- `apps/api/src/audit.ts`: deterministic evidence mapping, assessment, and canonical bundle digest.
- `apps/api/src/store.ts`: store interface plus file and in-memory implementations.
- `apps/api/src/postgres-store.ts`: PostgreSQL repository and casebook seed path.
- `apps/api/src/chain.ts`: exact transaction/event verification and receipt history metadata.
- `apps/api/src/*.test.ts`: route, persistence, baseline, tamper and authorization regressions.
- `apps/web/src/App.tsx`, `apps/web/src/mars.ts`, `apps/web/src/styles.css`: real casebook workflow, provenance, claim audit, and clear fallback labels.
- `platform/database/migrations/`: applicable schema changes, nullable unlinked plume source, immutable audit revisions, provenance and chain metadata.
- `services/data-pipeline/`: compact reviewed claim set and reproducible baseline evaluator.
- `contracts/src/EvidenceRegistry.sol`, `contracts/test/EvidenceRegistry.t.sol`: append-only revision commitments and access-control checks.
- `AGENTS.md`, `README.md`, `docs/history/next-steps.md`, `docs/release/deployment.md`, `docs/product/data-and-claims.md`, `docs/release/event-requirements.md`: truthful state, reproducible operations, attribution and blockers.
- `.github/workflows/ci.yml`, `LICENSE`, `NOTICE`: repeatable checks and license/attribution review artifacts.

## Milestones

### Task 1: Reconcile data boundaries and establish the claim contract

**Files:** `AGENTS.md`, `packages/shared/src/index.ts`, `apps/api/src/audit.ts`, `apps/api/src/audit.test.ts`, `docs/product/data-and-claims.md`.

- [x] Correct the broad synthetic-data rule while retaining DEMO fixture warnings.
- [x] Define typed casebook metadata, MARS plume observations, source notification evidence, and link-only external report references.
- [x] Map MARS detection rows to detection citations and source-level `notified` to notification evidence; do not map feedback or report title metadata to mitigation confirmation.
- [x] Add unit tests for all three labels, conflicting evidence, real detection/notified cases, and mitigation abstention.
- [x] Run the focused audit suite and the full root quality gate.

### Task 2: Connect the attributed casebook and audit API

**Files:** `apps/api/src/app.ts`, `apps/api/src/casebook.ts`, `apps/api/src/app.test.ts`, `apps/api/package.json` only if a new runtime dependency is needed.

- [x] Load and validate `data/real/mars_casebook_2026-10-11.json` from a path that works in local Bun and the configured Render root directory.
- [x] Add `GET /api/cases`, `GET /api/cases/:id`, and real source lookup without merging real and synthetic records.
- [x] Allow audit requests only against a selected curated case or explicitly synthetic fixture; include cited evidence and provenance in the result bundle.
- [x] Keep unknown cases, malformed input, missing casebook, and unsupported claim language explicit in HTTP responses.
- [x] Add route tests for all three MARS sources, observation citations, notification status, and mitigation abstention.

### Task 3: Persist audit versions and correct the database schema

**Files:** `apps/api/src/store.ts`, `apps/api/src/postgres-store.ts`, `apps/api/src/app.ts`, `apps/api/src/store.test.ts`, `platform/database/migrations/0001_init.sql`, `platform/database/migrations/0002_audit_revisions.sql`, `.env.example`, `render.yaml`.

- [x] Store every audit as an immutable version keyed by case/claim and revision; provide lookup by audit ID and latest version.
- [x] Use atomic append/write storage for offline local runs and require `DATABASE_URL` for production runtime; expose the actual backend and readiness in `/api/health`.
- [x] Implement PostgreSQL storage with parameterized queries, casebook provenance seed/upsert, and startup migration application.
- [x] Make `observations.source_id` nullable so unlinked MARS plumes can be retained, and add explicit source notification, provenance and audit-revision fields.
- [x] Add restart/reopen, revision ordering, tamper detection, migration-shape, and production-storage tests. A fresh disposable PostGIS 17 integration run passed 2 tests / 8 expectations on 2026-10-12; it used a new temporary credential and removed its container afterward. The root quality gate still skips optional database tests unless `TEST_DATABASE_URL` is set.

### Task 4: Make the real casebook the default review journey

**Files:** `apps/web/src/App.tsx`, `apps/web/src/mars.ts`, `apps/web/src/styles.css`, `apps/web/src/mars.test.ts`, `apps/web/src/audit-flow.test.ts`, `apps/web/src/LandingPage.tsx`.

- [x] Load real casebook cases through the API by default; retain a deliberate, visibly synthetic demo switch and local full-snapshot import.
- [x] Show official source IDs, country/sector, dated plume values and uncertainty, notified/feedback as source-level fields, provenance, license, case report links, and rights status.
- [x] Enable deterministic audit for the selected real case; show evidence citations, `insufficient_evidence` for mitigation, and no invented report preview text.
- [x] Keep map render modes and synthetic dashboard illustrations clear; remove misleading “AI”/live claims where no model or live source exists.
- [x] Cover real-to-demo switching, case selection, audit output, citations, mobile layout, and API/chunk error fallbacks with API/unit tests and a documented browser acceptance sequence.

### Task 5: Evaluate the rules baseline and preserve chain-verifiable versions

**Files:** `services/data-pipeline/data/mars_claim_benchmark.jsonl`, `services/data-pipeline/evaluate_baseline.py`, `services/data-pipeline/tests/test_evaluate_baseline.py`, `apps/api/src/chain.ts`, `apps/api/src/app.ts`, `apps/api/src/chain.test.ts`, `contracts/src/EvidenceRegistry.sol`, `contracts/test/EvidenceRegistry.t.sol`, `contracts/script/`.

- [x] Add a compact casebook policy-conformance benchmark with explicit expected labels and source IDs; compute per-class metrics, citation coverage, and false mitigation confirmations, and state that three sources are not a generalizable benchmark. It is not a human-adjudicated AI benchmark.
- [x] Keep all real mitigation labels at `insufficient_evidence` because linked report content is not bundled/reviewed; keep synthetic adversarial fixtures in a separately identified subset.
- [x] Hash stable canonical JSON and export a receipt manifest containing audit ID, source/case, revision, digest, chain ID, registry, issuer, version, block and transaction when available.
- [x] Verify a stored transaction/event against its exact bundle hash and receipt metadata; preserve historical version checks. Pure event/receipt matching has unit coverage; no Sepolia transaction is available for live verification.
- [x] Add contract tests for issuer access, revision chronology, distinct case IDs, and event metadata; document Sepolia as unconfigured until real RPC/signer/contract configuration exists.

### Task 6: Add complete local quality gates and honest delivery status

**Files:** `package.json`, `.github/workflows/ci.yml`, `LICENSE`, `NOTICE`, `README.md`, `docs/history/next-steps.md`, `docs/history/delivery-notes.md`, `docs/development/ui-implementation.md`, `docs/release/deployment.md`, `docs/release/event-requirements.md`, `render.yaml`.

- [x] Provide root commands for frozen install, API/web checks, Python tests/evaluation, contract tests and production build; run the full local gates.
- [x] Add CI for Bun, Python and Foundry using pinned or bounded versions; record any unavailable tool or service and its exact failed boundary.
- [x] Separate the original-code license from the MARS ShareAlike data and unverified UI artwork licenses; use NOTICE for attribution and redistributable-content limits.
- [x] Reconcile status docs with implementation, free-tier caveats, API startup/persistence, public repo/video requirements, and current official event conflicts.
- [x] Leave repo privacy unchanged and record deployment, Sepolia transaction, video, Devpost registration/submission, eligibility, and deadline as external blockers.

## Execution Choice

Execute inline in this session, as authorized by the user's request to complete all milestones, record blockers, and continue through each available stage. Reassess scope only if repo evidence materially changes the assumptions above.
