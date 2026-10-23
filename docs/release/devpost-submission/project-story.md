## Inspiration

MethaneResponse began with a practical question: **when a methane repair is reported, what evidence should an independent analyst check before accepting the claim?**

[UNEP's Methane Alert and Response System (MARS)](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) already detects major emissions, notifies stakeholders, and follows up on responses. MethaneResponse builds on that work by helping researchers, auditors, and public-interest analysts connect a specific claim to the evidence available for their review.

The opportunity is environmental transparency: make observations, reported actions, uncertainty, and missing evidence easier to examine together, so the next investigation step is clear.

## What it does

**Track: Climate Data & Environmental Monitoring.** MethaneResponse turns historical methane records into traceable investigations through one workflow:

**Who uses it?** Environmental analysts, investigation teams, regulators, NGOs, and independent auditors. A team with capacity for ten investigations can consolidate observations, compare priorities, identify missing evidence, and prepare a reviewable handoff.

**What can an organization take away?** An explainable investigation queue, a structured evidence request, and a versioned decision dossier with an independently checkable JSON export. The latest interface also downloads a readable Markdown handoff from the frozen decision after checking its digest; the readable copy does not replace the JSON and separately retained trusted digest. These are demonstrated work artifacts, not a measured improvement in human productivity.

1. **Explore:** inspect source locations, dated observations, estimated emission rates, uncertainties, and original references.
2. **Allocate:** set investigation capacity (for example, 10 or 20 sources), compare explainable portfolios, and accept a versioned allocation.
3. **Check:** choose a claim and apply a specific date or event scope before running the rules baseline.
4. **Follow up:** connect the accepted plan to a scoped investigation; record evidence requirements, responses and reviewer interpretations without overwriting earlier events.
5. **Review and verify:** freeze the exact dossier and decision, then verify its digest or optional chain commitment independently. New evidence or relevant historical snapshot changes explain why another review may be needed.

The connected workflow also checks related investigations for overlapping source/period questions and reused evidence. These are candidates for human review: using one report for multiple questions can be legitimate. It does not automatically assert duplicate mitigation or merge facility identities.

The pinned UNEP snapshot contains **4,218 source rows and 30,414 plume rows**, covering observations from October 2020 to September 2026. These are historical records; each map source still needs appropriate supporting documents before it becomes a complete evidence case.

The current **v18 film (4:57)** follows **TKM_S_021 in Turkmenistan** through a local investigation: compare capacity 10 and 20, inspect a source, evaluate the available evidence, request follow-up measurements, freeze a reviewer decision, revisit it after a DEMO response, and verify its integrity. The reviewer and response are explicitly software DEMO fixtures; they are not operator communications or a human study.

The claim under review is whether mitigation is confirmed. The actual decision is **request more evidence**. Feedback is not proof of repair; missing later observations are not zero emissions.

A separately labeled **KAZ_S_159** segment presents recorded DeepSeek integration on a project-authored DEMO excerpt. It is not an AI assessment of TKM_S_021. UNEP's [Kazakhstan catalogue](https://wedocs.unep.org/handle/20.500.11822/49949) records mitigation action in July 2026, but the retained metadata does not establish the exact action day. Asking for attributable follow-up evidence does not contradict UNEP or establish failed mitigation.

**The demo shows the full local prototype. The public preview is limited to selected sources and excludes private review and blockchain writes.** Preview state is temporary. Evidence requests are recorded work artifacts; the prototype does not send them to an operator.

## How we built it

The interface uses **React, TypeScript, Vite, and MapLibre GL JS**. Progressive loading, pagination, lazy-loaded workspaces, and adaptive Earth rendering support exploration of thousands of historical records.

**Python and uv** power offline ingestion and analysis, preserving source identifiers, recorded dates, units, uncertainty, provenance, and dataset hashes. **Bun, Hono, and Zod** provide the API, validation, scoped assessments, review permissions, and immutable audit revisions. The prototype uses local JSON files with a single-writer design.

A deterministic rules baseline provides the demonstrated evidence checks. An optional document-AI path adds exact-quotation validation, abstention, and human review controls. Backend integration with ExperientialLabs model `deepseek-v4.1-flash-1017` has recorded live smoke evidence. The film shows that separate archived KAZ DEMO, not a new live call or an independently validated model benchmark. AI proposes; people review.

**Solidity, Foundry, and viem** implement an EvidenceRegistry integration with durable transaction intents and recovery. Deployment, anchoring, and failure recovery have been exercised on **local Anvil**. The preview has no public Sepolia receipt. Reports use SHA-256; a local hash check establishes consistency with the recorded digest, while trusted commitments are needed to establish which version to trust. Neither a hash nor a blockchain receipt proves physical repair.

Development and review used AI assistance. The demo uses stock synthetic English narration, original explanatory animation, actual application footage, and an original instrumental score.

## Challenges we ran into

The hardest problems were scientific and semantic. Source identifiers must survive ingestion. Feedback needs to remain distinct from repair evidence. Sparse satellite observations cannot become a continuous emissions curve, and missing dates cannot become zero emissions.

Document access and licensing also matter. A publisher link can be retained without implying that the report body was reviewed. Evidence checks must explain their scope and request missing information rather than manufacture certainty.

Engineering challenges included conflicting edits, interrupted writes, transaction recovery, browser draft recovery, and maintaining clear permission boundaries across the investigation workflow.

## Accomplishments that we're proud of

- A working path from historical source exploration to a specific evidence request and independently checkable report.
- Same-take TKM export, separately retained UI digest and Anvil local receipt: the original verifies, an altered-and-rehashed decision is rejected against the contract commitment, and the restored original verifies. The project-supplied local ledger is not independent public notarization.
- Three documented historical case studies, with provenance and explicit interpretation limits.
- A recorded local verification package with **716 passing tests**, plus build checks and focused desktop/mobile-viewport browser scenarios on its October 18 revision. This is historical revision evidence. V18 separately passes 18 technical video checks and 34 video regressions; those do not constitute a fresh application gate.
- A product that can give a constructive answer when the evidence is incomplete: explain what is missing and preserve the next investigation step.

## What we learned

Different questions require different evidence. A detection, a notification, a reported action, and a confirmed outcome should remain separate throughout the interface, API, and report.

AI also needs to earn its role. The bounded agent-based experiments did not demonstrate an advantage over the rules baseline. Keeping that result visible helped prioritize reproducibility and review controls. Agent simulations are not human research or an independent benchmark of the application provider. The latest frozen r12 scorer reports **0/48 task completion**, despite 12 deterministic gates passing. It does not establish Practical Usefulness; recovery tests and alternative diagnostic interpretations do not replace that result.

## What's next for Methane Response

The next milestones are to expand permitted documentary evidence, obtain domain review, evaluate the optional model path against independently labeled claims, and test the workflow with researchers and auditors. Public testnet verification and physical-device performance checks remain separate validation steps.

Potential climate impact comes after the software: prioritized investigations and specific evidence requests can guide organizational field follow-up. Documented repairs and comparable post-action measurements, with methods and uncertainty, are needed to substantiate emissions reductions. We have not measured those outcomes. User studies should measure decision quality, missing-evidence detection, and investigation effort. Opt-in snapshot staging prepares complete record comparisons without replacing active inputs or historical decisions; future acquisition and activation require explicit provenance and review.

**One explainable investigation plan. One actionable evidence request. One verifiable decision.**

### Try the prototype

- [Open the limited public preview](https://methaneresponse-preview.onrender.com/dashboard).
- [Run the full prototype locally](https://github.com/AndroLay/MethaneResponse#quick-start).
- [Follow the reproducible organization handoff walkthrough](https://github.com/AndroLay/MethaneResponse/blob/main/docs/product/organization-walkthrough.md).
- [Inspect the exact local-chain proof shown in the video](https://github.com/AndroLay/MethaneResponse/tree/main/docs/evidence/video-v17-2026-10-22).

Adoption starts with a local analyst workspace and downloadable artifacts. Offline processing and paginated, lazy-loaded views accommodate the historical dataset, while a multi-user service would require shared durable storage, concurrency controls, and organizational access management beyond this single-writer prototype.
