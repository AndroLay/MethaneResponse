## Inspiration

Finding methane emissions is an important step in addressing them. Establishing what happened afterward requires a different kind of work: examining reports, comparing observations, and deciding whether the available evidence supports a claim of repair.

We started MethaneResponse with a question: **how can an environmental analyst assess a reported repair when the supporting information is incomplete or scattered across different sources?**

[UNEP's Methane Alert and Response System (MARS)](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) already detects major methane emissions, notifies stakeholders, and follows up on responses. We saw an opportunity to help analysts work with those observations and the documents available to them, while keeping a clear record of how they reached a decision.

Our motivation is environmental accountability. A reported action deserves careful consideration, and an uncertain outcome deserves an honest explanation of what still needs to be established.

## What it does

MethaneResponse is an investigation and evidence-review prototype for environmental analysts, regulators, research teams, NGOs, and independent auditors. It belongs to the **Climate Data & Environmental Monitoring** track.

Consider a team that can investigate only ten sources. It needs to choose where to focus, explain its choices, and identify the information required before reaching a conclusion. MethaneResponse brings those tasks into one workspace:

1. **Explore the observations.** Browse historical sources on a globe and examine observation dates, estimated emission rates, uncertainty, and data origins.
2. **Plan the investigation.** Set the team's capacity, compare selection strategies, and inspect the reasons for including or excluding a source. Comparing a larger plan does not automatically replace the accepted plan.
3. **Examine a specific claim.** Define the source and period under review, inspect supporting material, and assess whether it supports, contradicts, or leaves the claim unresolved.
4. **Request the missing evidence.** Record what is needed, who should provide it, the deadline, and the criteria for an adequate response.
5. **Review and preserve the decision.** Save the reasoning and supporting records, revisit the investigation when relevant information arrives, and export a report whose integrity can be checked independently.

The application uses a historical UNEP dataset containing **4,218 source records and 30,414 plume records**. Each observation retains its date and provenance. A source appearing on the map is not automatically a completed audit case.

The demonstration follows a source in Turkmenistan from planning to a request for further evidence and a recorded review decision. The reviewer actions and follow-up response are clearly labeled **DEMO** examples. A separate Kazakhstan example shows the recorded DeepSeek document-assessment integration using an excerpt written for the demonstration. These examples do not represent communications with an operator or a completed field investigation.

The practical outputs are an investigation queue, a specific evidence request, and a decision report that another person can examine. A readable handoff accompanies the structured export, making it easier to share the findings with a colleague while retaining the original verification files.

## How we built it

We built the interface with **React, TypeScript, Vite, and MapLibre GL JS**. The globe, searchable records, and investigation workspaces present the same underlying historical data. Pagination and lazy loading help keep the interface manageable as users explore thousands of records.

**Python** handles data preparation and historical analysis. **Bun, Hono, and Zod** provide the backend and input validation. We preserve the original source identifiers, dates, units, and reported uncertainty, and associate investigations with a specific dataset snapshot so their inputs remain traceable.

Evidence assessment starts with a reproducible rules baseline. The optional **DeepSeek** integration helps examine supplied documents and identify relevant statements. Exact quotations are checked against the submitted text, and the system can withhold a conclusion when the evidence is insufficient. A reviewer remains responsible for the decision.

For report integrity, we use **SHA-256** and an **EvidenceRegistry smart contract**, developed with **Solidity, Foundry, and viem**. Recording a report's digest provides a reference against which later copies can be checked. The demonstrated transactions run on **Anvil, a local Ethereum development chain**. This establishes a working prototype of the verification process; it is not public notarization or evidence that a physical repair succeeded.

The full prototype runs locally and stores its working records in local files. The [public preview](https://methaneresponse-preview.onrender.com/dashboard) offers a limited selection of sources, temporary state, and no private review or blockchain writes. Evidence requests are prepared within the application; they are not automatically sent to operators.

We used AI assistance during development and review. The presentation combines actual application footage with explanatory visuals, synthetic narration, and original instrumental music.

## Challenges we ran into

The most demanding challenge was deciding what the evidence actually permits us to say. A satellite detection, an operator response, a reported repair, and a confirmed outcome describe different things. The application has to preserve those distinctions from the data pipeline through to the final report.

Historical satellite observations also have gaps and uncertainty. Missing later observations cannot be treated as zero emissions, and isolated measurements cannot establish a continuous emissions history. We designed the assessment workflow to make those limitations visible.

Document availability introduced another challenge. A reference to a report does not mean its contents have been obtained, reviewed, or cleared for reuse. We therefore distinguish available evidence from material that still needs to be requested.

On the engineering side, we worked on preserving decision history, recovering interrupted operations, preventing conflicting edits, and ensuring that an exported report corresponds to the decision the reviewer actually saved.

## Accomplishments that we're proud of

- Connecting historical observations, capacity planning, evidence requests, and review decisions in a working investigation workflow.
- Giving incomplete evidence a useful outcome: a clear explanation of what is missing and a concrete next step.
- Preserving earlier decisions when new information arrives, so the reasoning remains open to examination.
- Demonstrating that an original report verifies against its recorded local-chain commitment, while an altered and rehashed copy is rejected.
- Making the source code, data provenance, test procedures, and verification artifacts available for others to inspect and reproduce.

Our [repository](https://github.com/AndroLay/MethaneResponse) includes automated checks for the application, data processing, smart contract, and browser workflows, together with the scope and limitations of the recorded results.

## What we learned

An investigation is useful when it helps someone decide what to do next. Identifying an evidence gap becomes more valuable when it leads to a precise request for measurements, methods, dates, or supporting documentation.

We also learned to evaluate AI against a simpler approach. Our bounded experiments did not demonstrate an advantage over the rules baseline. The agent-based evaluation did not establish user productivity or practical effectiveness; its original results and diagnostic review remain available in the [evaluation documentation](https://github.com/AndroLay/MethaneResponse/tree/main/docs/evidence/agent-practical-usefulness-2026-10-21-r12). These findings helped us focus on traceable evidence and reviewable decisions rather than treating model output as authority.

Finally, cryptographic verification answers a specific question: whether a report matches a trusted recorded commitment. Establishing that methane emissions were reduced requires appropriate environmental evidence as well.

## What's next for Methane Response

We want to evaluate MethaneResponse with researchers and auditors using documents they are authorized to review. The next steps are to broaden the documentary evidence, obtain domain feedback, and measure how well users identify missing information and complete an investigation. The model-assisted workflow also needs evaluation against independently labeled claims.

For organizational adoption, the prototype would need shared durable storage, stronger coordination between reviewers, and access controls suited to a team. Public testnet verification and performance testing on physical mobile devices are further steps toward that goal.

The intended environmental contribution is more accountable follow-up. An investigation plan can guide attention to a source, and an evidence request can clarify what must be measured after an intervention. Actual repairs and comparable post-action measurements are still required to establish reduced methane emissions. We have not measured those outcomes or demonstrated gains in human productivity.

To explore the project, [try the public preview](https://methaneresponse-preview.onrender.com/dashboard), [run the full prototype locally](https://github.com/AndroLay/MethaneResponse#quick-start), or follow the [investigation walkthrough](https://github.com/AndroLay/MethaneResponse/blob/main/docs/product/organization-walkthrough.md).

**One explainable investigation plan. One actionable evidence request. One verifiable decision.**
