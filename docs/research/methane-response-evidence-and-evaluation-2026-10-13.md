# MethaneResponse Evidence and Evaluation Research

**Reviewed:** 14 October 2026 (WITA)

**Purpose:** turn primary research on MARS, satellite observations, repeated emissions, and AI citations into testable product decisions. This note supplements the [candidate audit](methane-response-audit.md) and [data/claims specification](../product/data-and-claims.md); it does not claim that MethaneResponse has reduced emissions.

## Findings and product decisions

### 1. Distinguish sources, plumes, notifications, feedback, and mitigation

UNEP defines a *plume* as one methane observation from one satellite pass and a *source* as a ground location that may have multiple plumes over time. The project snapshot preserves this relationship, dates, IDs, flux, units, coordinates, uncertainty, and provenance. A plume record without `source_name` remains unlinked; the app does not guess its facility.

The MARS data dictionary checked on 14 October 2026 also records that plume products from Sentinel-2, Landsat 8/9, EMIT, PRISMA, and EnMAP were requantified after 20 February 2026. Historical values can therefore change between dataset releases even when the observation date stays the same. MethaneResponse binds audits and history to a specific snapshot/hash, preserves values and metadata from that snapshot, and does not compare values across snapshots as if they were unrevised.

MARS already detects and quantifies large emissions, contacts governments/companies, monitors locations, and presents feedback and follow-up status. Eye on Methane also introduced persistency-weighted flux (PWF), which combines detection frequency and flux over six months using qualifying observation opportunities. The product must not claim to be a detection system or claim an MARS operational gap without evidence. The testable MethaneResponse workspace is checking document claims against citable records, human review, revision history, and integrity verification.

`feedback` is an engagement metric indicating that a response was received for a notified source. It may include an investigation or action, but it is not a certificate that repairs were completed. Non-detection also does not prove zero emissions: sensors have detection limits, and observation opportunities depend on clouds, light, surface conditions, satellite, and observation quality. Because public snapshots contain detections rather than a consistent panel of all observation opportunities, detection history alone cannot reconstruct physical emission prevalence.

**Application decision:** show the original UNEP status with label and date; separate notification/feedback metadata from documentary evidence; use `insufficient_evidence` for mitigation claims without inspectable evidence; retain observation history and uncertainty; never turn missing data into zero.

### 2. Validate satellite detection and quantification

The *single-blind controlled-release* study by Sherwin et al. tested five analysis teams using data from up to five satellites at a desert test site. Teams correctly identified 71% of released emissions, and three quarters of quantitative estimates were within ±50% of the meter value; 12% of evaluated cases produced no estimate because of weather, thick clouds, or image clipping. Wind errors also affected rate estimates. These results validate sensors in one controlled experiment; they are not MARS or MethaneResponse accuracy and do not represent every location, sensor, or condition.

**Application decision:** retain published units and uncertainty; allow “no estimate”/unavailable values; do not infer zero emissions from no detection. Esri context maps are not overpass imagery and do not replace the MARS publisher footprint available for a selected observation.

### 3. Visualize sources and footprints

The MARS publisher provides plume geometry with IDs, dates, coordinates, and emission attributes. The pinned project archive has 30,319 records: 29,112 MultiPolygon geometries and 1,207 records with empty geometry. Empty geometry must remain empty. An official footprint is not an atmospheric concentration surface or raw satellite image; its color encodes reported flux in kg/h, not concentration.

The Esri basemap in Evidence Auditor provides **location context**, and its image acquisition date may differ from the record date. It does not prove a plume exists. When geometry for the selected record is available, the preferred approach is to show it as a publisher footprint verified against the index/shard and active MARS snapshot, with date, flux, uncertainty, and limitation labels. When unavailable, retain the context image and history, then state that no footprint was published. Do not create synthetic plume images or download a separate image file per case.

For the complete casebook and global snapshot, a location map can be built directly from source coordinates. A three-tile Esri mosaic at zoom levels 16/13/10/7 provides on-demand context; no per-case image assets are stored. URL construction for all 4,211 sources was tested. Browser tile requests and fallback demonstrate behavior for sample locations, not a service-level guarantee that every tile will always be available.

### 4. Prioritization and prediction

UNEP PWF combines persistence and flux magnitude for visualization, with a denominator based on qualifying observations over six months. MARS explicitly says PWF is a visual metric not intended for direct physical interpretation. A MethaneResponse priority score must therefore identify its features and coverage and must not be presented as a future probability or a substitute for PWF.

The IEA's 2026 discussion explains that satellite, aircraft, drone, tower, and field sensors see different scales and have different detection limits. It also notes the need for multi-scale measurement; no single technology captures the full range of emissions. Thus an archive-recurrence model trained on MARS data predicts appearance of archive records according to its target definition, not the size of unobserved methane emissions or certainty of a future leak.

**Evaluation gate:** predict only from data before the cutoff; split time prospectively; group dependencies by source/location; compare with a simple baseline; report coverage, calibration, uncertainty intervals, abstention, and change versus baseline. Do not describe retrospective test results as prospective or external validation. The next MARS snapshot and a license permitting evaluation are required to test whether the model works on unseen data.

### 5. AI that explains citations

The ALCE benchmark (EMNLP 2023) evaluates fluency, correctness, and citation quality as separate dimensions. In its experiments, even the best system on one long-form set lacked full citation support for about half its answers. This general benchmark result is not an estimate of MethaneResponse performance, but reinforces that fluent text or the presence of citations must not be treated as supporting evidence.

**AI gate:** split claims into verifiable units; citations must be exact substrings of licensed documents; deterministic validation rejects mismatched offsets/quotes; allow abstention; keep human review as a separate decision. The MethaneResponse benchmark must record independent annotator labels, exact-citation validity, evidence support/contradiction, abstention, and false mitigation confirmation as a safety metric. Report the rules baseline with fixed data and prompts. Keep the model provider disabled until the corpus and processing consent are available.

## Relationship to competition judging

| Criterion | Testable claim | Evidence to show | Claim to avoid |
|---|---|---|---|
| Climate Impact | Satellite history and follow-up evidence are easier to trace in one case. | Real source, data lineage, dates, units, uncertainty, intended user, and impact limits. | The app reduces emissions or every alert means mitigation. |
| Innovation & Creativity | An independent audit workflow links claim, citation, reviewer decision, revision, and digest. | Demo case showing support/contradiction/insufficiency and what is stored on-chain. | Claim that AI detection or notification tracking replaces MARS. |
| Technical Execution | ID mapping, manifest hash, deterministic baseline, access limits, and receipt verification are reproducible. | Test output, snapshot version, hash, fail-closed state, and browser/runtime results. | Treating a passing build as a live cloud/provider service. |
| Practical Usefulness | A researcher/auditor can select a source, open history, assess a licensed excerpt, request review, and inspect revisions. | Task completion time and errors compared with a measured no-product workflow in a pilot. | Claiming time savings before a user study. |
| Presentation | Show one source from detection through evidence, decision, report, and verifier. | Real 3–5 minute demo, citation panel, limitations, and honest integration status. | Presenting synthetic/mock simulation as real company action. |

Judge rubric scores are not predicted here. Technical evidence and user testing must be reported separately; a subjective score of 18/20 cannot be inferred from a feature checklist alone.

## Primary sources reviewed

- UNEP, [MARS and Eye on Methane](https://methanedata.unep.org/methane-alert-response-system) — detect/notify/mitigate/track workflow, publication delay, satellite-observation limits, and PWF.
- UNEP, [MARS methane plumes and sources data dictionary](https://methanedata.unep.org/dict-mars-emission-sources-plumes) — plume/source records, IDs, dates, coordinates, `notified`, `feedback`, flux, uncertainty, persistence, observation status, and note on requantification after 20 February 2026.
- UNEP, [MARS response-rates data dictionary](https://methanedata.unep.org/dict-mars-response-rates) — response-rate denominator and difference between feedback and evidence of emission reduction.
- UNEP IMEO, [Technical Documentation for Methane Satellite Detection and Quantification](https://wedocs.unep.org/handle/20.500.11822/46241) — quantification methods and limits.
- Sherwin et al., [Single-blind validation of space-based point-source detection and quantification of onshore methane emissions](https://pmc.ncbi.nlm.nih.gov/articles/PMC9992358/) — controlled experiment measuring detection, quantification, wind effects, and cases without retrieval; results are not treated as application metrics.
- UNEP, [Persistency-weighted median flux rate](https://methanedata.unep.org/persistency-weighted-flux) — PWF formula, qualifying observations, six-month coverage, and interpretation warning.
- IEA, [Global Methane Tracker 2026: Recent insights from methane emissions studies](https://www.iea.org/reports/global-methane-tracker-2026/recent-insights-from-methane-emissions-studies-2) — capabilities and limits of sensor families and need for multi-scale measurement.
- Gao et al., [Enabling Large Language Models to Generate Text with Citations](https://aclanthology.org/2023.emnlp-main.398/) — citation-support benchmark and evaluation dimensions; not evidence of MethaneResponse performance.
