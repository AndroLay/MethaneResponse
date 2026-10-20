# Observation claim cross-check — investigation draft

Analyst-defined scenario; no statement is attributed to an operator or publisher.

Physical methane mitigation at CAN\_S\_002 succeeded during 2020-10-29 to 2026-09-13 UTC \(inclusive\).

Result: Physical outcome requires document review
Satellite records, including their absence, cannot determine a physical repair outcome. Inspect attributable action records, facility identity, follow-up methods and observation opportunities.

Dataset: unep-mars-675417694883
Archive SHA-256: 675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43
Normalized input SHA-256: f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7
Policy: mars-observation-claim/1
Analysis digest: 0xf86f2113de5ccc02ada7034a50c1847a2981638d2c6ff2ef08c90b5b3f501662

## Exact counterexample records

No exact counterexample was found; this is not proof of physical repair.

## Next checks

- Inspect the exact source ID, plume ID, UTC date, satellite and reported uncertainty against the publisher archive.
- Obtain dated action records and attributable follow-up measurements, including observation opportunities, detection limits, units and uncertainty.
- Record an authorized human determination separately; this exploratory check does not create or anchor an audit revision.

## Dataset attribution

Contains data from UNEP IMEO Eye on Methane / MARS, licensed CC BY-NC-SA 4.0. Changes: normalized the source and plume CSV tables into JSON; source feedback remains source-level; unresolved plume links are retained; no mitigation confirmation is inferred.
License: CC BY-NC-SA 4.0
Publisher catalogue: https://methanedata.unep.org/download-dataset
Retrieved: 2026-10-14T06:10:12+00:00

## Limitations

- Analyst-defined scenario; not a statement attributed to an operator or publisher.
- Linked MARS records concern a source location, not necessarily the same equipment or responsible operator.
- The threshold checks reported point estimates. Estimate ± reported standard deviation is descriptive, not a calibrated confidence interval or an exceedance probability.
- Missing records are not zero emissions. Satellite detections are discrete and not continuous monitoring.
- Archive observation dates do not establish when a record became publicly available.
- An unsigned digest and policy replay do not establish authenticity or physical truth.
- Priority is an uncalibrated investigation aid, not a physical leak likelihood or future-flux forecast.
- The calibrated recurrence estimate predicts another linked MARS archive record within 365 days for a source already observed; it does not predict methane presence, emissions, repair, or mitigation.
- The observed flux trend summarizes discrete detection dates only; it is not extrapolated and is not a future forecast.
- A descriptive trend is emitted only with four or more numeric dates spanning at least 90 days; the method summarizes dated flux with a median pairwise Theil–Sen slope.
- Observation coverage varies by sensor, revisit schedule, geography, and cloud conditions; missing observations do not mean zero emissions.
- Source notification and feedback metadata do not verify recipient, repair, or emissions reduction.
- This small curated casebook has not been independently validated as a predictive model.

Draft only; not sent. This is an unsigned exploratory analysis, not proof of physical repair or a blockchain receipt. Review and publish an authorized audit separately.
