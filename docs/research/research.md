# IEEE ClimateChain Global Hackathon 2026 — Competition Research

**Research date:** 11 October 2026 (WITA)

**Scope:** organizer affiliation, rules and deadlines, COP31 context, four tracks, prototype opportunities, and risks/questions for organizers.

**Method:** two agents audited IEEE affiliation and Devpost rules/schedule in parallel; a third researched needs/data/MVPs across four tracks. I cross-checked their findings against primary sources before preparing this report. No registration, submission, or organizer contact occurred as part of this research.

**Later MethaneResponse research:** a separate audit of MethaneResponse/MARS and Carbon Mapper is in the [MethaneResponse audit](methane-response-audit.md). It found the candidate remains conditional; novelty of the alert-to-action workflow is not established because existing systems cover many similar functions.

**Technical update, 13 October:** [MethaneResponse evidence and evaluation research](methane-response-evidence-and-evaluation-2026-10-13.md) translates UNEP, IEA Global Methane Tracker 2026, and ALCE benchmark sources into product and evaluation decisions. Its conclusion limits the product to independent evidence auditing; it does not replace MARS detection or follow-up.

**Earlier shortlist, superseded:** the [candidate comparison memo](candidate-decision.md) first put GridWitness at the top for testing. Use the supersession note in that memo and the [deep research](swarm-deep-research-2026-10-11.md) as the later decision.

**Earlier candidate audit, 11 October:** [candidate audit with evidence and verification limits](swarm-candidate-audit-2026-10-11.md) compared earlier candidates and assessed CurtailmentCapture; its GridWitness-first conclusion was also superseded.

**Deeper swarm update, 11 October:** [deep swarm research](swarm-deep-research-2026-10-11.md) found direct prior art for GridWitness's core (GridCast), checked CEMS flood-product data, and added a CoolingProof audit. It supersedes GridWitness as the first candidate; no candidate has been proven best.

**FloodWitness audit, 11 October:** the [CEMS-version and OCHA prior-art audit](floodwitness-version-audit-2026-10-11.md) found that the CEMS Flood OCHA-DAP archive already provides a product inventory, SHA-256 hashes, and an append-only journal. FloodWitness cannot yet be called the best candidate. The AI-revision path is conditional because the availability of pre-revision v1 historical data for a leakage-free backtest has not been established.

## Executive summary

1. **Official evidence supports IEEE affiliation.** The IEEE Blockchain Technical Community calendar lists this event as an “IEEE BCTC Local Group Initiative” and links to Devpost. IEEE Türkiye Section lists IEEE Blockchain Türkiye Group as a local group and says it is approved by IEEE Blockchain and IEEE Türkiye Section. This supports participation by IEEE units; it does not prove that IEEE headquarters manages every detail or guarantees prize payments.
2. **Administrative information was inconsistent.** Overview and Rules differed on eligibility; the Devpost submission window conflicted with the Rules start-time instruction; IEEE and Devpost differed on Antalya/online; Overview listed prizes while Rules said “Prizes TBD.” A deadline question appeared in Discussions with no organizer response visible in the thread inspected.
3. **The event page requested a 3–5 minute demo video, public repository, a description of track/problem/solution/user/adoption, and a prototype/mockup/PoC.** It published five judging criteria without weights.
4. **The most plausible technical path is one track, one user, one end-to-end piece of evidence.** Blockchain can suit auditable change/transfer history; AI can suit tasks such as extraction or triage when it reduces measured work. Do not add either just for its label. Trace every impact claim to data and limits.
5. **No track had been selected.** The notes compare needs and demonstrable prototypes without locking the team into an idea.

## 1. Affiliation and credibility

### Official evidence found

- The [IEEE Blockchain Technical Community calendar](https://blockchain.ieee.org/events/) lists the hackathon for 5–25 October 2026 in Antalya, with engagement type “IEEE BCTC Local Group Initiative,” and links to Devpost.
- The official [IEEE Türkiye Section site](https://www.ieee.org.tr/ieee-blockchain-turkiye-group/) lists IEEE Blockchain Türkiye Group among *Local Groups*. The group's page says it was formed and approved by IEEE Blockchain and IEEE Türkiye Section.
- A training event with the ClimateChain name also appears on [IEEE vTools](https://events.vtools.ieee.org/m/571960). It lists a program leader/host matching the Devpost organizer list.

### Limits of that conclusion

This cross-check makes local IEEE affiliation appear strong and more substantial than simply using the name on Devpost. However, the BCTC calendar says **Antalya**, while [Devpost](https://ieee-climatechain-hack.devpost.com/) says **Online | Public**. UNFCCC scheduled COP31 in Antalya for 9–20 November 2026, while the hackathon ended on 25 October. The calendar location could relate to COP31 context or a finalist event, but the sources checked did not explain the connection. Devpost says the event aligns with COP31, but the evidence checked does not show that the hackathon is sponsored or endorsed by UNFCCC/COP31.

**Research assessment:** this is likely an event affiliated with IEEE Blockchain Türkiye/BCTC. That supports the local organizers' credibility; eligibility, schedule, location, and prizes still need confirmation.

## 2. Rules, schedule, and consequential gaps

### Schedule displayed by Devpost

MSK = UTC+3; WITA = UTC+8.

| Stage | Devpost time (MSK) | WITA |
|---|---:|---:|
| Submission opens | 5 Oct 2026, 07:00 | 5 Oct, 12:00 |
| Submission deadline | 25 Oct 2026, 17:00 | **25 Oct, 22:00** |
| Judging | 26 Oct, 09:00 – 8 Nov, 17:00 | 26 Oct, 14:00 – 8 Nov, 22:00 |
| Winners announced | 20 Nov, 09:00 | 20 Nov, 14:00 |

Source: [Devpost schedule](https://ieee-climatechain-hack.devpost.com/details/dates).

### Conflict register and evidence status

| Priority | Finding | Evidence and impact |
|---|---|---|
| **Critical** | Eligibility differs between Overview and Rules. | Overview says “students only,” requires participants to be above legal-adult age, excludes companies/professional organizations, and lists prohibited countries. Rules also allow academics/faculty, independent developers/startups, and environmental professionals/climate scientists. No prohibited-country list was visible. This could determine eligibility. [Overview](https://ieee-climatechain-hack.devpost.com/) · [Rules](https://ieee-climatechain-hack.devpost.com/rules) |
| **Critical** | Submission opening time conflicts with the listed window. | Schedule gives 5–25 October, closing 17:00 MSK (22:00 WITA). Rules say “Don’t submit before official start time which 8 AM PT on October 25.” On that date, 08:00 PDT is 23:00 WITA, one hour after the displayed deadline. [Schedule](https://ieee-climatechain-hack.devpost.com/details/dates) · [Rules](https://ieee-climatechain-hack.devpost.com/rules) |
| **High** | Mode/location do not align. | Devpost classifies the event as Online/Public; the IEEE BCTC calendar gives Antalya as the location. It is unclear whether there is a hybrid component, finalist attendance, or merely a calendar location label. |
| **High** | Prizes are not consistently/finally stated. | Overview lists US$1,500/US$1,000/US$500; Rules says “Prizes TBD.” No payout, team distribution, tax, or claim process was visible. |
| **Medium** | Training schedule/session numbering shifted. | Rules list several August–October dates; an organizer update said a planned session did not happen and promised new details. vTools has an introductory-session entry, but its page date field shows 9–20 August. Check Updates for recordings/replacements. |
| **Medium** | Submission form may have extra fields/uploads. | In a [Discussions thread](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window), a participant said there was no track selector and a required upload capped at 35 MB, and asked what the file should contain. This is a **participant report, not a verified official instruction**. No organizer reply to that question was visible in the inspected thread. |
| **Not published/visible** | Work, AI, and attribution policy. | The public sources checked did not explain prior work/code limits, AI-use policy, IP/license, data/asset permissions, or repository visibility requirements beyond requesting a public repository URL. Do not assume another hackathon's policy applies. |

The forum already had explicit participant questions about the submission window and whether blockchain is required for Climate Data. Use official written answers; do not treat participant speculation as rules.

## 3. Four tracks: need, MVP, and how to show evidence

The MVPs below are **research directions**, not official requirements or final team choices.

### A. Carbon Markets & Emissions Transparency

**Need supported by sources:** Paris Agreement Article 6 governs cooperation and trading of mitigation outcomes; Article 6.2 includes ITMO reporting/accounting. UNFCCC explains the need for *robust accounting*, *corresponding adjustments*, and systems that trace ITMOs from issuance through use/transfer. For voluntary carbon markets, ICVCM also identifies unique identification, transparency, independent verification, additionality, permanence, robust quantification, and double-counting prevention as Core Carbon Principles. Article 6 and voluntary markets are related carbon contexts, but their rules must not be conflated.

**Demonstrable MVP:** a project/credit record flow with unique IDs, evidence sources, verifier, statuses `draft–verified–transferred–retired`, and a simple duplicate check. Keep file hashes/change history on a ledger and sensitive documents off-chain. Show an audit log and one rejection/duplicate case.

**Evidence:** test duplicate IDs, detected changes, and the share of records with complete provenance; explain the users (project operator, verifier, buyer) and the decision being supported.

**Risks:** do not claim that the app “guarantees valid carbon credits,” ensures Article 6 compliance/additionality, or prevents all double counting. A ledger does not prove that field emissions measurements are correct; methodology verification and authority are still needed.

Sources: [UNFCCC Article 6](https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6), [UNFCCC Article 6.2](https://unfccc.int/process-and-meetings/the-paris-agreement/article-6/article-62), [Article 6 Reference Manual](https://unfccc.int/sites/default/files/resource/Article_6.2_Reference_Manual.pdf), [ICVCM Core Carbon Principles](https://icvcm.org/core-carbon-principles/), [GHG Protocol Scope 3 Standard](https://ghgprotocol.org/sites/default/files/standards/Corporate-Value-Chain-Accounting-Reporing-Standard_041613_2.pdf?pdf=download).

### B. Renewable Energy & Energy Trading

**Need supported by sources:** IEA Electricity 2026 identifies grid capacity as a bottleneck for connecting supply, loads, and storage, while wind/solar integration requires flexibility. Demand response, batteries, DER, and market coordination can help. Peer-to-peer models still depend on local technology readiness, policy, and markets.

**Demonstrable MVP:** a small-microgrid simulator with several prosumers, interval production/demand, surplus/deficit matching, and a cost/emissions summary using transparent assumptions. Open Power System Data can support historical replay; ENTSO-E API access requires registration/token and may consume setup time. A ledger could record transactions and energy-origin certificates. Use synthetic data only when labeled and show a supply-failure scenario.

**Evidence:** test energy balance (inflow/outflow), matched/unmatched transactions, and comparison with no-coordination baseline. Explain that this is a market simulation; it does not control the grid or create a legally valid electricity transaction.

**Risks:** do not claim grid stability, actual bill savings, or lawful P2P operation without meter data, an operator, and jurisdictional rules. Blockchain adds value only if it audits origin/settlement claims between parties; it does not replace smart meters or grid control.

Sources: [IEA Electricity 2026 — Grids](https://www.iea.org/reports/electricity-2026/grids), [IEA Electricity 2026 — Flexibility](https://www.iea.org/reports/electricity-2026/flexibility), [IEA — Unlocking the Potential of Distributed Energy Resources](https://www.iea.org/reports/unlocking-the-potential-of-distributed-energy-resources/executive-summary), [IEA — Digitalisation and Energy](https://www.iea.org/reports/digitalisation-and-energy), [IEA — Global Observatory on P2P Energy Trading](https://www.iea.org/articles/global-observatory-on-peer-to-peer-energy-trading), [Open Power System Data](https://data.open-power-system-data.org/time_series/), [ENTSO-E API token guide](https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2FAPI-Token-Management.pdf).

### C. Sustainable Supply Chains

**Need supported by sources:** [FAO AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en) uses forest monitoring and verified geospatial data as a basis for commodity-chain transparency. FAO traceability reporting highlights traceability gaps and the need for supply-chain actors to access information. For covered commodities, EUDR includes geolocation information in due diligence; check legal applicability separately and do not assume it applies to all commodities.

**Demonstrable MVP:** one commodity and several lot stages (farm → aggregator → processor → buyer) with lot ID, location/provenance, handoff evidence, and a geospatial risk check from public sources. Show lot lineage and flag missing/conflicting evidence. AI could extract fields from one sample document, then ask for human confirmation.

**Evidence:** trace one lot to its source, record custody transfer, reject missing required fields, and open map/evidence sources. Measure lookup time before/after on a demo fixture only if it is actually tested.

**Risks:** *traceability* does not automatically prove legality or deforestation-free status. Coordinates, supplier identity, map quality, image resolution, and observation date affect a risk flag's meaning. Do not claim “deforestation-free” merely because a document hash is on blockchain.

Sources: [FAO AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en), [FAO — Traceability and Transparency in Supply Chains](https://www.fao.org/transparent-supply-chains/news---events/news/detail/new-report--traceability-and-transparency-in-supply-chains/), [Regulation (EU) 2023/1115](https://eur-lex.europa.eu/legal-content/en/ALL/?uri=CELEX%3A32023R1115).

### D. Climate Data & Environmental Monitoring

**Need supported by sources:** the [WMO Hydromet Gap 2024 report](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all) highlights gaps in weather/climate/hydrological data collection, quality, availability, and exchange, including infrastructure and early-warning service limits in assessed countries. WMO is building GBON to strengthen more equitable exchange of basic observations. Public prototype datasets include NOAA GHCNd (daily station records with varying coverage/periods) and Copernicus ERA5 (reanalysis; grid estimates from models and observations, not local sensor readings).

**Demonstrable MVP:** choose one hazard and one user—such as a facility manager, farmer, or community officer. Combine one accessible observation/forecast source; validate timestamps, units, location, and missing values; show provenance and uncertainty; then produce an alert recommending a specific action. Show behavior when data are late or missing.

**Evidence:** test normal samples, outliers, stale timestamps, and unavailable sources; show how decisions change and where each datum came from. Measure classification/alert quality on a described small test set, not just the number of charts.

**Risks:** historical correlation is not a forecast; low-cost sensors can be biased; synthetic data must be labeled; do not promise disaster/loss prediction without evaluation. Blockchain can track data origin/changes, while analysis and prediction still need separate validation.

Sources: [WMO Hydromet Gap Report 2024](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all), [WMO GBON](https://public.wmo.int/activities/global-basic-observing-network-gbon), [NOAA GHCNd](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily), [Copernicus ERA5 hourly time series](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-timeseries?tab=overview), [IPCC AR6 WGII Chapter 17: Adaptation Monitoring, Evaluation & Learning](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-17/).

## 4. Connect the prototype to the rubric

Devpost publishes five criteria: **Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, Presentation & Communication/Storytelling**. No weights are published; do not assume they are equally weighted as a fact.

| Criterion | Evidence worth preparing |
|---|---|
| Climate impact | Real user, changed decision, clear metric/baseline, and inspectable assumptions. Do not turn app activity into a CO₂-tonnage claim without a method. |
| Innovation | Explain the existing bottleneck and why this solution differs. Describe AI/ledger roles specifically. |
| Technical execution | Run one data → validation/analysis → action → audit flow. Prepare an error case, demo reset, test fixture, and recorded data source. |
| Practical usefulness | Explain adoption path, data/tools needed, parties who must approve, and prototype limits. |
| Presentation | 3–5 minute video: problem/user → demo → evidence → impact and limits → repo/links. Ensure judges can access it. |

**Suggested argument structure:** field/data evidence → provenance and quality checks → decision/action → audit record. AI and blockchain add value when they reduce work or improve traceability in that flow; neither proves the truth of real-world input by itself.

## 5. Prototype-direction comparison (analysis, not official scoring)

| Track | Easiest to demonstrate | Main challenge | Plausible blockchain role |
|---|---|---|---|
| Carbon markets | Credit lifecycle and duplicate-record check on a limited example. | Complex Article 6 terms/methods/authority; compliance-claim risk. | Track IDs, evidence, transfers, and retirement. |
| Renewable energy | Production-demand matching in a small microgrid simulation. | Real meter/grid data and rules; simulation must be labeled. | Audit transactions/energy-certificate attributes. |
| Supply chains | Trace one lot with provenance and one geospatial risk layer. | Physical origin evidence and location/map accuracy. | Custody history and evidence changes. |
| Climate data | One-hazard dashboard with data-quality checks and alerts. | Choose an accessible source and test errors/uncertainty. | Track data origin, timestamps, and changes. |

**Selection after feasibility/form confirmation:** prioritize a track with user/data access and a complete single-flow demo. Without access to meters/energy partners, use an honest simulator. For carbon, limit scope to audit/provenance, not certification. For supply chains, show locations/evidence, not an automatic sustainability label. For climate data, focus on one local decision and test failures.

## 6. Questions for organizers before committing

1. Final eligibility: students only, or also academics, startups, independent developers, and climate professionals; minimum age; prohibited-country list; Indonesia's status.
2. Authoritative submission window: meaning of “8 AM PT Oct 25,” opening/closing time and timezone, and whether 5–25 October is correct.
3. Final format: online only, hybrid, or finalist/winner attendance required in Antalya.
4. Form requirements: track selector; purpose/format/content of the participant-reported 35 MB required upload; whether every submission must upload it.
5. Stack requirements: are both blockchain and AI required; are simulations/mockups sufficient for each track?
6. Project conditions: prior work/code, IP/license, AI use, third-party data/assets, and public repository.
7. Prizes: is US$3,000 total final; team distribution, taxes/fees, payment process and timing.
8. Judging: weights/scale, finalist count, live demo/presentation, tie-break, and result communications schedule.
9. Learning sessions: latest schedule, recordings/slides, and accessible mentorship.

The [Devpost Discussions tab](https://ieee-climatechain-hack.devpost.com/discussions) is the channel cited by organizer updates. The specific thread asking about timing and the form is [submission-window thread](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window).

## 7. Primary and authoritative sources

### Event and organizers

- [Devpost overview](https://ieee-climatechain-hack.devpost.com/)
- [Devpost rules](https://ieee-climatechain-hack.devpost.com/rules)
- [Devpost schedule](https://ieee-climatechain-hack.devpost.com/details/dates)
- [Devpost announcements](https://ieee-climatechain-hack.devpost.com/updates)
- [Devpost discussion: window, track, blockchain, upload](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window)
- [IEEE BCTC event calendar](https://blockchain.ieee.org/events/)
- [IEEE Türkiye Section: IEEE Blockchain Türkiye Group](https://www.ieee.org.tr/ieee-blockchain-turkiye-group/)
- [IEEE vTools: ClimateChain Session 1](https://events.vtools.ieee.org/m/571960)
- [UNFCCC COP31](https://unfccc.int/cop31)

### Domain and technical sources

- [UNFCCC Article 6](https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6)
- [UNFCCC Article 6.2](https://unfccc.int/process-and-meetings/the-paris-agreement/article-6/article-62)
- [UNFCCC Article 6.2 Reference Manual](https://unfccc.int/sites/default/files/resource/Article_6.2_Reference_Manual.pdf)
- [ICVCM Core Carbon Principles](https://icvcm.org/core-carbon-principles/)
- [GHG Protocol Scope 3 Standard](https://ghgprotocol.org/sites/default/files/standards/Corporate-Value-Chain-Accounting-Reporing-Standard_041613_2.pdf?pdf=download)
- [IEA Electricity 2026 — Grids](https://www.iea.org/reports/electricity-2026/grids)
- [IEA Electricity 2026 — Flexibility](https://www.iea.org/reports/electricity-2026/flexibility)
- [IEA: Unlocking the Potential of Distributed Energy Resources](https://www.iea.org/reports/unlocking-the-potential-of-distributed-energy-resources/executive-summary)
- [IEA: Digitalisation and Energy](https://www.iea.org/reports/digitalisation-and-energy)
- [IEA: Global Observatory on Peer-to-Peer Energy Trading](https://www.iea.org/articles/global-observatory-on-peer-to-peer-energy-trading)
- [Open Power System Data](https://data.open-power-system-data.org/time_series/)
- [ENTSO-E API token guide](https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2FAPI-Token-Management.pdf)
- [FAO: AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en)
- [FAO: Traceability and Transparency in Supply Chains](https://www.fao.org/transparent-supply-chains/news---events/news/detail/new-report--traceability-and-transparency-in-supply-chains/)
- [EU Regulation 2023/1115](https://eur-lex.europa.eu/legal-content/en/ALL/?uri=CELEX%3A32023R1115)
- [WMO: Hydromet Gap Report 2024](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all)
- [WMO Global Basic Observing Network](https://public.wmo.int/activities/global-basic-observing-network-gbon)
- [NOAA GHCNd](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily)
- [Copernicus ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-timeseries?tab=overview)
- [IPCC AR6 WGII Chapter 17: Adaptation Monitoring, Evaluation & Learning](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-17/)

**Research limit:** event findings reflect pages checked on 11 October 2026. Sites/rules may change; written organizer answers and the current submission form must be checked again before submission. This report does not confirm registration, individual eligibility, prizes, or COP31 endorsement.
