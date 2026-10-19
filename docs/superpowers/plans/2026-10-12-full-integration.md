# MethaneResponse Full Integration Implementation Plan

> **Arsip rencana 2026-10-12.** Pekerjaan dan instruksi di bawah merekam revisi asal. Untuk kondisi sekarang gunakan [status aktif](../../release/current-implementation-status.md) dan [arsitektur](../../architecture/overview.md); asumsi database digantikan [ADR file lokal](../../architecture/decisions/2026-10-15-local-prototype-no-database.md). [Indeks rencana](README.md).

> **For agentic workers:** The user explicitly authorized end-to-end implementation in the active repository. Execute the tasks in order; keep the existing dirty changes intact.

**Goal:** Integrate grounded document review, version-bound observational intelligence, conservative MARS semantics, reviewed audit revisions, and a clearer adaptive MapLibre Earth experience into the existing MVP.

**Architecture:** Extend shared Zod contracts additively so v2 audits remain readable and v3 intelligence assessments can be hashed, reviewed, persisted, and verified. Generate intelligence offline from the complete pinned MARS source/plume snapshot using only explicit source-ID links, verify its input hash at API read time, and keep AI provider calls server-side and opt-in. Merge Earth improvements into the current dirty MapPanel implementation rather than replacing it with the reference ZIP.

**Tech Stack:** React 19, Vite, TypeScript, MapLibre GL JS, Bun, Hono, Zod, PostgreSQL/PostGIS, Python/uv, Solidity/Foundry, viem.

**Spec:** User request in the conversation, “MethaneResponse — Full Integration & Advanced Development”; reference ZIP `/home/andro/Downloads/MethaneResponse_AI_Blockchain_Earth_Upgrade_2026-10-12(1).zip`.

## Global Constraints

- Preserve the current repository, all pre-existing dirty files, and v2 audit/receipt compatibility.
- Keep MARS source metadata distinct from operator notification, feedback, mitigation, and missing observations.
- Never label the heuristic priority as a probability or physical outcome.
- AI excerpts require explicit external-processing consent, exact quote validation, and human review before anchoring.
- Never expose AI, database, admin, RPC, or signer secrets to the frontend.
- Do not deploy a contract or initiate a transaction during development.
- Keep current MapLibre and retain a safe fallback for unavailable WebGL or external tiles.

---

### Task 1: Correct notification semantics and evidence provenance

**Files:** `packages/shared/src/index.ts`, `apps/api/src/casebook.ts`, `apps/api/src/audit.ts`, `apps/api/src/audit.test.ts`, `apps/web/src/App.tsx`, data pipeline tests.

- [x] Add a distinct `metadata_notification` evidence kind and ensure MARS source flags do not satisfy `operator_notified`.
- [x] Keep original MARS flags, plume IDs, timestamps, coordinates, flux units, uncertainties, and archive provenance unchanged.
- [x] Rename the dashboard response metric to describe metadata completeness, not mitigation.
- [x] Add tests proving real source notification flags remain visible but cannot support operator-specific notification or mitigation claims.

### Task 2: Integrate reproducible observational intelligence

**Files:** `services/data-pipeline/build_intelligence.py`, `services/data-pipeline/train_redetection.py`, `services/data-pipeline/tests/`, `apps/api/src/intelligence-data.ts`, `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `data/processed/intelligence-snapshot.json`.

- [x] Generate a deterministic, dataset-hash-bound source ranking and document every heuristic input.
- [x] Reject stale snapshots when their recorded input digest does not match the pinned casebook or configured input file.
- [x] Preserve missing flux as unavailable and never use it as a zero-emission observation.
- [x] Keep supervised redetection training research-only and refuse insufficient or leakage-prone labels.

### Task 3: Add grounded AI assessments and authenticated review revisions

**Files:** `apps/api/src/ai-review.ts`, `apps/api/src/ai-review.test.ts`, `apps/api/src/app.ts`, shared audit schemas, stores, `apps/web/src/IntelligencePanel.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`.

- [x] Accept only bounded, user-authorized excerpts with explicit external-processing consent.
- [x] Validate exact quotations deterministically and abstain if any cited quotation is absent from its supplied excerpt.
- [x] Persist digests and selected quotes, not full submitted documents.
- [x] Record human adjudication as a new immutable v3 audit revision linked to its parent bundle hash.
- [x] Expose reviewer and optional AI credentials as session-only inputs; require review before AI report anchoring.

### Task 4: Preserve v2 blockchain receipts and verify v3 revisions

**Files:** `apps/api/src/chain.ts`, `apps/api/src/integrity.ts`, canonical/audit/store tests, verifier scripts. No migration was needed: the existing PostgreSQL store persists versioned audit bundles as JSONB without a version-specific column layout.

- [x] Keep contract ABI and receipt version semantics unchanged; hash the full canonical v3 bundle.
- [x] Verify tampering, parent/revision chronology, and old v2 receipts locally.
- [x] Test the anchoring gate for unreviewed model drafts. No contract was deployed and no transaction was sent.

### Task 5: Improve adaptive Earth rendering without replacing MapLibre

**Files:** `apps/web/src/earth-rendering.ts`, Earth rendering tests, `apps/web/src/MapPanel.tsx`, `apps/web/src/App.tsx`, `apps/web/src/styles.css`, `docs/architecture/earth-rendering.md`.

- [x] Use a restrained dark-space/horizon palette and stable viewport-relative hillshade so camera movement does not move the apparent sun.
- [x] Add natural/cinematic looks, gentle night overlay, null-flux marker styling, and conservative automatic quality downgrade.
- [x] Default to a globe on supported hardware and fall back to flat when the renderer rejects it.
- [x] Keep terrain zoom-gated, cap pixel ratio, and check desktop/mobile layout and console errors in Chromium. This run used software WebGL and therefore verified the flat fallback, not GPU globe or terrain quality.

### Task 6: Stabilize, verify, and document boundaries

**Files:** relevant docs and tests across API, UI, Python pipeline, migrations, and contracts.

- [x] Run frozen Bun install, TypeScript checks, API/web/verifier tests, web build, Python tests, and Foundry tests. A fresh temporary PostGIS 17 container also ran the API persistence and migration tests; the routine root gate still skips them when `TEST_DATABASE_URL` is absent.
- [x] Run a browser smoke for the real casebook, intelligence/AI states, map fallback, and 390×844 layout. This did not verify a hardware-accelerated globe, terrain tiles, or live AI interaction.
- [x] Report local results separately from external-provider, PostGIS, Sepolia, license, and physical-device validation.

## Completion evidence — 2026-10-12

- Local checks: `bun install --frozen-lockfile`, `bun run check`, the API suite (47 passed against temporary PostGIS 17; routine no-database run 43 passed), `bun run test:web` (36), verifier tests (2, including v3 human-review export tampering), Python tests (25), and `forge test -q` passed. The production bundle still reports a 1.10 MB MapPanel chunk warning.
- Browser: desktop map, archive timeline, 390×844 responsive layout, and a mocked document-review/request-more-evidence flow were inspected. Mobile `document.documentElement.scrollWidth` was 390 px and the review flow produced `insufficient_evidence` after requesting more evidence. Mock responses did not call an external model or persist a report. The software renderer correctly used the low-power tier; accelerated globe lighting and terrain quality still need a physical-device check.
- Baseline: 15 claims (9 real casebook, 6 synthetic fixtures), macro-F1 1.00 combined and 0.6667 on real-only claims, with no real contradiction examples. Zero false mitigation confirmations in this small policy-conformance set. It is not an independent model benchmark.
- External validation not performed: AI provider and credentials, remote PostgreSQL/PostGIS, deployment, Sepolia RPC/issuer/transaction, licensed source-document corpus, shared public API abuse controls, and Android/iOS devices.

## Continuation — 2026-10-12

- Added a distinct authenticated `needs_more_evidence` reviewer disposition. It creates an immutable v3 revision, forces `insufficient_evidence`, retains the draft revision, and is covered by API, bundle-integrity, and browser-mock checks.
- Added additive migration `0003_evidence_kind_extensions.sql` to align the PostgreSQL evidence-kind constraint with the shared schema. Fresh PostGIS migration, MARS seeding, and both newer evidence kinds pass integration coverage.

## Follow-up — 2026-10-12 globe renderer

The subsequent renderer update removed the forced-flat policy for software WebGL. A new 1440×1000 SwiftShader screenshot shows the globe rendered at the low-power tier (`/tmp/methaneresponse-globe-after.png`). The earlier fallback notes above describe the browser behavior at the time of the original plan checks; accelerated-GPU and physical-device performance remain unverified.

## Follow-up — 2026-10-13 review and end-to-end verification

- [x] Restrict private audit history/detail reads to the human-review token; the AI assessment token cannot read private drafts.
- [x] Require an explicit source-inspection attestation and at least one exact validated quotation before approval. Record the attestation in the immutable, hashed reviewer revision. Full source excerpts remain intentionally unretained, so the attestation is not independently proven by the app.
- [x] Bind report wrapper metadata to a canonical SHA-256 checksum. Omit loaded observations when the audit's source or dataset snapshot differs, and reject changed wrapper values in the browser verifier.
- [x] Verify static map snapshot bytes against a deterministic manifest of gzip and decoded hashes, then bind exported observations to the input hash recorded in the audit. Mismatched content or an imported unmanifested snapshot omits current observations.
- [x] Run loopback-only Chromium UAT from the pinned 4,211-source map through a fixed-response abstaining model mock, human `needs_more_evidence` review, revision 8 report export, browser and CLI verification, and a fresh-process local file-store reopen. 24 Esri imagery tiles returned successfully; page and console errors were zero.
- [x] Rerun frozen Bun install, TypeScript, API/web/verifier tests, Python, Foundry, and Vite build. Routine PostgreSQL tests remain skipped because the current run has no `TEST_DATABASE_URL`.

The test excerpt/provider response were synthetic local fixtures. No external provider was called, no original mitigation document was reviewed, no PostGIS service was connected in this run, and no blockchain transaction was sent. See `docs/history/delivery-notes.md` for detailed results and artifacts.


## Follow-up — 2026-10-13 mobile map overlay layout

- The historical reported-flux layer is now the initial map layer, so the first view shows observed values and their kg/h legend rather than only source locations. The interface continues to mark the archive as historical and the feed as not live.
- A 390×844 Chromium screenshot exposed collisions between the legend, monthly archive timeline, and MapLibre controls. On narrow screens the archive timeline reserves the zoom-control corner, the scale bar is hidden, and the legend can be keyboard-focused and vertically scrolled. Desktop controls and layer semantics are unchanged.
- After rebuilding and serving the source through Vite with a loopback API, the mobile layout regression measured no intersecting legend/timeline/zoom rectangles, document width 390 px, one rendered MapLibre canvas, and zero page, console, or API errors. Screenshot: `/tmp/mr/methaneresponse-mobile-flux-map.png`.
- This uses Chromium software WebGL at the low-power tier. It does not establish accelerated GPU quality, physical-device performance, a live data feed, or forecast accuracy.
