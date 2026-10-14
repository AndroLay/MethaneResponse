# MethaneResponse AI benchmark annotation protocol

- **Status:** Protocol and a local pre-adjudication agreement checker are ready; no benchmark corpus or model result is included.
- **Purpose:** Produce a rights-aware, source-grounded, reproducible evaluation set for document-based methane claim assessment.
- **Scope:** This protocol evaluates whether submitted documents support a precisely worded claim. It does not establish physical methane conditions or mitigation outcomes by itself.

## 1. Evidence and rights rules

1. Record the document publisher, stable title, publication date, source URL, access date, source ID(s), and the rights basis for inspection, excerpt processing, provider submission, private benchmark storage, quote retention, and metrics publication separately.
2. Do not copy complete third-party reports into the repository. Store excerpts and source files only in an access-controlled location when the license or written permission allows it. Otherwise store permitted metadata, page/section references, and digests only.
3. Set `rightsStatus` to `cleared` only when the exact proposed processing and evaluation use is allowed. `link_only` and `unverified` remain non-release statuses. The provider runner requires a per-document reviewer record covering excerpt processing, provider processing, private evaluation storage, quote storage, and metrics publication. A license string or Boolean alone does not clear a document.
4. Keep synthetic examples out of the independent gold set. Every gold claim must have `synthetic: false` and human inspection of its original source.
5. Keep reviewer identities opaque in reports; retain any participant identity or adjudication correspondence outside the public benchmark.

UNEP MARS plume records represent dated satellite-overpass observations. A source-level notification field or feedback entry must not be silently relabeled as proof that an operator received notice, repaired equipment, or reduced emissions. Follow the [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes) and repository [`AGENTS.md`](../AGENTS.md) when defining a claim.

## 2. Claim unit and labels

Each claim must identify one source, one claim type, and a bounded time or event. Avoid broad text such as “the facility is clean.” Use the same claim wording and document inputs for the model and rules baseline.

| `claimType` | `supported` requires | `contradicted` requires | Use `insufficient_evidence` when |
|---|---|---|---|
| `source_detected` | A traceable source record or document explicitly associates the dated observation with that source. Preserve the original source/plume ID and timestamp. | An authoritative, source-specific correction or retraction explicitly negates that detection record. | The document is ambiguous, lacks source/date linkage, or simply omits a later detection. |
| `operator_notified` | Evidence explicitly identifies the operator and source and documents that the notification was delivered/received for the stated event. | Evidence explicitly shows that the stated notification was not delivered, was recalled, or was attributed to a different source. | A MARS status field has unclear semantics, feedback is present without delivery evidence, or the record only says a notice was prepared/sent without establishing the exact claim. |
| `mitigation_confirmed` | Source- and time-specific evidence documents the action and a relevant post-action outcome using a method capable of assessing the stated mitigation claim. Record the method, date, uncertainty, and limitations. | Evidence explicitly negates the bounded outcome claim, such as a reliable contemporaneous finding that the specified repair was not completed. | There is only an operator assertion, administrative response, repair intent, a missing follow-up measurement, or a later plume that does not directly negate the precise claim. |

`insufficient_evidence` is the correct label for missing, indirect, low-quality, or inconclusive evidence. Missing observations are never labeled zero emissions. A later plume can indicate recurrence without proving that a previously reported repair never occurred; label the exact claim and period.

## 3. Independent review and adjudication

1. Freeze claim wording and document inputs before model inference. Assign splits before running the model.
2. Two reviewers independently inspect the original source and label the claim. Each records the exact page/section, relevant excerpt, rationale, and rights status.
3. A third reviewer resolves disagreements without seeing model predictions. Preserve both initial labels and the adjudication outcome in a private review log.
4. A gold citation is an exact UTF-8 quotation accepted as relevant to the claim. For an `insufficient_evidence` claim, a quote may be relevant yet inconclusive; its inclusion does not imply support. Hash the exact quoted text without changing punctuation or whitespace.
5. Reviewers must distinguish a citation's textual relevance from document authenticity, completeness, scientific validity, and proof of physical outcome.

The current evaluator stores the final adjudicating reviewer ID and `sourceInspected` attestation. The separate double-review and disagreement log must be retained securely. `services/data-pipeline/annotator_agreement.py` compares two minimized reviewer JSONL files before adjudication; it cannot authenticate reviewer identity or prove that two people reviewed the source.

## 4. Split and JSONL contract

Use source- and document-disjoint `train`, `dev`, and `test` partitions. A source ID or document ID may occur in only one partition. If a report covers multiple sources, all claims that use it stay in one partition. Do not tune prompts against the held-out test set.

Each gold JSONL row conforms to `services/data-pipeline/evaluate_evidence_ai.py`. The rights digest below is a placeholder and must be replaced by the runner-generated digest before evaluation:

```json
{
  "claimId": "claim-unique-id",
  "sourceId": "MARS_SOURCE_ID",
  "documentIds": ["doc-stable-id"],
  "split": "test",
  "claimType": "mitigation_confirmed",
  "goldLabel": "insufficient_evidence",
  "synthetic": false,
  "review": {
    "reviewerId": "adjudicator-opaque-id",
    "reviewedAt": "2026-10-14",
    "sourceInspected": true,
    "rightsStatus": "cleared",
    "rightsReviewSha256": "replace-with-runner-generated-digest"
  },
  "acceptedCitationHashes": []
}
```

`documentIds` lists every document excerpt shown to the model for that claim, including documents that ultimately provide no accepted citation. Any `acceptedCitationHashes[].documentId` must be in that list. Keep document text out of the gold JSONL; pass only rights-cleared inputs to the separately guarded benchmark runner.

The runner input row also contains `rightsReview`, with the same reviewer ID/date as `review` and one rights entry for every submitted document. Each entry records `documentId`, an HTTPS `documentUrl`, a named `rightsBasis` (license URL or private permission reference), and all five required scopes as `true`: excerpt processing, provider processing, private evaluation storage, quote storage, and metrics publication. The runner rejects missing/extra document rights, mismatched source URLs, unsafe URLs, unchecked scopes, and non-test/synthetic/unreviewed rows. It computes a canonical SHA-256 digest of the rights-review record; every prediction carries this digest, and the evaluator rejects a gold/prediction mismatch. Keep the complete rights record in a private, access-controlled artifact so the digest can be independently recomputed. This is a tamper-evidence link, not authentication or legal review.

### Double-review comparison input

Before creating the adjudicated gold row above, the agreement checker accepts one private JSONL file per reviewer. Each line contains the same frozen claim and document inputs in both files, plus that reviewer's `label`. Required fields are `claimId`, `sourceId`, `documentIds`, `split`, `claimType`, `claimTextSha256` (SHA-256 of the exact frozen claim wording), `label`, `synthetic: false`, `review`, and `acceptedCitationHashes`. The `review` object requires an opaque `reviewerId`, `reviewedAt`, `sourceInspected: true`, `rightsStatus: "cleared"`, and the matching `rightsReviewSha256`. Citation entries contain only `documentId` and the SHA-256 of the exact accepted quote; do not include quote text or private rationale in these files.

Keep both input files and the output in restricted storage outside the repository. On POSIX systems, the tool requires owner-only access on input files and their containing directories, writes reports with mode `0600` in an owner-only directory, rejects repository paths, and refuses to overwrite. Create the restricted directory with mode `0700` before use. On non-POSIX systems, configure equivalent filesystem ACLs separately. The report emits agreement metrics plus a disagreement queue and is still private because it contains source/claim identifiers and reviewer labels. Example invocation from `services/data-pipeline/`:

```bash
uv run python annotator_agreement.py \
  --reviewer-a /restricted/review-a.jsonl \
  --reviewer-b /restricted/review-b.jsonl \
  --output /restricted/agreement-report.json
```

The report computes raw label agreement, Cohen's kappa (undefined when expected agreement is one), exact citation-set agreement, and conflicts requiring adjudication. Agreement does not measure annotation accuracy or make the final gold labels; a third reviewer must resolve conflicts independently of model output.

Public citation release remains a separate consent decision. `metricsPublication` does not authorize publishing full source text or arbitrary quotations.

### Frozen exact claim and assessment input

The model must receive the same bounded claim wording that the reviewers assess. Before annotation or inference, freeze a private candidate JSONL whose `input` contains `sourceId`, `claimType`, `claimText` (20–1,000 characters), and the exact document IDs, titles, and excerpts. The web UI submits this claim explicitly; a missing claim causes the AI path to abstain before calling a provider. The rules baseline and AI prediction must be evaluated against this same claim and document set.

Create a digest-only manifest before either reviewer labels the case:

```bash
bun run freeze:ai-inputs --input=/restricted/candidate-inputs.jsonl \
  --output=/restricted/frozen-input-digests.json
```

The command is offline and makes no provider request. On POSIX, keep the input file and its containing directory owner-only, keep the output directory owner-only, and store all three outside the repository. It rejects oversized or malformed inputs, duplicate claim IDs, unsafe paths, and an existing output. The manifest records the input-file SHA-256, claim IDs, and per-claim `claimTextSha256` and `assessmentInputSha256`; it never copies claim wording or excerpt text. Preserve this private manifest with the annotation record.

`claimTextSha256` is SHA-256 of the parsed, trimmed exact claim statement. `assessmentInputSha256` is SHA-256 of canonical JSON for the variable provider payload: `sourceId`, `claimType`, exact `claimText`, and ordered document `{id, title, text}` values. The separately recorded model and prompt versions bind the model configuration; rights metadata is checked and hashed independently. Gold rows, both reviewers' comparison rows, and provider predictions must carry both hashes. Evaluators reject any mismatch so an output for a different claim or excerpt cannot be scored against the frozen label.

The resulting audit keeps claim wording private by default. The exact text is published only when the submitter opted in and an authorized reviewer separately approves publication; otherwise the bundle carries hashes without exposing it. This consent gate governs disclosure, not the truth of a claim or the document's rights. None of these hashes prove document authenticity, scientific validity, or physical mitigation.

## 5. Evaluation and internal release gate

The current evaluator requires at least 40 held-out claims from 10 sources, all three labels, cleared rights, macro-F1 ≥0.80, citation precision ≥0.90, at least one correctly grounded supported claim, and zero false-supported claims. It reports source-cluster percentile intervals with a fixed seed and a paired AI-versus-rules comparison when baseline predictions are supplied.

These are internal release gates, not official competition thresholds. Report per-label precision/recall/F1, label counts, citation counts, source/document counts, false mitigation confirmations, confidence intervals, model/prompt version, snapshot/document provenance, and all abstentions. A small test set with zero false confirmations does not establish zero real-world risk.

## 6. Readiness status

- **Implemented:** schema validation, source- and document-disjoint split checks, exact accepted-citation digests, per-document rights-review scope checks with a digest bound across inference and gold labels, source-cluster intervals, paired rules comparison, macro-F1 release threshold, and a tested local tool for two-reviewer pre-adjudication agreement/conflict queues.
- **Not performed:** rights-cleared document collection, two-person adjudication, provider inference, independent model benchmark, or release-quality accuracy claim.
- **Next gate:** obtain documented rights and reviewer availability, then prepare a private benchmark set that satisfies this protocol before any provider call.
