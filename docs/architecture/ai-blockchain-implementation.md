# Intelligence, document review, and audit receipt integration

> Earlier design snapshot. The active P2 write/recovery path is described in the [runbook](../development/blockchain-recovery.md); a local Anvil transaction is not evidence of a public Sepolia transaction.

> **Design archive from 12 October 2026.** Data counts, reviewer mechanisms, and service assumptions below are tied to the original revision. Current guides: [architecture](overview.md), [data flow](data-flow.md), [trust](../product/trust-and-transparency.md), and [active status](../release/current-implementation-status.md).

**Status as of 2026-10-12:** implementation is in the active repository and locally testable. No external AI provider, public deployment, PostgreSQL service, Sepolia transaction, or physical mobile device has been verified from this workspace.

> **Historical note:** this document predates the 2026-10-15 decision to remove database implementation. Its Postgres integration-test references describe earlier source revisions. The active API uses local JSON audit persistence; database setup is no longer part of this prototype. See the [current scope decision](decisions/2026-10-15-local-prototype-no-database.md).

## What is implemented

### MARS source integrity

- The pinned casebook keeps its source archive SHA-256, retrieval time, license, source IDs, plume IDs, observation timestamps, coordinates, flux units and uncertainty values.
- Source-level `notified` remains visible as metadata. It does not establish which recipient was notified or when and cannot support the specific `operator_notified` claim by itself.
- Source feedback is not treated as proof of a repair. Missing future plume records are not converted into zero emissions.
- New document assessments first resolve source IDs against the validated full MARS snapshot; synthetic and unlisted IDs are rejected. The older three-source casebook remains a fallback when the full snapshot is unavailable. New reports record the selected dataset snapshot and hashes, plus each original plume ID paired with its source timestamp. Curated report links are kept only when their detection plume IDs are present in the active source history.

### Reproducible investigation intelligence

`services/data-pipeline/build_intelligence.py` creates `data/processed/intelligence-snapshot.json` from the full pinned, compressed browser MARS snapshot. It joins only explicitly linked source IDs and covers all 4,211 source rows and 23,785 linked plume observations in release `unep-mars-e0721015e925`. Its output is deterministic for unchanged gzip bytes, stores the exact input digest and upstream archive digest, and preserves each source's plume IDs and observation timestamps.

The current ranking uses distinct observation dates and, when available, the median reported flux. It also exposes median reported uncertainty, missing-flux counts, MARS persistency and emission-status fields, plus the component values behind its score. A missing flux has a null magnitude component; it is not a measured zero. MARS indicators are retained as context, not used as confirmation of mitigation.

The API verifies the snapshot's input hash against the full pinned browser bundle before serving analysis for a source ID in that dataset; unknown IDs are rejected. Repeated requests reuse a stat-validated in-process snapshot, and concurrent cold reads share one validation task. A stale or invalid snapshot produces an unavailable response instead of stale rankings. Scores and anomaly flags are uncalibrated investigation aids, not probabilities or confirmed leaks. No trained forecast is served. `train_redetection.py` remains a research gate and requires adequate observation-opportunity labels, a source-disjoint/time-purged holdout, and performance above a base-rate baseline.

### Optional document-grounded assessment

When configured, `POST /api/intelligence/assessments` accepts a bounded user-authorized excerpt only after an explicit consent field and a server-issued `AI_REVIEW_TOKEN`. The model runs on the API server. The API validates each proposed citation as an exact substring of the submitted excerpt and abstains if any citation is ungrounded or absent.

For a full-snapshot assessment, the saved v3 bundle includes the quoted passages, quote and document digests, submitted source URL when provided, model and prompt version, MARS archive provenance, dataset snapshot ID and input SHA-256, analysis snapshot SHA-256, investigation score, and the historical observation IDs paired with original timestamps. A curated fallback keeps its own pinned archive provenance and plume timeline. Neither path retains the full submitted excerpt. Exact text still appears in the report when quoted, so do not submit sensitive or unauthorized material. A digest or URL does not authenticate the publisher or the document.

This path has not been evaluated with an external AI provider or an independent human-labeled document corpus. The existing baseline set is a small policy-conformance check, not an AI benchmark. No AI accuracy, citation-precision, or false-confirmation rate is claimed.

### Human review, revisions, and blockchain compatibility

- A reviewer decision uses a distinct server-configured `HUMAN_REVIEW_TOKEN` and fixed `HUMAN_REVIEWER_ID`. The browser accepts the token only in ephemeral component state; it is not placed in a `VITE_*` variable or browser storage. Private history and detail reads require this reviewer token; the assessor token cannot read private drafts.
- The review API accepts one of three distinct dispositions: approve the assessment, reject it, or request more evidence. Approval requires the reviewer to attest that they inspected the original source and requires at least one exact quotation validated against the submitted excerpt. Since full excerpts are deliberately not retained, this attestation cannot be independently proven by the application. The API derives reviewer identity from server configuration and creates a new immutable v3 audit revision linked to the draft's bundle hash. A request for more evidence forces `insufficient_evidence` until a later report revision incorporates more material; prior drafts remain queryable.
- The shared token is a small-prototype access control, not individual identity proof, SSO, or a multi-tenant role system. Public deployment requires stronger identity, abuse controls, and a privacy/data-retention review.
- JSON request bodies for audit creation, document assessment, and human review are size-limited while reading the request stream; oversized input is cancelled before JSON parsing. `POST /api/audits` has a process-local limit of 20 writes per minute; AI document assessments have a process-local limit of 6 per minute keyed by server-supplied client address and a one-way token fingerprint. Limits reset on restart, do not coordinate across replicas, and the actual reverse-proxy client address is unverified; a shared gateway limit is still required before public exposure.
- V2 audit and historical receipt formats remain supported. The canonical SHA-256 covers the v3 bundle; the current `EvidenceRegistry` contract and event format are unchanged.
- An unreviewed v3 draft cannot be anchored. The reviewer may explicitly request anchoring for a reviewed v3 revision when a chain is configured; the UI warns that this submits a Sepolia transaction and can spend test ETH. The admin path still supports historical v2 flows. No transaction has been sent here.
- JSON audit exports include an outer canonical SHA-256 checksum over the exported context. If the currently loaded source or dataset snapshot does not match the saved audit, current observations are omitted. This checksum detects accidental edits but is not a signature and is not a blockchain receipt.
- A chain receipt verifies the published digest, issuer, and version chronology. It does not prove the document is authentic or that methane equipment was physically repaired.

### Independent exported-report check

The Verification Center accepts a downloaded JSON audit and checks it locally in the browser. It supports raw v2/v3 audit results and the current export envelope with `latestAudit`; the file is size-limited to 5 MiB and is not uploaded. The verifier recomputes canonical SHA-256 for the audit bundle and checks that the summary fields in the selected audit match that bundle. A wrapped export's surrounding fields—such as its copied source dataset metadata and displayed observations—are not covered by the audit bundle hash and are identified as outside that digest.

Receipt fields are assessed separately. Matching transaction-hash metadata is not an on-chain verification: this browser control does not query Sepolia. Use `bun run verify:audit <report.json>` with read-only RPC and registry settings to verify the event independently. Synthetic reports are explicitly labeled DEMO in the result.

## Server configuration

Copy `.env.example` to `apps/api/.env` and set provider credentials only in the API process. Keep all secrets distinct:

```text
AI_BASE_URL=https://trusted-provider.example/v1
AI_MODEL=reviewed-model-name
AI_API_KEY=<provider secret>
AI_REVIEW_TOKEN=<random secret with at least 32 characters>
HUMAN_REVIEW_TOKEN=<different random secret with at least 32 characters>
HUMAN_REVIEWER_ID=authorized-reviewer-01
```

Never put `AI_API_KEY`, reviewer/admin tokens, RPC credentials, or signer keys in the web environment. Use HTTPS for any deployed browser-to-API flow. The current server sends excerpts to the configured provider only after user consent; providers can have their own retention policies that must be reviewed separately.

## Local reproduction

From the repository root:

```bash
./services/data-pipeline/.venv/bin/python services/data-pipeline/build_intelligence.py
bun run check
bun run test:api
bun run test:web
bun run test:verifier
bun run build:web
```

From `services/data-pipeline/`:

```bash
./.venv/bin/pytest -q
./.venv/bin/python evaluate_baseline.py --output /tmp/methane-baseline-evaluation.json
```

The Postgres integration-test suite described in the earlier implementation was removed from active gates on 2026-10-15; current API persistence uses a local JSON file. Foundry checks use `cd contracts && forge test`. The local report-file verifier has focused v2/v3, tamper, envelope-mismatch, malformed-input, and receipt-metadata tests. A production-build browser check accepted a valid synthetic DEMO report and rejected a modified export; a 390px viewport had no horizontal overflow. This is UI smoke evidence, not on-chain verification or stakeholder acceptance.

## Remaining evidence and prerequisites

1. Add an independently labeled set of real, licensed document claims before reporting model performance. Include supporting, contradictory and insufficient cases, source-disjoint evaluation, exact-citation review, and a specific unsafe mitigation-confirmation check.
2. Configure and test a trusted AI provider, including provider retention and timeout behavior, before enabling public use.
3. Replace the prototype shared reviewer token with per-person authentication and authorization before public deployment.
4. The local suite and Chromium smoke passed. A later 1440×1000 Chromium screenshot verified the satellite-textured globe on software WebGL at its low-power tier. On 2026-10-13, after fixing static-host gzip decoding, a production-build browser run verified the pinned September geometry shard and rendered its 326 publisher geometries at Quality tier; the 390px Eco view showed the documented polygon fallback without horizontal overflow. Inspect terrain and performance on accelerated hardware and physical Android/iOS devices before making mobile-performance claims.
5. If blockchain anchoring is needed, use an authorized funded Sepolia issuer and independently verify a human-reviewed report receipt. This code integration does not deploy a contract or send a transaction.
6. Configure Postgres and public hosting only after checking persistence, CORS, cold starts, free-tier limits, rate controls, and recovery behavior on the owner's actual services.
