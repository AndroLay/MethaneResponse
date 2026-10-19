## Inspiration

MethaneResponse began with a practical question: **when a methane repair is reported, what evidence should an independent analyst check before accepting the claim?**

[UNEP's Methane Alert and Response System (MARS)](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) already detects major emissions, notifies stakeholders, and follows up on responses. MethaneResponse builds on that work by helping researchers, auditors, and public-interest analysts connect a specific claim to the evidence available for their review.

The opportunity is environmental transparency: make observations, reported actions, uncertainty, and missing evidence easier to examine together, so the next investigation step is clear.

## What it does

**Track: Climate Data & Environmental Monitoring.** MethaneResponse turns historical methane records into traceable investigations through one workflow:

1. **Explore:** inspect source locations, dated observations, estimated emission rates, uncertainties, and original references.
2. **Focus:** use historical analysis and explainable investigation-priority indicators to identify questions worth checking.
3. **Check:** choose a claim and apply a specific date or event scope before running the rules baseline.
4. **Follow up:** record the open question, next action, and evidence to request. Authorized reviewers can separately record assessments with reasons and references.
5. **Share and verify:** export versioned reports, compare revisions, and check report integrity in the browser.

The pinned UNEP snapshot contains **4,218 source rows and 30,414 plume rows**, covering observations from October 2020 to September 2026. These are historical records; each map source still needs appropriate supporting documents before it becomes a complete evidence case.

The demo follows **KAZ_S_159 in Kazakhstan**. UNEP's [catalogue records mitigation action in July 2026](https://wedocs.unep.org/handle/20.500.11822/49949), while the selected snapshot includes an observation on July 11. The retained catalogue metadata does not establish the exact action day. The review therefore produces a useful next request: obtain the action date and attributable follow-up evidence.

The local result, **Insufficient Reference Coverage**, describes the submitted material. It does not contradict UNEP's catalogue or establish that mitigation failed.

## How we built it

The interface uses **React, TypeScript, Vite, and MapLibre GL JS**. Progressive loading, pagination, lazy-loaded workspaces, and adaptive Earth rendering support exploration of thousands of historical records.

**Python and uv** power offline ingestion and analysis, preserving source identifiers, recorded dates, units, uncertainty, provenance, and dataset hashes. **Bun, Hono, and Zod** provide the API, validation, scoped assessments, review permissions, and immutable audit revisions. The prototype uses local JSON files with a single-writer design.

A deterministic rules baseline provides the demonstrated evidence checks. An optional document-AI path adds exact-quotation validation, abstention, and human review controls. Its live-provider quality has not yet been independently established; the video demonstrates the rules workflow.

**Solidity, Foundry, and viem** implement an EvidenceRegistry integration with durable transaction intents and recovery. Deployment, anchoring, and failure recovery have been exercised on **local Anvil**. The preview has no public Sepolia receipt. Reports use SHA-256; a local hash check establishes consistency with the recorded digest, while trusted commitments are needed to establish which version to trust. Neither a hash nor a blockchain receipt proves physical repair.

Development and review used AI assistance. The demo uses stock synthetic English narration, original explanatory animation, actual application footage, and an original instrumental score.

## Challenges we ran into

The hardest problems were scientific and semantic. Source identifiers must survive ingestion. Feedback needs to remain distinct from repair evidence. Sparse satellite observations cannot become a continuous emissions curve, and missing dates cannot become zero emissions.

Document access and licensing also matter. A publisher link can be retained without implying that the report body was reviewed. Evidence checks must explain their scope and request missing information rather than manufacture certainty.

Engineering challenges included conflicting edits, interrupted writes, transaction recovery, browser draft recovery, and maintaining clear permission boundaries across the investigation workflow.

## Accomplishments that we're proud of

- A working path from historical source exploration to a specific evidence request and independently checkable report.
- A repeatable original → changed → original report test in the actual application: the altered copy is rejected, and the untouched original passes again.
- Three documented historical case studies, with provenance and explicit interpretation limits.
- A recorded local verification package with **716 passing tests**, plus build checks and focused desktop/mobile-viewport browser scenarios on its October 18 revision. Later video checks are recorded separately.
- A product that can give a constructive answer when the evidence is incomplete: explain what is missing and preserve the next investigation step.

## What we learned

Different questions require different evidence. A detection, a notification, a reported action, and a confirmed outcome should remain separate throughout the interface, API, and report.

AI also needs to earn its role. The bounded agent-based experiments did not demonstrate an advantage over the rules baseline. Keeping that result visible helped prioritize reproducibility and review controls. Agent simulations are not human research or an independent benchmark of the application provider.

## What's next for Methane Response

The next milestones are to expand permitted documentary evidence, obtain domain review, evaluate the optional model path against independently labeled claims, and test the workflow with researchers and auditors. Public testnet verification and physical-device performance checks remain separate validation steps.

User studies should measure decision quality, missing-evidence detection, and investigation effort. Any claim of emissions reduction would require evidence of subsequent real-world action.

**Our goal: make methane-related claims easier to trace, review, and responsibly act on.**
