# Candidate Swarm Audit — IEEE ClimateChain 2026

> **Status note:** this is an earlier, superseded audit. Deeper research found the highly overlapping GridCast repository for GridWitness and audited CEMS artifacts; see the [latest report](swarm-deep-research-2026-10-11.md) for the current decision.

**Date:** 11 October 2026 (WITA)

**Purpose:** find candidates suitable for the hackathon rubric without conflating source evidence, experiment results, and opinion.

**Method:** two agents worked separately: one audited discussed candidates and one searched for additional candidates. I rechecked key claims against official Devpost pages, data owners, standard owners, and directly opened one data endpoint. Agents did not modify project files.

## Short verdict

**No candidate has been proven best or likely to win. GridWitness was the most suitable to test first; HourGuard was the easiest deterministic fallback to verify.** This is an experiment-order decision based on available proof paths, not a judge prediction.

The official rubric has five criteria: Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, and Presentation & Communication. Devpost showed no numeric weights, so no invented numeric score or Top 3 odds are used. The event page also requested a prototype/PoC, public repository, and 3–5 minute demo video. [Devpost](https://ieee-climatechain-hack.devpost.com/)

## What was checked

| Statement | Evidence status | Source/limit |
|---|---|---|
| Event rubric and deliverables | **Directly verified** | Official Devpost page lists five criteria and submission items; numeric weights are not shown. |
| NESO has carbon-intensity forecasts and estimated actuals | **Documentation verified; endpoint also probed** | [Official NESO documentation](https://www.neso.energy/data-portal/national-carbon-intensity-forecast/national_carbon_intensity_forecast) describes forecasts/actuals in gCO₂/kWh. One response from the [official API](https://api.carbonintensity.org.uk/intensity) opened during this research contained one 30-minute interval with `forecast` and `actual`. This proves endpoint response and data format at that time, not historical dataset quality or scheduler benefit. |
| Forecast-vintage archive needed for historical replay | **Third-party source; not independently audited** | [Carbon Intensity Forecast Tracking](https://github.com/nmpowell/carbon-intensity-forecast-tracking) says NESO does not retain forecast history and its scraper captures about 90% of normal slots; missed slots are lost. This is the repository owner's report, not recalculated or verified from the database in this audit. |
| Forecast-based carbon scheduling already exists | **Verified in product documentation** | [Carbon Aware SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/overview) supports time/location selection. [Forecast documentation](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library) shows optimal-window selection and historical forecast replay based on `requestedAt`. This weakens novelty for ordinary scheduling; it does not prove that the product implements every GridWitness method. |
| Hourly clean-energy matching is standardized | **Verified by standard owner** | [EnergyTag Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/) defines temporal matching at one-hour or finer intervals, with geographic and attribute aspects. This weakens HourGuard novelty if it only implements the matching formula. |
| Methane-alert response has real systems/guidance | **Verified from UNEP/IEA** | [UNEP MARS](https://methanedata.unep.org/methane-alert-response-system) describes notification, follow-up, monitoring, and delayed data publication; [IEA](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system) sets out five response steps. [Carbon Mapper](https://carbonmapper.org/articles/product-guide) also provides plume/source products, attribution, and persistence. Carbon Mapper requires account registration to integrate its API ([data access](https://carbonmapper.org/data)); account access and usable-record count were not tested. |
| Mangrove restoration monitoring exists | **Verified by UNESCO/GMW** | [UNESCO MRTT](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt) describes recording pre-restoration baselines, interventions, and post-restoration monitoring. This does not make new projects impossible, but a general mangrove-monitoring dashboard is not sufficient differentiation. |
| EUDR has a due-diligence statement system | **Verified by the European Commission** | [EU Information System](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/information-system-deforestation-regulation_en) lets operators create statements and enter product origin. Without real suppliers/lots, ForestPassport cannot demonstrate end-to-end physical provenance. |
| Renewable curtailment is a problem and CAISO has public reports | **Problem verified; data extraction not tested** | IEA reports EU renewable surplus curtailment >10 TWh in 2024 ([Demand Flexibility](https://www.iea.org/reports/the-value-of-demand-flexibility/executive-summary)). [CAISO report index](https://www.caiso.com/library/daily-renewable-reports) includes daily/real-time curtailment reports; one [example report](https://www.caiso.com/documents/daily-renewable-report-oct-04-2026.html) shows “Hourly VER Generation Curtailment Energy in MWh.” An agent/audit did not download or test the chart/CSV; ex-post data do not prove curtailment was prevented. |

## Qualitative candidate comparison

This is analysis against the five official criteria, not scores or experiment results.

| Candidate | Evidence-supported strength | Unresolved risks | Current decision |
|---|---|---|---|
| **GridWitness** | Forecast/actual data have an official API; flexible work decisions can be compared with actual outcomes; AI, scheduling, and blockchain precommit can be tested separately. | Required forecast history comes from an unaudited third-party archive; no backtest, AI uplift, validated users, or precommit transaction; carbon-aware scheduling already exists. | **Test first.** Do not select finally before it beats a baseline or measurably reduces risk. |
| **HourGuard** | Matching/duplicates can be tested deterministically with valid/invalid cases; demo is easy to explain. | Hourly matching is already in EnergyTag standard; access to real registry/certificate data is unproven. | **Easiest to verify as fallback**, with novelty risk. |
| **MethaneResponse** | Strong climate problem and potentially compelling satellite-data visuals. | Many core functions—alerts, analysis, response, verification—already exist in MARS/IEA or Carbon Mapper; API registration is needed; new AI value and ledger benefit are unproven. | **Conditional.** Continue only if a user need and differentiator are found. |
| **MangroveProof** | Change map can produce a clear demo; strong ecosystem relevance. | MRTT/GMW already support related monitoring; satellite analysis alone does not prove restoration success or carbon sequestration. | **Not a first choice** without reference data/partners that strengthen validation. |
| **ForestPassport** | Product-origin traceability is a plausible supply-chain problem. | Official EUDR system already collects origin; without real supplier/lot data the central part remains simulation. | **High end-to-end demo risk.** |
| **CurtailmentCapture** (additional candidate) | Schedules loads during curtailment, making its impact story more specific than merely choosing low-carbon grid hours. IEA supports the relevance of demand flexibility. | Inspected CAISO reports are historical; data extraction is untested; temporal alignment does not prove added load causally reduces curtailment; novelty and blockchain/AI roles remain hypotheses. | **Small experiment only**; does not replace GridWitness yet. |

## What has not been established

- GridWitness improves outcomes over Immediate or NESO-Greedy.
- AI adds value over NESO forecasts and simple rules.
- The forecast-vintage archive is complete enough for leakage-free evaluation.
- A blockchain commitment was made before an outcome or improved decision quality.
- MethaneResponse increases response/mitigation rates.
- MangroveProof proves restoration or carbon sequestration.
- ForestPassport proves physical commodity origin.
- CurtailmentCapture prevents curtailment or emissions.
- Any candidate has a particular chance of a Top 3 finish.

This research produced no candidate backtest, contract test, user interview, or judge evaluation. Our interpretation of rubric fit is inference.

## GridWitness decision gate

Test the smallest pipeline first; make no result claim before metrics are available:

1. Audit archive time range, slot completeness, duplicates, missing actuals, and how to reconstruct the forecast available at decision time.
2. Run a chronological evaluation without future leakage. Compare **Immediate**, **NESO-Greedy**, and **GridWitness**; Oracle is only a theoretical bound.
3. Report paired results: intensity-weighted metric, share of decisions that worsen, tail regret, and deadline misses. Call these carbon-intensity-weighted estimates, not proven avoided emissions.
4. Hold out the test set until the model/policy is frozen. If AI does not add accuracy or reduce risk, remove AI as a differentiator.
5. Ensure the contract rejects changed artifacts and stores a commitment before the outcome time. A hash proves artifact integrity after recording, not source-data truth.

**Decision:** GridWitness was the most suitable to test first because it was the most falsifiable with documented data. If results show no added value over baseline, do not retain it based on narrative; use the fallback or pivot. This does not mean GridWitness has been proven best for the overall rubric.
