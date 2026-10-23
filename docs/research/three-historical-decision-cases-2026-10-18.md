# Three Case Studies: From Methane Information to Traceable Decisions

**18 October 2026 · historical metadata analysis, not field validation.**

> Translation note: The original prose is available at Git revision `9d38ad2`; frozen manifests and run-bound artifacts are unchanged.

MethaneResponse aims to help analysts state clearly what is known, what is unproven, and what evidence should be requested. Primary users: environmental analysts, evidence reviewers, and follow-up coordinators. The intended work product is a decision with its rationale, period, references, follow-up owner, and inspectable version.

## Data basis and interpretation

All three cases come from the [frozen casebook](../../data/real/mars_casebook_2026-10-15.json), snapshot `unep-mars-675417694883`, captured 14 October 2026. UNEP attribution and CC BY-NC-SA 4.0 dataset license are retained; normalization and case selection are described in the [data README](../../data/real/README.md). All three are oil and gas cases, not a representative sample of all emission sources.

One plume is one observation from a satellite pass; a source is a location that may have multiple plumes. Source-level `notified` and `feedback` do not bind a recipient, delivery time, or physical outcome to each event. Flux values are kg/h at observation time; `±` below is the recorded standard deviation, not a 95% confidence interval. Reference: [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes).

Upstream timestamps without a timezone are stored as supplied. For day boundaries, the application treats them as UTC as an **application parser convention**; the inspected upstream documentation says `tile_date` uses ISO 8601 but does not confirm a timezone for that field. We do not claim the upstream hour has been verified as UTC.

The UNEP catalog page was checked on 18 October 2026 for summary/date/license. Linked report items list CC BY-NC-ND 3.0 IGO. This note briefly paraphrases catalog facts and links to them; it does not reproduce PDFs, images, or report text. Application decisions below use only casebook metadata. UNEP statements about mitigation remain attributed to UNEP; the app's metadata-only result does not refute them.

## 1. Kazakhstan — do not guess the order of action and observation

**Case:** `KAZ_S_159`, Uzen Field according to the [UNEP catalog](https://wedocs.unep.org/handle/20.500.11822/49949). The catalog, dated 23 September 2026, says IMEO confirmed a mitigation action in July 2026.

| Raw observation date | Satellite | Flux ± standard deviation, kg/h | Plume notified |
|---|---|---|---|
| 2024-06-07T08:05:04 | EnMAP | 591 ± 335 | false |
| 2026-06-05T07:40:02 | EnMAP | 307 ± 66 | true |
| 2026-07-11T08:12:14 | EnMAP | 496 ± 226 | true |

**Decision question:** may the 11 July observation be described as a post-repair measurement? The action month alone does not show whether it happened before or after 11 July. Do not transfer the 2024 observation to the 2026 event merely because the source ID is the same.

**Available:** three dated plume records, snapshot provenance, source `notified`/`feedback Yes` flags, and catalog link. **Not in the casebook:** action date/time, action record, evidence of delivery to a particular recipient, and follow-up measurement linked to that action.

**Decision supported:** preserve the timeline of three observations and leave mitigation status as an open question in metadata assessment. Do not classify the 11 July plume as either repair failure or post-repair verification success. For mitigation scope `2024-06-07 → 2026-10-14`, the application rules return `insufficient_evidence`, not `contradicted`.

**Follow-up ready to move into Casework:**

- Suggested owner: evidence coordinator/operator liaison; this is a role suggestion, not an assignment to an external party.
- Question: when did the action occur, and which observations were actually made afterward?
- Request: action log with date/time and source identity; reference for evidence delivery; post-action measurement with method, observation conditions, uncertainty, and coverage of the same facility.
- Closure criterion: chronology is inspectable and follow-up evidence is linked to the action. This does not mean the application certifies emissions reduction.

[Inspectable JSON report](../evidence/product-value-2026-10-18/kaz_s_159-mitigation-report.json)

## 2. Libya — one observation does not establish the post-action state

**Case:** `LBY_S_143`. The casebook contains one EnMAP observation, `2025-12-23T10:08:43`, **537 ± 240 kg/h**. The plume is notified true and source feedback is Yes. The [UNEP April 2026 catalog](https://wedocs.unep.org/handle/20.500.11822/49430) says IMEO confirmed a mitigation action at Intisar A in January 2026.

**Decision question:** can an analyst state that emissions are now zero because no later plume appears in the casebook? No. This casebook does not list a post-action measurement or all successful/unsuccessful observation opportunities.

**Available:** one historical measurement with uncertainty, administrative flags, provenance, and report link. **Unavailable:** exact action time, follow-up measurement result, detection limit, wind/cloud conditions, or reason no observation is available.

**Decision supported:** set the question to *awaiting evidence* and request post-action measurement evidence; do not treat this as an operator-compliance assessment. The `2025-12-23 → 2026-10-14` mitigation scope returns `insufficient_evidence` in the local metadata check.

**Follow-up:** an evidence coordinator requests the action log, post-action methane measurement at the same location, method/detection limit/uncertainty, and observation opportunities. Revisit the question when that data becomes available. Do not extrapolate 537 kg/h across an unobserved period.

[Inspectable JSON report](../evidence/product-value-2026-10-18/lby_s_143-mitigation-report.json)

## 3. Canada — preserve uncertainty and limit benefit claims

**Case:** `CAN_S_002`. The casebook contains one EMIT observation, `2026-04-10T19:07:29`, **1,044 ± 370 kg/h**. The plume is notified true and source feedback is Yes. The [UNEP July 2026 catalog](https://wedocs.unep.org/handle/20.500.11822/49811) says IMEO confirmed a mitigation action in southeastern Alberta in July 2026.

**Decision question:** can this observation value be turned into tonnes of methane avoided by MethaneResponse? Not yet. A pass-time measurement does not give emission duration, a no-action counterfactual, or a post-action outcome. The app also takes no field action.

**Available:** one flux estimate and its standard deviation, observation/source IDs, provenance, and catalog link. **Not in the casebook:** exact action time, post-action measurement, duration, and comparison baseline needed to calculate avoided emissions.

**Decision supported:** retain uncertainty in the brief; reject calculating tonnes avoided from one kg/h value; request follow-up data. The `2026-04-10 → 2026-10-14` mitigation scope returns `insufficient_evidence` in the application.

**Follow-up:** a measurement reviewer requests the quantification method, temporal coverage, action log, and repeated post-action measurement. Results could inform domain review; they do not automatically become carbon credits or team-attributed impact.

[Inspectable JSON report](../evidence/product-value-2026-10-18/can_s_002-mitigation-report.json)

## What product value and contribution are demonstrated?

| Analyst need | MethaneResponse output | Available evidence |
|---|---|---|
| Link a claim to an event and period | Explicit scope, UTC dates, included/excluded references | Scope tests and replay of 9 historical tasks |
| Preserve what is unknown | Abstention and next evidence request | The three mitigation reports above |
| Review a decision change | Immutable revision, parent hash, reason, and comparison | **DEMO** revision scenario, separate from real cases |
| Share an inspectable report | JSON export with context checksum, browser verifier in Reports | Desktop/mobile browser and file-tampering challenge |

The demonstrated contribution is combining scope, rationale, follow-up, revision, and integrity checking in one workflow. A tool-assisted manual comparison can also do this work. See the [functional comparison and limits](../evidence/product-value-2026-10-18/README.md); no claim is made of global scientific novelty, human time advantage, or physical methane outcome.

**Impact limit:** demonstrated so far is decision transparency and result inspectability. There is no evidence that using the app changes operator action, shortens leak duration, or reduces tonnes of emissions. These case studies complement, but do not replace, expert review or a human pilot.
