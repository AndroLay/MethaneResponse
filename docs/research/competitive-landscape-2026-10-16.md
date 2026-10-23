# Public IEEE ClimateChain Comparison and MethaneResponse Position

**Checked:** 16 October 2026, WITA.

**Repository baseline:** `a82e2eee99bb79327f859f304f2f5d5939f07041`, with local uncommitted documentation changes.

**Conclusion:** the core local prototype is available, but there is no evidence that MethaneResponse's features, research, or benefits are best among all participants.

## Scope and how to read these findings

- Ten project pages below were publicly traceable and displayed **Submitted to → IEEE ClimateChain Global Hackathon**, linking to the correct event domain when checked.
- The [official gallery](https://ieee-climatechain-hack.devpost.com/project-gallery) still showed a notice that organizers had not published it. This is not a full inventory of submissions, a final eligibility list, or judging results.
- Two independent reviewers split the research, then a coordinator combined it with checks of PLUME, Kanopy, domain sources, and repository status. This is not judging by competition judges.
- Competitor descriptions and experimental results come from creator-maintained pages/repos. A linked repo/demo does not mean its code was run or results reproduced. Some previews failed through the reader; that failure does not prove the site is down.
- No product test, transaction, deployment, participant/organizer contact, or submission occurred during this research. Local MethaneResponse evidence remains bound to the dates/revisions in [implementation status](../release/current-implementation-status.md).

## Ten confirmed public projects

| No. | Project / Devpost source | Published focus | Linked artifacts | Important evidence limits |
|---|---|---|---|---|
| 1 | [Kanopy](https://devpost.com/software/kanopy) | Measure forest/carbon stocks from satellite data, show uncertainty, and register results on blockchain. | [Verifier](https://kamhq.com/kanopy/verify/). No separate repository was visible on the inspected page. | Hashes check result integrity; measurement accuracy still needs validation. Transaction/testing claims were not reproduced. |
| 2 | [PLUME: Earth's First Climate Bug-Bounty Network](https://devpost.com/software/plume-earth-s-first-climate-bug-bounty-network) | Historical methane data, investigation, escrow funding, repair evidence, verifier decisions, and settlement. | [GitHub](https://github.com/KaavinB/PLUME); page/repo also link a preview. | Interventions, participants, and demo funds are simulated. README limits preview to a snapshot without an active backend and describes AI as a fake-provider test. |
| 3 | [CarbonTwin](https://devpost.com/software/carbontwin) | Cross-registry overlap search and release stewardship: data-version updates, rescreening, AI adjudication, validation, and Merkle anchoring. | [Demo](https://hyunsikparker.github.io/carbontwin/), [original project GitHub](https://github.com/HyunsikParker/carbontwin), video; page mentions new release development on GitLab. | A shared vintage without a serial number does not prove double counting. New-release scope was not audited from code/execution. |
| 4 | [CarbonShield](https://devpost.com/software/carbonshield) | Stress-test REDD+ credit verification assumptions across six dimensions. | [GitHub](https://github.com/saideeksha19/carbonshield), video. | README still says research/data work is in progress; Devpost implementation claims were not reproduced. Output is not a fraud label. |
| 5 | [Mizan — the carbon passport for EU-bound exports](https://devpost.com/software/mizan-the-carbon-passport-for-eu-bound-exports) | Shipment-level emissions passport: document extraction with citations, calculation, human review, and a Merkle record on Hedera. | [Demo](https://mizan-cbam.vercel.app/), [GitHub](https://github.com/abubokkor-cse/Mizan), video. | Reported evaluation uses seven documents and is not independent. Demo uses a simulated chain. Live/testnet claims were not verified in this research. |
| 6 | [Uncounted: Verifiable Ledger for Wildfire & War Emissions](https://devpost.com/software/uncounted-verifiable-ledger-for-wildfire-war-emissions) | Estimate wildfire emissions and conflict attribution from NASA FIRMS data, models, uncertainty, and a ledger. | [GitHub](https://github.com/mlkmas/uncounted), video. | Conflict attribution is a model result, not a direct measurement. Public testnet and added weather data are described as future work. |
| 7 | [Grounded — Test Tomorrow Before It Arrives](https://devpost.com/software/grounded-test-tomorrow-before-it-arrives) | Digital twin for testing Jaipur hospital/community microgrid resilience under climate/power-failure scenarios. | [Demo](https://grounded-peach.vercel.app/), [GitHub](https://github.com/codewithanshuman/grounded). | The 500-scenario experiment and battery-backup consequences are creator-reported simulations, not validation at a real hospital. |
| 8 | [AquaQuest](https://devpost.com/software/aquaquest) | Citizen science for water: explore locations, submit observations/photos, view One Health information, and contribute as a community. | [Demo](https://luzaynarahman-dot.github.io/AquaQuest/), [GitHub](https://github.com/luzaynarahman-dot/AquaQuest). | Described version uses demo content, mock API, and local storage. Visual observations do not replace laboratory testing. |
| 9 | [AION V3 — Sovereign Value OS](https://devpost.com/software/aion-v3-sovereign-value-os) | Separate estimated opportunity value from value proven after action. | Embedded video; no separate repo/demo was visible on the inspected page. | Environmental-impact verification remains future direction. Implementation is hard to assess from description/video alone. |
| 10 | [CarbonLens](https://devpost.com/software/carbonlens-vo3hut) | Inspect forest-credit claims with multispectral imagery, limit issuance, and record results on blockchain. | GitHub label visible; reviewer could not resolve the repository URL. | Page says satellite imagery is simulated and the project is fictional. This is not validation of real carbon credits. |

### Corrections to the initial list

- **PLUME:** `/software/plume` is a different project. Use the full URL shown above.
- **Cloud, Climate, Chain / RANTAI 3C:** not counted among the ten confirmed projects. Search results associated it with ClimateChain, but the directly opened [Cloud, Climate, Chain page](https://devpost.com/software/cloud-climate-chain) only showed Dev Season of Code under Submitted to; [another RANTAI 3C page](https://devpost.com/software/3c-cloud-climate-chain) showed Hack-Earth and Snow Fest. This is an unresolved mismatch, not proof the creators never registered.
- **CarbonTwin release steward:** [this separate page](https://devpost.com/software/carbontwin-release-steward) links Life After Code; do not count it as a second ClimateChain submission.

## Most relevant comparisons

These are learning references, not a ranked list.

1. **PLUME — closest problem comparison.** It connects emissions discovery to funding and action decisions. Its described workflow covers more action steps than MethaneResponse. That does not prove field benefit; local demos/interventions remain simulated. Do not infer live AI or real mitigation from PLUME's description.
2. **Kanopy — method-explanation comparison.** Measurement uncertainty, computed output, and registration integrity support an inspectable demo. Lesson: explain where a number came from and what it means before discussing hashes.
3. **Mizan and CarbonTwin — audit/revision comparisons.** Mizan's source citations/human review and CarbonTwin's version updates/adjudication/anchoring overlap with MethaneResponse design. AI, citations, humans, snapshots, and blockchain together are not enough to establish novelty. Auditing methane-response claims in MARS records is a differentiation hypothesis to test, not proven uniqueness.
4. **Grounded — decision-demonstration comparison.** Battery-backup choices are connected to critical-service failures and loads that must be sacrificed. We need equally concrete task outcomes and clear labels for simulation, task evaluation, and field measurement.

## Urgency and research basis

### The problem is important; app benefit remains a hypothesis

[IEA Global Methane Tracker 2026](https://www.iea.org/reports/global-methane-tracker-2026/key-findings) estimates fossil-fuel-operation methane emissions at **124 million tonnes per year** in 2025. About **70% of those fossil-fuel methane emissions** could be reduced with available technology. This shows sector scale/opportunity; it is not emissions reduction caused by an application.

The [IEA–IMEO guide to MARS notification response](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), published 4 May 2026, reports that about **12% of 2025 notifications received a response** and describes five stages from receiving an alert to operator notification, response, verification, and documentation. That response figure is not a repair percentage, not the response rate for a country dataset in the app, and must not be transferred to a different denominator.

**Product inference:** response documentation and evidence checking are worth testing. The low global response rate does not prove that missing dashboards/audit tools caused it or that MethaneResponse will raise response rates. Authority, cost, organization, and field action also affect outcomes.

### Acknowledge existing systems

[UNEP MARS](https://www.unep.org/en/what-we-do/energy/methane/methane-alert-and-response-system-mars) already combines satellite data, scientific expertise, AI, notifications, and follow-up. The [MARS FAQ](https://www.unep.org/en/what-we-do/energy/methane/international-methane-emissions-observatory/mars-frequently-asked) describes observation limits including cloud and light. It would be inaccurate for MethaneResponse to claim to be “the first to use satellites + AI for methane response.” No later record also does not prove zero emissions.

The [repository methods note](methane-response-evidence-and-evaluation-2026-10-13.md) connects controlled-release and AI-citation research to product decisions. It is dated earlier; counts in it are not active-snapshot counts. External scientific sources support test design, not automatic product validation.

### Keep three evaluations separate

| Evaluation | Evidence already in the repo | Current gap |
|---|---|---|
| Engineering correctness | Deterministic baseline, regressions, dated build/browser/CI evidence, manifest/hash, exact source IDs. | These checks do not measure usefulness to an independent person or the truth of every physical case. They were not rerun in this research pass. |
| Model and evidence assessment | Archive-recurrence model compared with a baseline; annotation protocol and citation checks exist. | ROC AUC about 0.808 is a retrospective result for appearance of archive records; the window was examined during development. Document AI has no independent benchmark/live provider yet. |
| User benefit and impact | [Pilot protocol](../evidence/target-user-pilot-protocol.md) is ready. | No participants, task results, measured time savings, or emissions reductions attributed to the application. |

Metrics from different tasks—such as fire attribution, document extraction, microgrid simulation, and archive recurrence—cannot be combined into one accuracy ranking.

## MethaneResponse position against competition criteria

Criteria refer to the [official overview](https://ieee-climatechain-hack.devpost.com/); no numeric weights were found. The analysis below is a working assessment, not judge scoring or a win prediction.

| Criterion | Current demonstrable strength | What limits superiority claims |
|---|---|---|
| Climate Impact | Primary sources support the methane problem/response gap; source history, notification, feedback, and mitigation claims are distinguished. | No evidence that the app caused better action or emissions reductions. |
| Innovation & Creativity | Check a defined claim against evidence, allow abstention, and trace snapshots/review/revisions. | Competitors also use audit/AI/blockchain components. Added value over publisher/manual workflow is unmeasured. |
| Technical Execution | Explorer for 4,218 sources/30,414 plumes, publisher indicators, atomic file storage, rules audit, report, and local verifier. | No public service is claimed; AI provider is unevaluated; anchoring API is inactive with file storage. Contract code alone is not an active on-chain flow. |
| Practical Usefulness | Researcher/auditor task is clear; local workflow and pilot protocol exist. | No independent use, pilot result, or adoption evidence. |
| Presentation & Communication | One case can show a record, a decision withholding a claim, a revision, and export verification. | Local Notion package does not prove a final video or published presentation page. Too many workspaces could obscure the main decision. |

Status basis: [active implementation status](../release/current-implementation-status.md), [data and claims](../product/data-and-claims.md), [prospective recurrence](../product/prospective-recurrence.md), and the [no-database decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md). Code inspection in `apps/api/src/app.ts` confirms the API needs reservation/completion operations unavailable with the local file store for anchoring.

**Comparative conclusion:** MethaneResponse has inspectable local audit/provenance foundations. Available evidence is insufficient to call it best in any criterion among all participants. More features are not a direct measure of research quality or benefit.

## Next development and validation priorities

These are research recommendations, not evidence that new implementation or external activity has occurred.

1. **Prepare a case evidence package that others can assess.** Use fixed claims/sources, clear processing rights, separate detection/notification/mitigation labels, and an insufficient-evidence example. For real cases, distinguish “evidence not entered into the audit” from “physical event did not occur.” Do not reproduce third-party reports whose rights are unclear.
2. **Run user-task evaluation under the existing protocol.** Recruit 5–8 researchers/auditors/analysts with consent; counterbalance publisher/manual and MethaneResponse workflows. Record time, completion, assistance, and misunderstandings. This is a small formative study, not proof of population-wide time savings or climate impact.
3. **Prove added AI value before promoting it.** Follow the [benchmark protocol](../testing/ai-benchmark-annotation.md): at least 40 held-out claims from 10 sources, independent labels, processing rights, and a rules baseline on the same inputs. Internal targets of macro-F1 ≥0.80, citation precision ≥0.90, and zero false-supported cases are project gates, not achieved results. If the corpus/provider is unavailable, show the actual rules baseline.
4. **Strengthen one judge-inspectable demo flow.** Historical source → precise claim → evidence/citation or abstention reason → reviewer decision → export → version/integrity verification. Show data/integration limits. Explain that an unsigned hash can be recomputed if the whole package is replaced.
5. **Respect current integration decisions.** Under the active ADR, the anchoring API is unavailable with the file store. Contract, receipt checking, and local digest verification are separate components. If the owner requests a new blockchain flow, obtain an explicit scope decision before implementation and authorization before any transaction. Do not re-enable a database to match competitors. Discuss hosting only for a concrete remote-demo need, clearly stating ephemeral persistence.

A presentation position worth testing: **“MethaneResponse helps researchers trace whether methane-response claims have sufficient evidence, with sources, decisions, and revisions that can be inspected.”** This describes the goal and local capability; measured benefit awaits evaluation.

## Gallery monitoring

- User request: notify when the official gallery is published.
- Automation **IEEE ClimateChain: monitor the public gallery** was created and enabled for **09:00 and 21:00 Asia/Makassar** daily, using this workspace and a new Codex session.
- Instructions distinguish not-yet-published, published, and unverifiable access. The automation was asked to disable itself after publication is confirmed.
- Results are available in Orca automation. Host/runtime and provider availability are still required; this is not a promise of ChatGPT, email, or device-push notification.
- Configuration was reread from the runtime after enabling. The first manual execution was verified in the automation-specific terminal: it opened the gallery URL and reported **NOT PUBLISHED** on **16 October 2026, 13:19 WITA**; schedule was retained. This goes beyond dispatch status but does not prove later scheduled executions or device notification.

## Report-use limits

Public pages may change before the submission deadline. Refresh evidence if the gallery is published or competitor materials change. Do not use this list as a security audit, scientific certification, final ranking, or basis for saying all development is complete.
