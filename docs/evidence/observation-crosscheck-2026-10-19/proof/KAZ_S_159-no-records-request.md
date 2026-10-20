# Observation claim cross-check — investigation draft

Analyst-defined scenario; no statement is attributed to an operator or publisher.

The pinned archive contains no linked detection records for KAZ\_S\_159 during 2020-10-29 to 2026-09-13 UTC \(inclusive\).

Result: Exact record counterexample found
3 exact archived record\(s\) contradict the defined archive-level statement. This does not establish whether equipment was repaired or identify the responsible operator.

Dataset: unep-mars-675417694883
Archive SHA-256: 675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43
Normalized input SHA-256: f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7
Policy: mars-observation-claim/1
Analysis digest: 0x7f753cffffb93edc57febadc487194cc922932332ea77c73fc075af292eec71e

## Exact counterexample records

- Plume ID: 82758651-76f4-4e06-b4ab-c247ce765192
  Source ID: KAZ\_S\_159
  Original timestamp: 2024-06-07T08:05:04 (UTC day: 2024-06-07)
  Reported point estimate: 591 kg/h; reported SD: 335 kg/h
  Satellite: EnMAP - DLR
  Coordinates: 43.41337, 52.91829
  Not a numeric threshold check

- Plume ID: 7529d451-018f-4da3-9114-59b76c3a3bcd
  Source ID: KAZ\_S\_159
  Original timestamp: 2026-06-05T07:40:02 (UTC day: 2026-06-05)
  Reported point estimate: 307 kg/h; reported SD: 66 kg/h
  Satellite: EnMAP - DLR
  Coordinates: 43.41337, 52.91829
  Not a numeric threshold check

- Plume ID: 941806b5-2afe-46ac-baac-a0230880cede
  Source ID: KAZ\_S\_159
  Original timestamp: 2026-07-11T08:12:14 (UTC day: 2026-07-11)
  Reported point estimate: 496 kg/h; reported SD: 226 kg/h
  Satellite: EnMAP - DLR
  Coordinates: 43.41337, 52.91829
  Not a numeric threshold check

## Next checks

- Inspect the exact source ID, plume ID, UTC date, satellite and reported uncertainty against the publisher archive.
- Ask whether the original statement concerns the same source location, time window, equipment and measurement definition as the witness records. Do not attribute dishonesty or failed repair automatically.
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
