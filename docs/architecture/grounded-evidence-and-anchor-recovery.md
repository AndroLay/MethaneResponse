# Anchor recovery and grounded evidence workflow

> **Arsip desain anchor recovery.** Database adapter dan anchor-intent store yang dijelaskan di bawah tidak dipakai prototype saat ini. Gunakan [arsitektur aktif](overview.md) dan [referensi API](api-reference.md); jangan menjalankan petunjuk database lama sebagai setup lokal.

> **Superseded for database-backed anchoring:** this note documents the prior PostgreSQL anchor-intent implementation. That adapter and migrations were removed on 2026-10-15. The active local file store cannot reserve transactional anchor intents, so API anchoring and reconciliation are disabled. Exact citation validation, reviewer workflow, report digests, Solidity contracts, and local verification remain separate prototype capabilities. See the [current scope decision](decisions/2026-10-15-local-prototype-no-database.md).

This note documents implementation in the current repository. It is not proof of a remote deployment, a live blockchain transaction, scientific validation, or document rights.

## Durable chain anchoring

Migration `platform/database/migrations/0004_anchor_intents.sql` creates one persistent anchor intent per audit. A partial unique index permits only one unresolved write per case and claim across API replicas sharing that PostgreSQL database. The store checks that the current audit bundle has not changed and that an AI v3 report has a recorded human-review revision before reserving an intent.

The API checks signer configuration and the RPC-reported `eth_chainId` against Sepolia (`11155111`) before reservation, then writes the chain transaction. Receipt reads and verification repeat the chain-ID check before accessing registry state or transaction data. A successful, event-checked receipt and the audit's mutable receipt metadata are stored in one PostgreSQL transaction. A network error after the write attempt is treated as uncertain; the pending row is retained and there is no automatic resend or expiry.

An authorized `anchor` scope can submit known receipt fields to `POST /api/audits/{auditId}/reconcile`. The server reads the transaction and checks the Sepolia chain ID, configured registry, successful transaction, issuer, bundle hash, registry case key, event version, transaction hash and block number. Only that matching event can complete a reservation. The API does not submit a second transaction during reconciliation. Do not fabricate receipt fields or delete a pending row to force a retry.

The database lock coordinates only callers sharing this database and API. It cannot stop a separate wallet or a direct contract writer from anchoring outside this service. Receipt verification proves recorded digest and chronology, not physical repair or emissions reduction.

### Reviewer capabilities

Set a distinct API-only `REVIEWER_AUTH_SECRET` of at least 32 bytes. `scripts/issue-reviewer-token.ts` creates a signed, expiring capability with one or more scopes:

- `private_read` retrieves private v3 reports.
- `review` appends an authenticated human decision as a new revision.
- `anchor` permits chain write/reconciliation actions.

Tokens are bearer credentials. The CLI prints one to stdout, so run it in a private terminal, capture it only in an approved secret store, and never log it. The legacy shared reviewer token remains a local-development compatibility path; production disables it unless `ALLOW_LEGACY_SHARED_REVIEWER_TOKEN=true` is explicitly configured. Even with that compatibility flag, a legacy token can only retrieve private reports and submit review decisions. It cannot anchor or reconcile receipts; those actions require a separate scoped `anchor` token or the admin capability.

## Local evidence preparation and import

`scripts/prepare_evidence.py` supports UTF-8 `.txt` and selectable-text `.pdf` files. PDF extraction uses local Poppler commands (`pdfinfo`, `pdftotext`); OCR, network access, and provider calls are not used. It checks input size, page limits, source/claim identifiers, HTTPS source URL, explicit rights classification, selected-page count, and the API's 8,000-character excerpt bound. Text is never silently truncated. A private output file is created with mode `0600`; existing files are never overwritten. Link-only documents are rejected.

The resulting JSON includes the original-file SHA-256, a hash for each extracted selected page, an extracted-text hash, the user-declared rights status, and explicit false defaults for external-processing and publication consent. Those declarations are not independently authenticated.

The Evidence Auditor accepts only a prepared JSON file up to 256 KB. It verifies that the file is for the currently selected source and claim, recomputes the excerpt digest in the browser, checks page metadata, fills the excerpt locally, and resets both consent controls. Editing the title, URL, or excerpt clears the imported file provenance. The original PDF/TXT never leaves the user's browser; only the excerpt is sent to the model after the user explicitly opts in. A valid digest does not establish authenticity or scientific support.

## AI model assessment and evaluation

The server requires exact quotation matches against the supplied excerpt. Strong `supported` or `contradicted` results then receive a second pass from the **same configured provider**, which sees only the validated quotes and not the first verdict. Disagreement abstains to `insufficient_evidence`; provider errors create no audit. This is not an independent reviewer, model, or scientific measurement. It may cost up to two provider calls for a strong initial result.

`scripts/run-ai-benchmark.ts` can generate private held-out predictions. It requires a separate `--i-approve-billable-provider-calls=yes` flag, a maximum of 100 claims (default 8), `split: "test"`, `synthetic: false`, reviewer identity/date, source inspection, and `consentToExternalProcessing: true` for every row. Each row also needs a document-specific rights review listing every submitted document, a stable HTTPS source URL, a named license or private permission reference, and explicit scope approvals for excerpt processing, provider processing, private evaluation storage, quote storage, and metric publication. The runner hashes this review into the prediction row; the evaluator requires the adjudicated gold row to carry the same digest. It refuses to overwrite its private output, rejects destinations inside the repository even through symlinks, and requires the output directory to exist before running. Predictions contain cited quote text and must remain private. This digest provides a reproducible link to the private rights record; it does not authenticate a reviewer or prove the legal interpretation. The runner has not been executed against a live provider in this workspace.

`services/data-pipeline/evaluate_evidence_ai.py` checks human-adjudicated JSONL labels and model predictions. It rejects duplicate IDs, source or document overlap across train/dev/test, synthetic or unreviewed labels, incomplete held-out predictions, malformed citation digests, and any prediction whose rights-review digest differs from the adjudicated record. Each gold claim lists every `documentId` shown to the model; accepted gold citation hashes must refer to one of those documents. Default release gates require at least 40 held-out claims from 10 sources, all three labels, cleared rights, macro-F1 of at least 0.80, citation precision of at least 0.90, at least one correctly grounded supported claim, and zero false-supported claims. The report records the applied thresholds. It reports macro-F1/per-class metrics, false mitigation confirmations, citation precision, and an optional same-claim rules-baseline comparison. It also reports deterministic 95% percentile intervals using source-cluster resampling for macro-F1 and citation precision; when rules predictions are supplied, the same sampled sources produce a paired interval for the macro-F1 difference. The default is 400 replicates with seed `20261014`, both configurable for reproduction. Intervals describe sampling variation in the supplied held-out set; they do not authenticate labels or establish generalization to new publishers.

No independent human-labeled benchmark is currently included in the repository. Running the evaluator on no real labeled data cannot produce an accuracy claim; filling labels with MARS `feedback`, `notified`, a missing plume, or synthetic examples would violate the evidence policy.

The proposed source/document split and label definitions are recorded in [`AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`](../testing/ai-benchmark-annotation.md). It is an annotation method only; no licensed corpus or reviewer labels have been added.

Example commands, after preparing properly cleared inputs and real reviewer labels:

```bash
install -d -m 700 /tmp/methane-response-private
bun scripts/run-ai-benchmark.ts \
  --input=/tmp/methane-response-private/heldout-provider-input.jsonl \
  --output=/tmp/methane-response-private/ai-predictions.jsonl \
  --max-claims=8 \
  --i-approve-billable-provider-calls=yes

cd services/data-pipeline
uv run python evaluate_evidence_ai.py \
  --gold /tmp/methane-response-private/human-adjudicated-gold.jsonl \
  --predictions /tmp/methane-response-private/ai-predictions.jsonl \
  --baseline-predictions /tmp/methane-response-private/rules-baseline-predictions.jsonl \
  --bootstrap-replicates 400 \
  --bootstrap-seed 20261014 \
  --out /tmp/methane-response-private/evaluation-report.json
```

Gold rows require `claimId`, `sourceId`, `documentIds` (all document IDs supplied for that claim), `split`, `claimType`, `goldLabel`, `synthetic: false`, `review` (`reviewerId`, ISO `reviewedAt`, `sourceInspected: true`, `rightsStatus`, and `rightsReviewSha256`), and optionally `acceptedCitationHashes` entries with a document ID and SHA-256 of each reviewer-accepted exact quote. The evaluator hashes the supplied labels, but it cannot authenticate reviewer identity or source permission.

## Verification boundary

Local regression tests cover reviewer scopes, private report access, provider abstention and response bounds, evidence digest import, and mocked cross-replica anchor reservation/reconciliation. A PostgreSQL integration test checks persistent reservation across separate store connections, but it is skipped unless `TEST_DATABASE_URL` points to an explicitly designated test database. Local code does not verify migrations on a cloud database, Sepolia RPC availability, provider billing, human benchmark quality, low-end-device performance, or public deployment.
