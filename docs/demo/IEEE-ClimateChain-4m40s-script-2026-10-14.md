# MethaneResponse — 4:40 demo script (draft)

- **Status:** DRAFT ONLY — not recorded, uploaded, or submitted.
- **Purpose:** prepare a truthful 3–5 minute walkthrough for IEEE ClimateChain.
- **Working tree:** based on the local working tree at `HEAD 99662e6`; the tree has uncommitted changes and is not a frozen release. Recheck the source, data snapshot, and every screen before recording.

This script demonstrates the product path that is available locally. It does not present live AI, authenticated human review, cloud persistence, a Sepolia transaction, physical mitigation, or emissions impact as completed or observed.

## Recording setup

- Use a clean browser profile and a disposable local audit store. Do not record credentials, tokens, personal information, or unrelated browser tabs.
- Use the real historical source `KAZ_S_159` from the active MARS snapshot. Do not switch to synthetic fixtures.
- Start at `/dashboard/map?sourceId=KAZ_S_159`; use `/dashboard/cases?sourceId=KAZ_S_159` if map tiles fail.
- Show the UI’s historical/not-live label. If imagery is unavailable, leave its warning visible and continue using the case table, source coordinates, and dated MARS records. Do not substitute an illustration or call location imagery a methane observation.
- Use the “mitigation confirmed” claim with the deterministic rules baseline. AI is not configured for this recording; do not imply that the baseline result came from an LLM.
- Generate a disposable audit, export the JSON, then run local digest verification. The expected chain state is unconfigured; do not imply an on-chain transaction.

## Timed walkthrough and narration

### 00:00–00:35 — Problem and boundary

**On screen:** MethaneResponse title, then the historical map.
**Voice-over:**

> Satellite systems already identify major methane releases. The gap MethaneResponse addresses is how an independent reader can check whether a claim about a source or its mitigation is supported by traceable evidence. This research prototype connects historical observations, a conservative claim assessment, and an integrity-checkable report. It supplements UNEP MARS; it does not detect methane itself or replace MARS.

### 00:35–01:15 — Find a real historical source

**On screen:** Open Documents and scroll to “Dataset Snapshot History.” Keep the active snapshot row visible while naming its counts and date range. Then open Map Explorer and select `KAZ_S_159`. If the map basemap is unavailable, select the same source from Cases and open its detail dialog.

**Voice-over:**

> This map uses a versioned UNEP MARS archive, not a live feed. The active snapshot contains 4,218 source records and 30,414 plume records, spanning October 2020 through September 13, 2026. Of the plume rows, 6,553 have no source ID and remain unlinked rather than being assigned to a source case. I’m opening source KAZ S 159, an oil and gas source in Kazakhstan. Its location is 43.41337 north, 52.91829 east. These are historical records, not independently audited evidence cases.

### 01:15–02:00 — Inspect dated observations and uncertainty

**On screen:** Open the source detail or Evidence Auditor observation timeline. Select the latest linked observation; show its date, flux, uncertainty, and satellite metadata.

**Voice-over:**

> This source has three linked historical observations in this snapshot. The latest is dated July 11, 2026. MARS reports an estimated flux of 496 kilograms per hour with a reported standard deviation of 226 kilograms per hour for that observation. This is a dated satellite estimate, not the current flux and not continuous monitoring. The archive-wide cutoff is later than this source’s latest observation; a missing later record does not mean zero emissions.

### 02:00–02:55 — Test a mitigation claim

**On screen:** Open Evidence Auditor, keep `KAZ_S_159` selected, choose “The detected methane release has been mitigated,” and run the deterministic baseline. Show the resulting `insufficient_evidence` verdict and its explanation.

**Voice-over:**

> Now I’m checking a specific claim: that the detected release has been mitigated. This source has a link to an official report, but the report text is not included in this assessment or cleared for AI processing. The evidence bundle shown here contains dated plume records, not attributable repair documentation. The rules baseline therefore returns “insufficient evidence.” It does not treat a report title, notification metadata, feedback, or a missing later record as proof of repair.

### 02:55–03:35 — State what is and is not active

**On screen:** Keep the audit result visible; show the AI capability status if it fits without exposing settings or secrets.

**Voice-over:**

> This result comes from the deterministic rules baseline, not a live AI provider. Document AI and human review are not configured in this run, so I will not present a model assessment or reviewer decision. That boundary matters: AI can help inspect authorized documents only after the source rights, benchmark, and reviewer workflow are ready. It cannot prove physical methane mitigation.

### 03:35–04:10 — Export and independently verify the report

**On screen:** Open Reports and export the JSON report. On the Blockchain page, import that downloaded file into “Verify an exported report.” Show the matching audit-bundle SHA-256 result and the message that no blockchain receipt is included.

**Voice-over:**

> The report can be checked without relying on the screen that created it. I import the JSON into the browser verifier, which recomputes the audit-bundle digest and matches it to the stored hash. It also states that this file contains no blockchain receipt. A matching hash can reveal later changes to the bundle; it cannot establish that the underlying claim is physically true.

### 04:10–04:40 — Benefit and close

**On screen:** Return to the source and its historical timeline; end on the product name and its limitation statement.

**Voice-over:**

> MethaneResponse helps researchers, auditors, and public-interest analysts distinguish observed detections from documented responses and supported mitigation claims. The practical result here is a traceable “not enough evidence” decision, not a claim that emissions were reduced. User benefit, time saved, and climate impact still need independent evaluation. Our next gates are authorized document review, live service validation, and a user pilot.

## Claim ledger for this recording

| On-screen/narrated claim | Evidence to verify before recording | Status and allowed wording |
|---|---|---|
| Active snapshot has 4,218 sources and 30,414 plume records; date range ends 2026-09-13 | `apps/web/public/data/mars-snapshot.json.gz`; snapshot ID `unep-mars-675417694883`; archive SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43` | **Observed in local snapshot metadata.** Say “historical archive,” never “live.” |
| `KAZ_S_159` has three linked observations; latest is 496 ± 226 kg/h on 2026-07-11 | `data/real/mars_casebook_2026-10-14.json`, case `MARS-REPORT-KAZ-S-159`; source-level metadata and raw plume fields | **Observed in the pinned dataset.** Say “reported estimate for this observation,” not present-day or continuous flux. |
| Mitigation claim returns `insufficient_evidence` | [Isolated browser rehearsal](../evidence/demo-workflow-2026-10-14/README.md) and exported audit JSON; re-run on the frozen recording build | **Observed in the current local working tree.** Do not call it an AI verdict. |
| Document AI and human review are inactive | API capability status shown in the recording session; inspect without revealing credentials | **Not configured for this run.** Do not suggest AI or reviewer verification occurred. |
| Local digest verifies; no chain receipt | Local verifier result for the exact exported bundle; chain status must remain `not_configured` unless independently changed and reverified | **Local integrity only.** Do not say the audit is blockchain-verified. |
| Users may benefit from improved traceability | Product workflow and the shown abstention result | **Intended benefit, not yet measured.** No time-saving, adoption, or emissions-reduction figure. |

## Judge coverage and short answers

| Judge question / criterion | Evidence to show | Bounded answer |
|---|---|---|
| Climate impact | Real MARS observation provenance; report and limitation screens | The intended contribution is clearer review and prioritization. No reduction in emissions or user impact has been measured. |
| Innovation | Claim-specific baseline returns `insufficient_evidence` when the report text is not in the submitted evidence bundle | The product audits claims around existing detection systems; it does not recreate satellite detection. |
| Technical execution | Versioned snapshot, exportable JSON, imported browser verifier, independent CLI verifier, tamper-copy rejection | Integrity verification is local in this run. No live AI, cloud database, or blockchain transaction is demonstrated. |
| Practical usefulness | One repeatable source → history → claim → report workflow | It is a research prototype for analysts, auditors, NGOs, and researchers; a user pilot has not tested time saved or decision quality. |
| “Does 63.2% mean a leak will continue?” | Do not foreground the intelligence panel in this short demo. If asked, show its target and limitations text. | No. The displayed retrospective estimate is for a later linked MARS archive record within 365 days, not a physical leak, current methane, future flux, or repair status. |
| “Was AI or blockchain used here?” | AI capability state and imported report’s no-receipt message | No. This recorded workflow uses deterministic rules and local SHA-256 verification. |

## Rehearsal and release gate

Before recording, re-run the full path once from a clean profile and temporary store; confirm the active snapshot ID/hash, source values, audit verdict, export, and digest on the exact revision to be recorded. Capture the build revision in the eventual video manifest. Keep the duration between 3 and 5 minutes, use readable zoom, and verify the exported video plays with intelligible audio and visible captions or equivalent on-screen labels.

If the live local workflow differs from this draft, update the script and claim ledger before recording. Do not edit away a truthful failure state. A recorded video, public upload, and Devpost submission are separate steps and remain **NOT DONE** until directly verified.

## Evidence references

- [Active snapshot manifest](../../apps/web/public/data/mars-snapshot-manifest.json)
- [Curated MARS casebook](../../data/real/mars_casebook_2026-10-14.json)
- [Data semantics and claim boundaries](../product/data-and-claims.md)
- [Current browser workflow evidence index](../evidence/ui-workflows-2026-10-14/README.md)
- [Isolated audit/export/verifier rehearsal](../evidence/demo-workflow-2026-10-14/README.md)
- [Execution checkpoint](../history/execution-checkpoint-2026-10-14.md)
