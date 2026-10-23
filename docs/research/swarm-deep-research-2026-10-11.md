# Deep Swarm Research: IEEE ClimateChain 2026 Candidates

**Checked:** 11 October 2026 (WITA)

**Purpose:** select candidates using inspectable evidence rather than names, invented scores, or appealing narratives.

**Status:** no candidate has been proven a winner. The original GridWitness approach was downgraded to **NO-GO**. Flood Evidence QA had the most concrete artifacts for a proof sprint, but remained conditional and was not a winning recommendation.

**Update after FloodWitness review:** do not treat the Flood Evidence QA shortlist as the current decision. The [CEMS-version/OCHA-DAP prior-art audit](floodwitness-version-audit-2026-10-11.md) found a close CEMS flood archive and uncertainty about pre-revision v1 features. FloodWitness is also not proven to be the best candidate; all candidate statuses remain conditional.

## Executive conclusion

The swarm audit changed the earlier conclusion.

1. **GridWitness should no longer be called the leading candidate.** Public [GridCast](https://github.com/Ahmed-KA-Abdalla/gridcast) already covers much of the proposed core: capture NESO forecasts at issue time, build two-hour flexible-load decisions, score regret against outcomes, test baselines and gradient boosting, and run periodic evaluation. GridCast is not a known IEEE ClimateChain participant; it is product/engineering prior art that substantially weakens the novelty claim. Its README reports certain tests/results, but I did not reproduce those numbers.
2. **A small GridWitness experiment was reconstructed, but it proves only a narrow point.** For 208 decisions in a one-month archive, “choose the window with the lowest NESO forecast” produced lower mean intensity score than running work immediately. This is not an AI test, on-chain result, proof of marginal emissions avoided, or comparison with GridCast.
3. **Flood Evidence QA had the most concrete data evidence at that time.** A Copernicus EMS package for one event was readable, archive hash verified, ZIP checks passed, and the flood layer contained 1,291 polygons. Labels were semi-automatically extracted; metadata listed 30 m RMSE and 1:50,000 scale. This is useful operational reference data, not field ground truth. CEMS already maps floods, and [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger) had completed a satellite-imagery/blockchain claims MVP. Therefore Flood Evidence QA was not proven novel or useful to users.
4. **CoolingProof merited research, not a winning claim.** NYC provides tree inventory with location and `PlantedDate`; USGS provides Landsat surface temperature; WRI already maps heat risk and simulates tree/cool-roof interventions. The possible gap is auditing outcomes after planting. No cohort analysis, paired imagery, or tested counterfactual result existed. Surface temperature is also not air temperature, thermal comfort, human exposure, or health benefit.
5. **MethaneResponse addresses a measurable climate problem, but its workflow overlaps MARS.** IEA says about 12% of MARS notifications in 2025 received a response and publishes a five-step response framework. This establishes a response problem, not that a new application or blockchain will raise the response rate.
6. **The submission list was incomplete, but visible participant projects existed.** The Devpost gallery remained unpublished. Public project-page search found three pages associated with the event: CarbonShield, AION V3, and BioCyclic. This is not an official complete list; BioCyclic is an older project listed in multiple hackathons.

### Defensible decision

- **Original GridWitness:** stop as the primary choice.
- **Candidate most ready for testing from existing evidence:** Flood Evidence QA, because real data artifacts had been inspected.
- **Candidate with a possible differentiator worth testing:** CoolingProof, focused on post-planting outcomes, not planting-priority maps.
- **No basis to call either strongest overall or promise Top 3.** User value, sufficient novelty, and blockchain benefit were unproven for every candidate.

## Method and audit limits

### Evidence labels

- **Directly verified:** primary page opened or data artifact downloaded/inspected in this audit.
- **Swarm-verified:** agent checked the source/artifact; note when I did not independently repeat the same access.
- **Project-owner claim:** metric/capability stated by repository/product owner; not remeasured by me.
- **Inference:** rubric-fit judgment or hypothesized user benefit.
- **Unknown:** user data, license, impact, or differentiation remains unverified.

Four subagents separately audited energy-candidate reproduction, flood dataset validation, novelty/rubric red-team, and independent alternative-candidate search. I rechecked primary pages and recalculated some properties of local data artifacts. Agents did not edit the workspace.

### Official rubric

Devpost lists five criteria: **Climate Impact**, **Innovation & Creativity**, **Technical Execution**, **Practical Usefulness**, and **Presentation & Communication**. No numeric weights were visible. Submission asks for problem/solution/user/adoption explanation, 3–5 minute demo video, public repository, and prototype/mockup/PoC. Displayed deadline: 25 October 2026, 17:00 MSK (22:00 WITA). No field-survey requirement was listed. Source: [official hackathon page](https://ieee-climatechain-hack.devpost.com/).

The [Project Gallery](https://ieee-climatechain-hack.devpost.com/project-gallery) still said organizers had not published it. Public search found project pages that associated themselves with the event. Devpost's [gallery guide](https://help.devpost.com/article/80-what-is-the-project-gallery) says projects appear after organizers enable and moderate the gallery, typically after the deadline. Indexed pages can be reviewed, but the complete participant/submission list cannot be confirmed.

## Decision-changing finding: GridWitness and GridCast

### Existing work

Public [GridCast](https://github.com/Ahmed-KA-Abdalla/gridcast) contains source/test/workflow structure and a README covering:

- capture NESO forecasts with capture times to avoid using revised post-decision forecasts;
- choose two-hour flexible-work slots in a 24-hour window;
- compare forecasts with outcomes, immediate, oracle, and seasonal baselines;
- forecast correction, gradient boosting, regret evaluation, drift, and periodic evaluation page;
- chronological splits to avoid information leakage.

Red-team agent checked Git history and reported the initial commit on **20 August 2026** (`a90ebab…`), before hackathon submission opened. The agent also saw passing public CI on 24 September ([GitHub Actions run](https://github.com/Ahmed-KA-Abdalla/gridcast/actions/runs/35946027076)). I opened the repository and read its GitHub specification/README but did not clone it or run its test suite.

GridCast README reports **48,048 settled half-hours, 363 forecast issues, 322 decisions**, model results, and **328 tests**. These are **repository-owner claims**; I did not run the suite or reproduce all numbers. The red-team agent inspected source/tests/workflow and checked public GitHub Actions; those runs are not my local test results.

This is overlap in hypothesis/evaluation pipeline, not a claim that both implementations are identical. GridCast does not document blockchain precommit/reveal, multi-job capacity optimization, or a workload executor as proposed by GridWitness. Those might differentiate, but user value remains unproven. In particular, there is no evidence users need a public ledger for precommit or that on-chain commitment improves results over signed records/ordinary audit.

NESO describes national intensity as generation-weighted average emissions relative to demand, adjusted for transmission losses. WattTime distinguishes average signals for accounting from marginal signals aimed at estimating changes caused by load shifting. Therefore GridWitness results using NESO should be called **average-intensity-weighted operational metrics**, not causally avoided emissions. Sources: [NESO methodology](https://www.neso.energy/document/373936/download), [WattTime signal overview](https://watttime.org/data-science/data-signals/).

Carbon Aware SDK also finds lower-forecast-intensity windows and accepts workload duration; its documentation explains forecasts and `optimal carbon intensity windows`. Source: [Carbon Aware Library](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library).

### Limited reproduction on forecast archive

I reread the SQLite artifact produced in the agent spike and recalculated its hash and summary scenario:

| Attribute | Checked result |
|---|---:|
| File | `national_2026-09.sqlite` |
| SHA-256 | `980847c5f39cadd425808726a4d61a9f38589d9e7e18620e7b680cebde588d6e` |
| Size | 606,208 bytes |
| Vintage rows | 29,563 |
| Half-hour targets | 1,440 |
| Capture times | 234 |
| Episodes meeting data-availability rule | 208, across 30 days |
| Scenario | Four half-hour workload slots; 12-hour choice horizon |
| Immediate mean score | 422.81 |
| NESO-Greedy mean score | 331.97 |
| Greedy wins / losses / ties | 144 / 29 / 35 |
| Forecasts issued after decision time | 0 in evaluated episodes |

Reconstruction chose the latest forecast with `capture_utc <= decision_time`, then scored four workload slots against the latest available actual. Score is the sum of intensity values per slot; it is not tonnes CO₂ without an energy profile, and still does not express causal marginal impact. Repeated episodes are highly time-correlated; this spike had no confidence interval or cross-season evaluation.

**Conclusion:** these figures show that the dataset can support a demonstration comparing one baseline scenario. They do not prove GridWitness is differentiated, AI adds value, blockchain is needed, or the project reduces actual emissions.

### GridWitness decision

**NO-GO for the original “AI carbon-aware scheduler + blockchain” pitch.** A variant called ShiftProof could be tested only if focused on auditing claims using marginal signals and pre-outcome commitment. WattTime offers free noncommercial research access with approval; its data page requires access applications and terms prohibit redistribution. Verify signal access, region, forecast history, demo/public-repo terms, and a user who needs the audit first. Sources: [WattTime for Research](https://watttime.org/data-science/for-research/), [Noncommercial Agreement](https://watttime.org/noncommercial-agreement/), [Data Plans](https://watttime.org/docs-dev/data-plans/).

## Flood Evidence QA: real data, but not ground truth

### EMSR838 product inspection

Validation agent downloaded official Copernicus EMS product for EMSR838 AOI01. I rechecked the downloaded files available in the temporary workspace:

| Attribute | Checked result |
|---|---|
| ZIP | 20,563,514 bytes |
| SHA-256 | `2ae69c2a70da00d4a78361cde7879f3004d4c8d24ea708b98d63fd8a910b0fe0` |
| Archive test | `zipfile.testzip()` = OK |
| Archive members | 37 |
| GeoJSON layer `observedEventA` | 1,291 features |
| Feature attributes | `5-Flood`, `Riverine flood`, `Flooded area`, `Semi-automatic extraction` |
| XML quality metadata | Analysis scale 1:50,000; MMU 5,625 m²; RMSE 30 m |

Product sources: [EMSR838 activation API](https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR838), [GeoJSON observed flood extent AOI01](https://rapidmapping-viewer.s3.eu-west-1.amazonaws.com/EMSR838/AOI01/DEL_PRODUCT/EMSR838_AOI01_DEL_PRODUCT_observedEventA_v1.json), [CEMS API guide](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/).

This proves a reference layer can be processed; it is **not** field validation, a 10 m pixel label, or a model test. Agent found a Sentinel-1 input close to the product date. If that same image is model input and CEMS map is target, the result measures agreement with the CEMS product, not independent accuracy.

### EMSR933 product-status inspection

I rechecked the agent-downloaded API response (`GET ...public-activations/?code=EMSR933`): 34,456 bytes, SHA-256 `07f5dc5818c94e1f2326cf9eb22b9edc7e49b8292df4b209b348bb5049b933ae`. Counts under `results[0].aois[*].products[*]`:

- 8 AOIs, 18 product items;
- 7 status `F`;
- 11 status `N`;
- among `N`, 10 reasons `Because of remote sensing limitations`, and 1 `Because of no change of situation detected`.

This is one ongoing activation, not a CEMS-wide failure rate. It shows that an audit system should distinguish results, sensor limits, and unavailable data. CEMS documentation says API contains product metadata, download links, and version/quality metadata; source: [CEMS data harvesting](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/).

### Prior art and possible differentiation

- CEMS itself creates and publishes flood delineation/damage products. A generic “AI flood detector from satellite imagery” directly overlaps that service.
- [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger) says the project completed in March 2020 and built an MVP for automated satellite-based claims management, field-visit GNSS data, and blockchain contracts.
- [Floodbase](https://www.floodbase.com/use-cases-old/parametric-flood-insurance) offers flood intelligence for underwriting and parametric-insurance triggers. Performance claims on its page are vendor claims; this audit did not test the product.

A possible test is a **cross-version/source evidence quality and uncertainty audit**: show what was mapped, what could not be analyzed, which sensor inputs were used, and changes after human review. This has not been shown to be needed by emergency-response agencies. Do not position it as flood prediction, loss proof, auto-payout, or loss reduction.

### Flood Evidence QA gate

Continue only if a short data sprint establishes all of these:

1. At least five different flood activations have processable products/metadata. Five is our chosen engineering gate for event-based splits, not an industry standard.
2. Split by activation; do not randomly place pixels from the same event in train and test.
3. If model input uses the same Sentinel-1 image as CEMS product input, report **agreement with CEMS reference**, not ground-truth accuracy. Independent claims need a different evaluation source or licensed field data.
4. Explicitly classify `flooded`, `not analysed/limited`, and `unknown`. Unlabeled area must not be treated as dry.
5. Test that changing an evidence version changes its hash and that review never deletes the original record.
6. If no cross-party ledger use is needed and AI fails to beat a clear baseline, do not keep AI/blockchain just to meet a technology checklist.

## New candidate: CoolingProof

NYC Open Data's [Forestry Tree Points](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap) dataset page reports 1.12 million rows, including `PlantedDate` and `Location`; [MillionTreesNYC Block Planting Locations](https://data.cityofnewyork.us/Environment/MillionTreesNYC-Block-Planting-Locations/vr8g-vfny) records about 20,513 street segments with planting season. USGS provides [Landsat Collection 2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature) globally.

The product opportunity is **post-planting outcome audit**, using cohorts by location/planting date and preregistered control locations. AI might help construct controls/counterfactuals, while a ledger records cohort, protocol, input, model version, and result so report changes are visible.

However, [WRI Cool Cities Lab](https://www.wri.org/data/cool-cities-lab) already identifies priority locations and simulates potential tree-planting/cool-roof impacts; it launched 17 March 2026 and was developed with city-official input. Cool Cities Lab estimates some thermal-stress/air-temperature indicators; CoolingProof differs only if it credibly measures post-intervention outcomes.

Validation limits:

- I did not count how many tree records have valid planting dates/locations or how many paired clear Landsat scenes exist before/after. Shell API probe failed because DNS was unavailable; full availability is unverified.
- Landsat measures **land surface temperature**, not air temperature or bodily exposure. USGS product has QA/uncertainty bands and retrieval caveats; use QA masking/official scale conversion and do not equate LST with health.
- Post-planting LST change is not automatically a causal tree effect. Weather, surviving canopy, surface change, acquisition timing, and site selection matter. Matched controls/difference-in-differences can produce an observational estimate, not a randomized experiment.
- Blockchain matters only if different parties need to approve/audit protocol/results. No evidence showed users demand blockchain for tree audits.

**Decision:** run only the 24-hour data gate; do not announce CoolingProof as best before finding enough dated locations and paired imagery. Its potential differentiator is clearer than a general mangrove dashboard, but validation is harder.

## Other candidates reviewed

| Candidate | Verified evidence | Why it was not a leading choice |
|---|---|---|
| **MethaneResponse** | IEA reported about 12% of MARS notifications received responses in 2025 and published a five-step flow from assignment to documentation; [IEA report](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system). | MARS already handles notifications, response status, follow-up, and result publication. Ledger does not prove an operator responded. Carbon Mapper STAC probe/attribution counts reported by agents were not reproduced by me; treat as root-unverified. Continue only if a user confirms a specific interoperability gap. |
| **HourGuard** | [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/) explicitly covers hourly/sub-hourly matching, meter/timestamp data, and fraud-prevention aspects. | Hourly matching and certificate auditing are already standardized. Integration/cross-registry evidence could be an opportunity, but access to real registry/certificate data for this MVP was not established. |
| **MangroveProof** | UNESCO [Mangrove Restoration Tracker Tool](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt) includes pre-restoration baseline, intervention, and post-restoration monitoring. | Basic mangrove monitoring exists. Imagery without field data does not prove seedling survival or carbon sequestration. |
| **ForestPassport** | European Commission has [EUDR Information System](https://green-forum.ec.europa.eu/deforestation-regulation-implementation/information-system-deforestation-regulation_en); FAO WHISP performs plot-level risk screening. | Without real lot/supplier data, traceability remains a simulation; blockchain does not prove physical shipment. |
| **FlexReceipt / Demand Response M&V** | FERC explains demand response/metering; OpenADR publishes signal protocol. | Search found no public dataset combining event time, actual participant meter, and comparison period. Synthetic load profiles do not prove actual kWh reduction during an event. |
| **CurtailmentCapture** | IEA recognizes curtailment growth and need for flexibility. | Ex-post data do not prove scheduled load would avoid curtailment. CAISO data/settlement were not tested here. |

## Decision matrix without invented scores

“High/medium/low” below is qualitative assessment against cited evidence, not judge scoring or win probability.

| Rubric area | Flood Evidence QA | CoolingProof | ShiftProof | MethaneResponse |
|---|---|---|---|---|
| Climate impact | Real flood-adaptation problem; prototype benefit to losses unproven. | Urban heat/tree planting relevant; LST change is not health/causal impact. | Emissions relevance only with marginal MOER and compatible license. | Response gap measurable; app has not shown added response. |
| Innovation | Low–medium until QA value beyond CEMS/EO-Claim Ledger is shown. | Potential post-intervention audit; WRI overlaps with planning/pre-impact. | Low for scheduler; marginal-claim audit more plausible, but blockchain need unproven. | Low if it repeats MARS workflow. |
| Technical execution | Operational dataset downloaded/inspected; no cross-event model/evaluation yet. | Dataset exists at portals; paired imagery/analysis not run. | Baseline testable; MOER access and data rights for public repo/demo are gating. | Plume data reported by agent probe; attribution/AI not root-verified. |
| Practical usefulness | Target: mapping/emergency team; ledger need unproven. | Target: city/funder; WRI already covers part of planning. | Target: workload auditor/operator; users/claim dispute unconfirmed. | Target: focal point/operator; authority workflow and MARS already exist. |
| Presentation | Visually strong and can show data limits. | Strong if valid before/after pairs are found. | Technically clear but similar products exist. | Strong impact story; high overclaim risk. |
| Status | **First proof sprint** | **24-hour data gate, then decide** | **NO-GO until legal marginal-data access and user need** | **Conditional on an MARS-unmet user gap** |

## Recommended actions

### If one candidate must be built first

Start **Flood Evidence QA** as a small proof of concept, not a final-product promise. The defensible reason is that an operational CEMS dataset was actually inspected, including reference map, quality metadata, and “remote sensing limitations” status. That enables an honest demo of evidence and unknowns.

Limit the project claim to:

> “We audit completeness, source, version, and limits of flood-map evidence products so reviewers can see what was measured and what remains unknown.”

Do not claim “predicts floods,” “determines flood truth,” “proves losses,” “triggers safe payout,” or “reduces casualties/losses.” Retain this candidate only if AI triage beats a baseline and there is clear user value. Otherwise, do not submit cosmetic AI/ledger.

### Final selection gates

Select a candidate only if it passes all four:

1. **Data:** reproducible ingestion, clear origin/license, and no leakage from using evaluation target as input.
2. **Algorithm value:** AI/ML beats simple baseline on proper holdout; otherwise remove AI differentiation claim.
3. **Usefulness:** a real actor/decision is supported; without it user story remains a hypothesis.
4. **Blockchain:** there is a cross-party trust boundary or pre-outcome commitment need. Demonstrate detectable tampering and explain ledger guarantees/limits.

If no candidate passes, the honest choice is a narrowly scoped PoC submission, not renaming a candidate or inserting unmeasured impact figures.

## What remains unknown

- Complete submission list is not visible. Public search found three related project pages, but Devpost gallery was unpublished and web search cannot establish completeness.
- No official numeric weights for the five criteria; a weighted rubric ranking cannot be computed from official sources.
- No user interviews and no operator/partner approved product use.
- Not tested whether users need on-chain hashes versus signed artifacts, database audit, or timestamped repository.
- No model/AI results exist for Flood Evidence QA, CoolingProof, or MethaneResponse.
- No verified emissions-reduction, flood-loss-reduction, or health-benefit claim exists for these projects.
- No candidate has a calculable win or Top 3 probability from available data.

## Addendum — public submission-page audit, 11 October 2026

### Scope limit

I checked the official gallery and searched for Devpost project pages explicitly linking themselves to IEEE ClimateChain. Gallery remained hidden; participant tab required login. Results below are **three public pages found**, not total submissions. Participant discussion of ENSO analysis was excluded because it was a forum question, not a submission.

### Projects found

| Project | Visible public-page content | Initial rubric assessment | Evidence still insufficient |
|---|---|---|---|
| [CarbonShield](https://devpost.com/software/carbonshield) | REDD+ credit-verification sensitivity audit; ex-ante model; six stress-test dimensions; audit hash/EVM anchor. Page links repo and demo video. Closest to Carbon Markets, although page does not explicitly select a track. | **Strongest implementation evidence found among public submissions.** Problem has strong scientific basis: a *Nature Communications* study of 44 REDD+ projects reports aggregate avoided-deforestation claims far exceed independent estimates. Repo includes source, tests, model results, 44 audit records, frontend, and contract. | Owner-reported results not all independently reproduced. Model dataset has only 43 labeled outcomes; LOCO results weaker than LOPO. Deployment artifact says `local-dev`, not public network. Main README still says Phase 1 in progress while Phase 2 doc says tests complete. Contract source imports OpenZeppelin using absolute Windows paths; `client.py` has placeholder function; suite was not rerun in this audit. Code exists, but that does not verify all page claims from a clean checkout. |
| [AION V3 — Sovereign Value OS](https://devpost.com/software/aion-v3-sovereign-value-os) | Describes data → opportunity → decision → execution → evidence → verified value. Visible examples focus on inventory, logistics, suppliers, margin, and capital; environment is framed as an extension. Page lists technologies including Ethereum/Hyperledger and AI. | “Expected value vs verified value” is easy to understand; could fit supply chain if climate use case becomes specific. | On inspected public page, climate impact was future direction. We found no public repo/demo to test stack/results. This means evidence was not visible on inspected page, not proof artifacts do not exist. |
| [BioCyclic HealthNet](https://devpost.com/software/biocyclic) | Proposes battery bioleaching using acids from citrus waste, metal recovery, and health-risk mapping. Page has video; project began May 2026 and appears in multiple hackathons. | Battery waste/circular chemistry is compelling storytelling; project is more chemistry-centered than AI/blockchain. | `>90%` recovery-efficiency claim, profit projection, and payback lack experimental or inspectable economic model evidence on page. “Digital layer” is conceptual; blockchain not listed among technologies used. IEEE ClimateChain association timing is unclear; we label it an older cross-event project. |

### Implications for our candidates

- **CarbonShield raises the competitive baseline.** Flood Evidence QA cannot just be “environmental data + stress test + hash.” To differ, it must show specific flood-product audit value: measurable distinction between mapped result, sensor limit, and unknown; version/source conflicts; and testable human-review workflow across multiple activations.
- **Flood Evidence QA may have domain opportunity** because the visible CarbonShield submission focuses on REDD+ credits rather than flood mapping. But CarbonShield looked technically more ready; Flood Evidence QA had only operational dataset, no model, cross-event evaluation, or validated user.
- **CoolingProof could differ more from the three found pages**, but had no tested cohort result or image pairs. Domain uniqueness does not fill technical-execution gap.
- **GridWitness/ShiftProof, MethaneResponse, and HourGuard** still face external prior art documented above. No similar submission found in web index is not proof other participants do not work on it.

**Interim conclusion:** CarbonShield had the thickest inspectable artifact evidence among submissions found. That does not prove it will win. For our project, Flood Evidence QA remained the most plausible to test further, only if a proof sprint shows distinct, measurable QA value. Recheck after gallery publication or new public pages.

## Main sources

- [IEEE ClimateChain: rules, rubric, and submission](https://ieee-climatechain-hack.devpost.com/)
- [Devpost submission gallery](https://ieee-climatechain-hack.devpost.com/project-gallery)
- [Devpost guide: when projects appear in gallery](https://help.devpost.com/article/80-what-is-the-project-gallery)
- [CarbonShield submission](https://devpost.com/software/carbonshield)
- [CarbonShield public repository](https://github.com/saideeksha19/carbonshield)
- [AION V3 submission](https://devpost.com/software/aion-v3-sovereign-value-os)
- [BioCyclic project page](https://devpost.com/software/biocyclic)
- [Swinfield et al., Nature Communications (2026)](https://www.nature.com/articles/s41467-026-71552-3)
- [GridCast public repository](https://github.com/Ahmed-KA-Abdalla/gridcast)
- [NESO carbon-intensity methodology](https://www.neso.energy/document/373936/download)
- [WattTime marginal/average data signals](https://watttime.org/data-science/data-signals/)
- [WattTime research access](https://watttime.org/data-science/for-research/)
- [CEMS API harvesting guide](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/)
- [EMSR838 activation metadata](https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR838)
- [EMSR838 AOI01 flood GeoJSON](https://rapidmapping-viewer.s3.eu-west-1.amazonaws.com/EMSR838/AOI01/DEL_PRODUCT/EMSR838_AOI01_DEL_PRODUCT_observedEventA_v1.json)
- [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger)
- [IEA MARS response framework](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system)
- [NYC Forestry Tree Points](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap)
- [NYC MillionTreesNYC planted blocks](https://data.cityofnewyork.us/Environment/MillionTreesNYC-Block-Planting-Locations/vr8g-vfny)
- [USGS Landsat Collection 2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature)
- [WRI Cool Cities Lab](https://www.wri.org/data/cool-cities-lab)
- [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/)
