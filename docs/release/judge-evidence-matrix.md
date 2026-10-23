# Judge-readiness evidence matrix — 14 October 2026

> **Assessment archive for its original date.** For the current submission, use the [v18 package](devpost-submission/README.md) and [active implementation status](current-implementation-status.md). Older plans below for a database/Luna and not-yet-deployed status have been superseded by a no-database prototype, DeepSeek smoke check, and limited Render preview. No human pilot, Sepolia receipt, or measured emissions impact is claimed. V18 has not been published merely because its local files are available.

> This dated note preserves evidence collected while PostGIS was still part of the implementation. The 15 October decision removed the database from active scope; see the [prototype-scope decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md). PostGIS results below are historical evidence, not a current work dependency or criterion.

> **Do not use figures, snapshots, score status, or gate lists in this document as current status.** It is frozen as of 14 October and includes test counts and old deployment assumptions. For active implementation, verification, and PRs, follow [current implementation status](current-implementation-status.md), which also records the 15 October MARS Indicators integration.

This document distinguishes checkable results from unproven targets. It is **not a judge score**. The official Devpost page lists five qualitative criteria without official weights or numerical scale; 18/20 is the project owner's internal target. [Official rubric](https://ieee-climatechain-hack.devpost.com/)

## Conclusion

**The internal target of 18/20 for four criteria cannot yet be objectively claimed as achieved.** The data foundation and local validation are strong, but there is no evidence of a live AI model, Sepolia transaction, cloud deployment/database, user study, or mitigation outcome attributable to product use. The latest case-evidence UI now shows location imagery and publisher plume geometry bound to the selected observation; this improves workflow inspectability, not evidence of environmental impact or model accuracy.

What has been demonstrated locally: the map loads a hash-bound historical MARS snapshot; the workflow distinguishes linked from unlinked observations; the feed is labeled non-live; and missing observations are not treated as zero emissions. The API, review/report/verifier, temporary PostGIS, contract, and desktop/mobile presentation passed the checks recorded below. Those tests demonstrate implementation behavior, not AI accuracy or emissions reduction.

## Reproducible data evidence

| Measurement | Active snapshot result | Interpretation limit |
|---|---:|---|
| Snapshot | unep-mars-ccd8267c55ee | Historical archive, not a live feed; two earlier releases remain in history |
| MARS sources | 4,213 | Original source identities retained |
| Plume rows | 30,357 | Observations, not number of audited cases |
| Plumes with sourceId | 23,810 | Dataset linkage does not verify mitigation |
| Without sourceId | 6,547 | Left unresolved; source is not guessed |
| Observations with null flux | 1,050 | Missing remains missing, not zero |
| Exact zero flux | 20 | Distinct from missing |
| Valid coordinates and positive flux | 29,287 | Flux per observation is in kg/h; map symbols are not plume boundaries or continuous concentration |
| Date range | 2020-10-29 – 2026-09-12 UTC | No data after the snapshot end date |
| Casebook cases | 3 | Real-case metadata; report link alone does not prove report content or mitigation |
| Source archive SHA-256 | ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2 | UNEP IMEO MARS provenance and CC BY-NC-SA 4.0 license are stored with the snapshot |
| Browser gzip file SHA-256 | 895a4ce26240080c28315eff106806e7b40e37c6ba8f328f787637a0d19fc0e0 | Matches the snapshot manifest |
| Decompressed content SHA-256 | 5e0f658303e149dedbfd8cdab5facd5876062b0ff9c5957daea83be8122b5a0b | Matches the snapshot manifest |
| Progressive source catalog | 352,408 bytes gzip | Snapshot-bound; contains 4,213 locations and observation dates, without all plume history |
| Catalog + SEN_S_001 history bucket | 411,836 bytes gzip | One bucket contains 17 observations; this is total artifact size, not a network measurement |
| All 64 history buckets | 3,106,998 bytes gzip; 22,002,698 bytes decompressed | Catalog plus all buckets: 3,459,406 bytes gzip; fail-closed behavior remains tested when a bucket fails |

The IEA reported that about 12% of MARS notifications received a response in 2025. That figure measures responses, not leaks that were not repaired or emissions successfully reduced. MethaneResponse targets traceability of follow-up claims and does not replace MARS. [IEA, 2026](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system)

## Local implementation and test evidence

Date note: browser runs explicitly showing unep-mars-e0721015e925 are historical evidence for the 12 October snapshot. Current browser data uses unep-mars-ccd8267c55ee; the baseline → report → verifier flow for the active snapshot is recorded in the [14 October checkpoint](../history/execution-checkpoint-2026-10-14.md).

| Check | Latest result through 14 October 2026 | Meaning and limit |
|---|---|---|
| bun install --frozen-lockfile | Completed without changing the lockfile | Locked dependencies are consistent |
| bun run check | Passed | API and web typecheck |
| bun run test:api without database | 93 passed, 10 skipped, 0 failed, 530 assertions | PostGIS integration skipped in the no-database run; skips do not count as passes |
| API + TEST_DATABASE_URL | **101 passed, 0 skipped, 589 assertions** | Same postgis/postgis:17-3.5-alpine image as CI; disposable loopback container stopped after tests; not cloud evidence |
| bun run test:web | **152 passed, 0 failed, 164,391 assertions** | Includes navigation and snapshot regressions; geometry for active release's 4,213 sources available via publisher-shard loader |
| bun run test:verifier | **4 passed, 0 failed, 31 assertions** | Local hash/bundle; not Sepolia evidence |
| cd services/data-pipeline && uv run --locked pytest -q | **117 passed** on 2026-10-14 | Pipeline, MARS, intelligence, evaluator, source-cluster intervals, release-gate macro-F1, and prospective ledger; not document-AI accuracy or prospective validation on a new population |
| bun run test:contracts | 4 passed | Authorization, revisions, and digest in local Foundry |
| bun run build:web + bun run check:web-bundle | Passed | App chunk 62.48 kB gzip and eight route chunks. New component footprint 6.72 kB raw / 2.54 kB gzip and geometry loader 8.04 kB raw / 2.82 kB gzip remain lazy. MapPanel 1,121.29 kB raw / 306.52 kB gzip remains lazy and triggers a Vite threshold notice; there are two upstream Zod comment notices |
| Local Chromium /dashboard/cases?sourceId=SEN_S_001 → Map Explorer | Selected source opened at coordinates 14.805°, -17.311° · z11.0 | 660×534 desktop canvas; at 390×844, 338×438 without overflow; query/source selection persisted. Imagery-provider tiles returned HTTP 200; software WebGL gave a performance warning; no page errors |
| Local Chromium Evidence Auditor SEN_S_001 → KAZ_S_159 | Three 256×256 Esri tiles, three history records, and publisher geometry VERIFIED | The 2026-07-11 record showed 496 kg/h ±226 kg/h and matched the selected source/date. Esri imagery is location context, not an overpass image |
| Local Chromium Cases → full case → Evidence, SEN_S_001 | Desktop 1280×800 and mobile 390×844; zoom-16 location imagery; geometry VERIFIED; picker selected 2026-06-21 and 2026-02-18 overpasses | Each selection shows polygon, plume ID, UTC time, flux, and standard deviation from the same record. Browser requested the hash-bound monthly shard (HTTP 200); no image file per case. Console errors: 0. Screenshot is in .playwright-cli/; imagery still depends on Esri tile service |
| Progressive-history failure → retry | Map bucket 005 and auditor bucket 003 deliberately blocked, then retried | Before retry map showed 0 observations and auditor showed History unavailable; after retry map showed 30,319 plume rows and auditor 17 rows; no partial data |
| Case-location and imagery coverage | 4,211/4,211 sources have valid WGS84 coordinates; tests produced imagery fallbacks for every source and matched latest-observation geometry per source | Imagery is dated-variable Esri location context. Some provider JPEGs have dark coastal mosaic patterns already in the source bytes; the map offers an alternative basemap. 23,785 linked plumes have official geometry; imagery is not an overpass image or mitigation evidence |
| API /api/intelligence/insights?sourceId=KAZ_S_159 | Matches map snapshot ID; 3 observation dates; dataSufficiency=limited; forecast not_available | Priority score is a heuristic, not leak probability or forecast |
| 390×844 viewport | 390 px document width; canvas and legend present | Chromium viewport test, not a physical phone |
| Cold production map route | App transfer 57,148 B; canvas ready in 2,078 ms desktop and 1,992 ms mobile; no other workspace chunk requested on initial load | One run per viewport with software WebGL; four long tasks observed (maximum 263/248 ms). Does not prove FPS, performance distribution, or speed on other networks/devices |
| Local API /api/health | status=ok, backend=file, persistent=true, casebookReady=true, chain inactive | Local file store, not PostgreSQL/cloud availability |

Local visual artifacts: /tmp/methane-map-final-desktop.png, /tmp/methane-map-final-mobile-adjusted.png, /tmp/methane-evidence-auditor-final-loaded.png, and /tmp/methane-evidence-auditor-mobile.png. They are not in the repository because the screenshots contain a third-party basemap with separate redistribution terms.

Production-measurement update from 13 October: after the App entry became 56.85 kB gzip and eight route chunks were added, Chromium measured 57,148 B App transfer and canvas readiness of 2,078 ms at 1280×900 and 1,992 ms at 390×844. No other workspace chunk was requested initially; there was no horizontal overflow or page error. One cold run per viewport only; software WebGL recorded four long tasks (maximum 263/248 ms), so these figures do not guarantee FPS or a performance distribution.

## Evidence matrix for four targeted criteria

| Criterion | Current measured evidence | Evidence gate for internal target ≥18/20 | Gate status |
|---|---|---|---|
| **Climate Impact** | Primary-source dataset; workflow separates detection, notification, response, and mitigation; unsupported claims abstain. IEA report supports problem context. | Pilot with researchers/auditors/environmental organizations; measure review time, provenance/quotation completeness, and proportion of claims corrected. State transparency impact if emissions reduction has not been measured; physical-mitigation claims need relevant follow-up evidence. | **Not passed** — no pilot participants/results, use impact, or attributed emissions reduction |
| **Innovation & Creativity** | Claim audit adds exact quotations, abstention, contradiction, consent, review, immutable revision, bundle hash, and receipt recovery; regression tests exist. Evaluator now calculates 95% source-cluster intervals for macro-F1, citation precision, and paired difference against baseline; sources and documents are separated across splits. | Real model on independently labeled, source- and document-disjoint benchmark compared with rules on identical claims. Plan target: 40–80 held-out claims from 10–20 licensed documents. If blockchain is part of the demo, independently verify a Sepolia transaction. | **Partial** — evaluator and intervals available, but no licensed corpus, live-model result, or testnet receipt |
| **Technical Execution** | Typecheck/build and local gate passed; 101 API with PostGIS, 4 Foundry, **117 Python**, 152 web, 4 verifier, Chromium browser, shard retry, and snapshot-hash verification. | Complete workflow from a deployment origin: durable PostgreSQL after restart, provider assessment with validated quotations, authorized review, revised report, Sepolia anchor, and event/hash check by a separate verifier. Split the large chunk or measure its effect on target devices. | **Local pass; production gate not passed** — preview uses file store, AI and chain are inactive, no deployment/physical device |
| **Practical Usefulness** | Local flow shows observations/provenance, heuristic insights, Evidence Auditor/review/report/verifier; cases without documents are not confirmed. | Target users complete tasks without assistance; record success, errors, time, and feedback; verify storage/access from an origin judges can open. Determine identity/ownership before cross-organization use because reviewers currently use a service token. | **Partial** — local functionality exists; no user study, deployment, or per-user identity |

## Baseline and AI

The rules baseline report contains 15 examples: 9 casebook examples and 6 DEMO fixtures. After tightening source-notification semantics, all three real operator_notified examples are now insufficient_evidence without citations. Real support consists of 3 supported, 6 insufficient_evidence, and 0 contradicted; real macro-F1 is 0.6667. Combined macro-F1 of 1.00 mixes synthetic data (7/7/1 per label) and does not measure AI. The sample has 0 false mitigation confirmations; this is not a generalization guarantee or model benchmark result.

An independent AI evaluator and model CLI are available: exact-quotation checks, source- and document-disjoint splits, release floor macro-F1 0.80, input limits, licensed claims, explicit approval for paid calls, and private output. No eligible dataset exists and no provider is configured, so there is no live-AI result. Do not describe the rules baseline as AI accuracy.

## Configuration and remaining work

- Preview uses a local file store (persistent=true on the health route), not a cloud database.
- The checked configuration did not provide an AI provider, DATABASE_URL, reviewer secret, Sepolia RPC, registry address, or signing key.
- chainConfigured=false and chainWriteConfigured=false; no Sepolia transaction was sent.
- The repository was reported public; anonymous access had previously been demonstrated by git ls-remote and shallow clone at commit 99662e6de86b1d745e6ce3589ce37a9ed6c0d66c. The newer working tree was not included in that public commit and GitHub could not be rechecked from the session network. Devpost asks for a public repository, 3–5 minute demo video, description, and prototype/PoC. [Submission requirements](https://ieee-climatechain-hack.devpost.com/)

No deployment, paid provider call, blockchain transaction, account creation, repository visibility change, or submission was performed.

Gate-closing priorities: (1) obtain a mitigation report with clear processing rights, then annotate/adjudicate it with humans; (2) configure a backend provider with owner approval and run held-out evaluation without bundling content; (3) test migration/persistence on an owned database through a judge-accessible deployment; (4) if authorized, deploy/anchor on Sepolia and verify the receipt from an independent client; (5) run a task pilot with target users; (6) resolve asset licensing and rule clarifications, then match the local revision to the public revision before submission.

Official criteria are qualitative. The gates above support an internal target; they do not guarantee a score, ranking, physical impact, or win.
