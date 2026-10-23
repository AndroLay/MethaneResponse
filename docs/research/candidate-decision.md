# Project Candidate Decision

> **Status: all rankings below are historical snapshots.** The 11 October 2026 reassessment, after audits of UNEP, NYC, NESO, and CEMS datasets, appears at the end. No candidate has been proven best through experiments on raw data.

**Date:** 11 October 2026 (WITA)

**Decision context:** about two weeks remained before the Devpost deadline on 25 October 2026 at 17:00 MSK / 22:00 WITA. The target was a prototype without a field survey, reproducible technical evidence, and one end-to-end demo.

**Note:** official criteria include Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, and Presentation & Communication, with no published numeric weights. This ordering reflects our risk/feasibility assessment, not judge scores or odds of winning.

## Initial choice

**Test GridWitness first.** Of the candidates discussed, it appeared most balanced for producing measurable evidence in limited time: NESO provides forecast and actual carbon intensity, a third-party forecast-vintage archive exists, and scheduling decisions can be replayed without claiming a field survey.

This **does not mean GridWitness has been proven best**. NESO provides data and an API, but forecast-aware scheduling is already covered by Carbon Aware SDK. GridWitness must show additional value: commit a decision before its outcome, use uncertainty correctly, then compare historical performance with a simple baseline. The forecast-vintage archive found was a third-party project; its author says the NESO API does not retain forecast history and the scraper missed some captures. Check data integrity, coverage, and split methodology before using numbers.

Sources: [NESO National Carbon Intensity Forecast](https://www.neso.energy/data-portal/national-carbon-intensity-forecast/national_carbon_intensity_forecast), [official Carbon Intensity API](https://carbon-intensity.github.io/api-definitions/), [forecast-vintage archive](https://github.com/nmpowell/carbon-intensity-forecast-tracking), [Carbon Aware SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/overview), [forecast handler/historical replay SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library).

## Candidate order for that objective

| Rank | Candidate | Why | Main gate |
|---|---|---|---|
| **1** | **GridWitness** | Easiest to turn into a falsifiable quantitative experiment; AI, optimizer, and precommit audit could each have a clear role. | A leakage-free backtest must show measured benefit over Immediate and NESO-Greedy; otherwise do not continue superiority claims. |
| **2** | **HourGuard** | Easiest to prove correct/incorrect outcomes deterministically and produce a stable demo. | Hourly matching is already described in the EnergyTag standard; novelty must come from a specific audit/duplicate case, not the matching formula alone. |
| **3** | **MethaneResponse** | Strong climate-impact story and visualization; real observations are available. | Many core functions already exist in MARS/Eye on Methane and Carbon Mapper; continue only for an unmet user need. See the [detailed audit](methane-response-audit.md). |
| **4** | **MangroveProof** | Ecosystem impact and map demo are easy to understand; GMW data are available. | Global Mangrove Watch already provides habitat change/alerts and the Mangrove Restoration Tracker Tool for baselines, interventions, and monitoring. Without field validation, do not claim restoration success or carbon sequestration. |
| **5** | **ForestPassport** | Traceability is relevant and fits the supply-chain track. | Without batch/supplier data or partners, a supply-chain flow tends to be simulated; land analysis alone does not prove product provenance. |
| **6** | **DeforestResponse** | Could build a forest alert/follow-up workflow. | Strong overlap with existing deforestation platforms/alerts; differentiation and local response data are needed. |

Main references: [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/), [Global Mangrove Watch](https://www.globalmangrovewatch.org/), [Mangrove Restoration Tracker Tool](https://mrtt.globalmangrovewatch.org/), [UNESCO on MRTT](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt).

## Requirements before selecting GridWitness

Run the experiment before building a dashboard:

1. Reconstruct the forecast actually available at each decision time from the forecast-vintage archive; measure capture loss and exclude ineligible periods.
2. Compare Immediate, NESO-Greedy, GridWitness, and Oracle (Oracle is only a theoretical bound). Use chronological splits and exclude features timestamped after the decision time.
3. Report paired results: change in intensity-weighted metrics, share of decisions that worsen, tail regret, and deadline violations. Do not call these causally avoided emissions.
4. Test AI against NESO forecasts and a simple baseline. If it adds no accuracy or risk value, change its role or stop the concept.
5. Use blockchain only for pre-outcome decision/evidence commitments. Demonstrate failed verification after an artifact changes; do not claim the ledger proves climate impact.

**Decision after the gate:** if GridWitness does not show meaningful benefit over NESO-Greedy, switch to HourGuard for a more deterministic prototype. If there is no user team/actor and blockchain remains cosmetic, simplify or choose another problem; do not keep a concept only because work has already been invested.

## Initial conclusion

**My first choice was GridWitness to test; the fallback was HourGuard.** MethaneResponse was no longer the first choice because newer evidence showed substantial overlap with existing systems. There was not enough evidence to guarantee any candidate would win; GridWitness would have a practical differentiator only if its experiment passed the baseline.

## Reassessment after public-data audit — 11 October 2026

This section supersedes the earlier ranking. Official sources confirm that all five candidates have relevant datasets or test structures, but no full archive processing/backtest had been done for any of them. The order below is a sequence for testing, not a prediction of winners or official score.

| Test order | Candidate | Current rationale | Gate before final selection |
|---|---|---|---|
| **1** | **MethaneResponse** | UNEP data contain plume observations and source summaries, including flux, persistence, notification, feedback, and emission status. The IEA reports that about 12% of MARS notifications in 2025 received a response. This is a response/engagement metric, not successful mitigation. | Download and profile the original payload; focus the product on an independent audit of status/follow-up. Do not claim a new methane detector or proof of repair, because MARS already performs detection, attribution, notification, and monitoring. Prevent temporal feature/label leakage and comply with CC BY-NC-SA 4.0. |
| **2** | **ShiftProof / GridWitness** | Most ready for a quantitative experiment: a third-party archive stores NESO API snapshots twice hourly and says the source API overwrites older forecasts. | Freeze data range and completeness; compare Immediate, forecast-greedy, and the proposed policy with chronological splits. Existing carbon-aware schedulers mean a new scheduling algorithm alone is not a differentiator. Intensity-weighted results do not prove causally avoided emissions. |
| **3** | **CoolingProof** | NYC confirms 618 forest-restoration polygons and 20,513 planted street segments. Post-intervention evaluation may differ from the WRI tool that models intervention potential. | Check actual `IniPlntSn` year, polygon area, usable imagery, and controls before running DiD. Restoration includes invasive-plant removal and planting; Landsat ST has missing-data issues, blockiness for small targets, and bias when NDVI changes. Initial results would be observed LST change, not air temperature or causal impact. |
| **4** | **FloodWitness** | CEMS API exposes version metadata, reason, current delivery and download time; QC can produce v2/v3. | Evidence that original version pairs are available is insufficient. OCHA-DAP already has a reported public CEMS ZIP archive, SHA-256 hashes, and an append-only transfer journal. Continue only if original v1→v2 pairs are found and diff/supersession graphs add concrete value. |
| **5** | **HourGuard** | A rules engine can be tested deterministically with consumption, interval, region, and duplicate cases. | EnergyTag already has a granular matching standard and accredited issuing organizations; consumption/generation data do not prove that an original certificate was issued or retired. Do not claim to find market fraud if all certificate cases are test fixtures. |

### Source assessment and evidence limits

- **MethaneResponse:** UNEP documentation confirms fields, but feedback only indicates UNEP received information, not physical repair. `Potentially ceased` means several hyperspectral observations without a validated plume, not causal attribution to operator action. Public data are generally delayed about 30 days. MARS itself already performs detection, attribution, notification, tracking, and AI-assisted analysis.
- **ShiftProof:** the archive repository says it captured the API twice hourly; about 90% of slots are normal and gaps are treated as gaps. Vintage snapshots are therefore possible, but that does not mean our backtest has run or passed.
- **CoolingProof:** dataset row counts are source metadata, not proof that all sites have enough dates, clean imagery, or comparable controls.
- **FloodWitness:** CEMS documentation says the site shows the latest version; its API describes the current version, not a complete history endpoint. OCHA's count is published by the archive owner and was not recalculated by the team.
- **HourGuard:** smart-meter and generation data can support matching simulation; real certificate auditing needs a registry and retirement status that had not been found.

### Working decision

**Test MethaneResponse first as a high-impact candidate, with ShiftProof as the safest fallback for experimental evidence.** If UNEP data profiling shows that the project only repeats the MARS dashboard/alerts or cannot show user differentiation, switch to ShiftProof. CoolingProof could move into the top two if screening roughly 20 sites finds enough suitable locations and controls. Do not select FloodWitness first until original-version archives and differentiation from OCHA are established.

Primary references: [Devpost rubric and tracks](https://ieee-climatechain-hack.devpost.com/), [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes), [2025 response figure and IEA guidance](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [NESO forecast archive](https://github.com/nmpowell/carbon-intensity-forecast-tracking), [NYC forest restoration sites](https://data.cityofnewyork.us/Environment/NYC-Parks-Forest-Restoration-Planting-Sites/ifu9-zqkd), [USGS surface-temperature caveat](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature), [CEMS API](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/emergency-response-data/), [OCHA-DAP flood archive](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-archive/), and [EnergyTag standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/).

**Audit limit:** source documentation/metadata were checked and two dataset audits ran in parallel. The UNEP CSV/ZIP archive was not downloaded and counted; no ShiftProof backtest, CoolingProof imagery/LST screening, or CEMS version-pair processing was performed. This ranking is therefore an experimental order decision, not a result claim.
