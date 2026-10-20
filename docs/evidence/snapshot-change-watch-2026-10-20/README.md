# Snapshot Change Watch — local prototype evidence

20 October 2026, Asia/Makassar. Additive implementation on the current Investigation Operations working tree. No database, new dependency, upstream acquisition, deployment, publication or chain transaction. Earlier frozen evidence retains its original bytes. [Acceptance checklist](../../plans/2026-10-20-snapshot-change-watch.md) · [Walkthrough](../../product/user-workflow.md#tinjau-perubahan-dua-snapshot-historis) · [API contract](../../architecture/api-reference.md#historical-snapshot-record-transitions).

## What changed

- **Actual historical release comparison:** restore the complete earlier normalized browser projection from Git instead of inventing a prior release by deleting current records. Keep the active snapshot unchanged. Compare original source/plume IDs, explicitly versioned normalized fields, nulls, original timestamps, coordinates, reported flux/SD and unresolved linkage.
- **Review the affected allocation:** compute a portfolio in Cases, check selected sources, inspect original before/after field values, then open that exact source in Evidence Auditor or Map Explorer. Full catalog scope has server-side source pagination; per-source record details have a separate five-record UI page. Scope/strategy changes invalidate results. Empty allocations never silently become unrestricted requests. This does not replace the active queue or reviewer history.
- **Bounded backend:** local-only pinned inputs and offline report; input/report/manifest hash checks, active context binding, stat-keyed cache and concurrent load sharing. HTTP cannot supply paths/URLs. Strict body/source/page limits, separate rate limiter, no-store, redacted failures and restricted-preview denial preserve existing access boundaries.
- **Independent replay tooling:** canonical SHA-256 report plus both original gzip inputs and separately supplied expected hashes. The CLI replays every compared record, not just a file's self-declared checksum. A separately implemented Python oracle checks semantic rows, counts, unresolved records, linkage and UTC-day grouping. Python does not claim to implement canonical JSON hashing; that is checked by the TypeScript verifier.

## Real inputs and observed differences

| Input | Earlier retained projection | Active projection |
|---|---|---|
| Snapshot | `unep-mars-e0721015e925` | `unep-mars-675417694883` |
| Retrieval UTC day | 2026-10-12 | 2026-10-14 |
| Source records | 4,211 | 4,218 |
| All plume records | 30,319 | 30,414 |
| Exact-linked plume records | 23,785 | 23,861 |
| Unresolved plume records | 6,534 | 6,553 |
| Observation coverage end | 2026-09-11 | 2026-09-13 |

The earlier gzip is restored byte-for-byte from `99662e6:apps/web/public/data/mars-snapshot.json.gz`. [Restoration provenance](../../../data/real/snapshot-projections/unep-mars-e0721015e925.provenance.json) records compressed/decoded hashes and publisher attribution. Original CSV archive digests are recorded metadata; the CSV archive was not downloaded/authenticated again during this run. Derived data retains UNEP IMEO/MARS attribution and **CC BY-NC-SA 4.0**. These comparisons cover normalized field policy `mars-normalized-record-delta/1`, not every byte of the original CSV.

[Full report](proof/historical-change-report.json) and [verification output](proof/verification.json) show:

- **7 source records added; 170 existing source metadata records changed; 178 distinct source IDs affected** by source or linked-observation changes. These counts describe different sets and must not be added as if disjoint.
- **95 plume records added:** 82 have observation UTC days after the earlier coverage end; 13 are historical backfill. An added archive record does not establish a new physical leak.
- **3 existing plume records changed:** `8b023c06-a8a1-471e-b396-ea602041f44e` only changes `lastUpdate`; `a3773f59-5f6e-46e7-b5c6-710af91cabce` and `cdd76950-14dc-4827-8e6e-957c57a3c2b2` change reported flux, SD and update timestamp. There are no removed or relinked records in this real pair. Explicit DEMO regressions cover those branches.
- **19 additional unresolved records** remain outside source-specific work. Their changes are retained in the complete export; no nearest-source assignment is invented.

Default weighted allocations of 10 and 20 sources (two per country, 50/50 indicator blend, global scope) each flag **three selected source IDs**: `DZA_S_011`, `IRN_S_065`, `TKM_S_021`. The verification file records exact ordered portfolios and original changed fields. DZA/TKM have persistency metadata changes; IRN also has an additional linked record. A review flag is a prompt to inspect records, not a repair decision or measured climate impact.

Report commitment: `0x4363ad48a49f67dc5838482920b6fa607be06f0ab200eb5d10061a351ddb8077`. Expected digests must be obtained through a separately trusted channel; copying an attacker's supplied digest does not authenticate its input files.

## Reproduce

```bash
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts
bun run prove:snapshot-transition --output /tmp/NEW-snapshot-change-proof
```

The proof command refuses an existing output directory. Browser phases build the same production dist and must run sequentially. They require local process/socket permission; Chromium sandbox stays enabled locally. External imagery requests are blocked for reproducibility. Keep separate `PLAYWRIGHT_OUTPUT_DIR` values to retain captures from different invocations.

For this retained report, use input pins from an independently trusted record:

```bash
bun run verify:snapshot-transition \
  docs/evidence/snapshot-change-watch-2026-10-20/proof/historical-change-report.json \
  --before data/real/snapshot-projections/unep-mars-e0721015e925.json.gz \
  --after apps/web/public/data/mars-snapshot.json.gz \
  --expected-before a29a892e6c8aed4d6389313ffbc311df0bfe4e59aa78cce2b1b2cdbfb65ee72d \
  --expected-after f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7 \
  --expected-report 0x4363ad48a49f67dc5838482920b6fa607be06f0ab200eb5d10061a351ddb8077
```

The proof runner executes eight separate verifier processes: original passes; edited, edited-and-rehashed with trusted head, edited-and-rehashed with its own head, wrong input, wrong report commitment, missing pins and unknown option are rejected. Full input replay rejects edited content even when its own report hash is recomputed. `edited-report.json` and `edited-rehashed-report.json` are **deliberate tamper fixtures**, not observational evidence.

## Verification and review

The final `check:all` exited **0**: frozen dependency install (unchanged), API/web/E2E/evaluation type checks, **257 API + 270 web + 56 tooling + 221 Python + 4 Foundry = 808 main tests**, production build, bundle budget and baseline conformance. No failures or skipped main tests were reported. The final API suite includes shared inspection/export rate-bucket and oversized-body regressions added after the initial 807-test pass. App entry is **74,104 gzip bytes** under 75,000; eight required route chunks remain. MapPanel remains separately lazy at **1,124,042 raw bytes**, with its existing large-chunk advisory. Bundle size is not phone FPS or network latency evidence.

All eight CLI scenarios match expected exits. The separate Python oracle matches **8,429 source records and 60,733 plume records** across both original inputs. This is independent implementation consistency on shared input data, not an independently labeled scientific benchmark.

Final browser phases each exited **0**: **28 main + 10 private/team/publication/mock-AI = 38 unique scenarios**, no failures, retries or skips. The three added scenarios cover the real transition/details/download/pagination/source handoff, delayed strategy response, and explicit error/retry. Repeated focused runs and the five runner-helper checks are not added again to unique browser coverage. The retained report also passes a separate CLI invocation against its recorded input/report pins; [output](verify-report-output.json).

An independent read-only code review found no Important/Critical issue in the new shared diff, API binding/cache, request limits, stale-response/export and replay boundaries. The reviewer did not execute tests or authenticate scientific measurements. Earlier full-gate attempts stopped at a nullable `datasetSnapshotId` in the proof script; an explicit real-input binding precondition fixed the type error before the final run. A restricted-environment browser launch failed at Chromium socket creation before application assertions; authorized local execution retained the browser sandbox. Initial mobile capture timing also produced a poor-width image: a settled panel-width assertion and viewport capture replaced it. Failed attempts are not counted as passes.

## Boundaries and next work

- This closes comparison against a complete **real historical second snapshot**. It does not fetch future releases, establish a live feed, validate prospective forecasts or automatically reschedule work.
- Feedback/notification changes remain publisher metadata. Missing/removed observations are not zero methane. Hashes do not prove physical repair, original publisher identity or present-day status.
- Existing audit schemas, EvidenceRegistry receipts and reviewer journals are unchanged. No database migration, new dependency, remote mutation or blockchain transaction is introduced. This report itself is unsigned and not chain anchored.
- Browser snapshots emulate a mobile viewport on desktop Chromium; they are not physical-phone, live basemap or guaranteed-FPS tests. Provider AI quality, public Sepolia receipts, pilot benefit and new public CI/deployment remain outside this increment's evidence.
- The next code increments are document-grounded allocation briefs with a configured provider and strict source/citation bindings, a separately approved next-release ingestion/promotion flow, and explicit reviewer links between a transition report and versioned plan decisions. No competition result follows from source line or test counts.

Source and command bindings are recorded in [checks.json](checks.json); local summaries in [checks-output.txt](checks-output.txt) and [browser-output.txt](browser-output.txt). [Artifact manifest](artifact-manifest.json) binds this package. All 87 artifacts from the four preceding frozen packages retain their checksums. This package binds an uncommitted local working tree, not a new GitHub release or public deployment.

Actual rendered viewport captures inspected: [desktop](snapshot-watch-selected-desktop.png) and [390×844 mobile emulation](snapshot-watch-selected-mobile.png). The desktop capture shows the exact selected sources and expanded field table; the mobile capture checks the responsive result summary. Browser assertions check the full change/details/navigation workflow beyond the photographed viewport.

### Changed surfaces

| Surface | Files in this increment | Compatibility |
|---|---|---|
| Diff policy | `packages/shared/src/snapshot-transition.ts`, shared package export | Additive schema/policy 1; no audit, contract or planner-policy rewrite |
| Server | `apps/api/src/snapshot-transition-data.ts`, new handlers in `app.ts`, rate-limit scope | Pinned offline read; no arbitrary paths, upstream writes or database migration |
| Cases UI | `SnapshotChangePanel.tsx`, `snapshot-change-watch.ts`, `InvestigationPlanner.tsx`, planner CSS | Existing routes and source handoff; no extra map renderer/layer |
| Inputs | Historical gzip/provenance, generated report/manifest, narrow `.gitignore` exception | Active input unchanged; historical archive/projection hashes distinguished |
| Independent tools | Build/verify/proof scripts, `snapshot_transition_oracle.py`, script commands/typecheck config | Expected pins and complete originals required for replay |
| Regressions | API/policy/web/CLI/Python tests, three additional main browser scenarios | Real archive comparison plus visibly DEMO edge/failure fixtures |
| Guidance | Root README, active status, workflow, API/testing/data/evidence guides, checklist | Prior frozen evidence unchanged |
