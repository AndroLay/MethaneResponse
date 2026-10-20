# Evidence Decision Lab — prototype increment

Baseline: `8e19c03`. User requests a materially stronger prototype after a competitor audit. Preserve frozen evidence and the existing stack; no database or paid service.

## Deliverables and acceptance

- [x] Diagnose CI; retain Chromium sandbox locally and use an explicit hosted-runner policy. No skipped application assertions. Remote rerun pending publication of new source.
- [x] Explain each pinned reference's eligibility using the existing coverage policy. Preserve dataset/source/scope binding and return a deterministic digest.
- [x] Run bounded leave-one-reference-out sensitivity tests; missing records remain unknown. Never call these probabilities or evidence of physical repair.
- [x] Produce a concrete evidence request with acceptance checks. Let users inspect/export it and continue into human review/follow-up.
- [x] Separate authored DEMO challenges from real MARS investigations. Demonstrate complete, missing follow-up, out-of-period, contrary and conflicting references using the same engine.
- [x] Prove API/UI behavior, stale-result rejection, desktop/mobile layout and safe fallbacks. Run existing application gates and the local Anvil integration.
- [x] Record fresh evidence and the remaining public-service boundary. Do not rewrite prior artifacts or silently deploy/push.

Delivery: [dated proof pack](../evidence/decision-lab-2026-10-19/README.md). Main gate 735 tests; browser 17 + 9 scenarios; runner four helpers; local-chain integration one test/42 assertions. Counts are separate, without focused repeats. CI remote, external AI quality and real human/climate impact remain unverified by this increment.

## Direction contract

**Thesis:** show which evidence changes a decision and what a reviewer must obtain next.
**Own world:** inherit the navy/cyan Evidence Auditor, existing controls, semantic status colors, and readable table typography.
**Story:** inspect pinned records → explain eligibility → test dependencies → export an evidence request → continue review.
**First viewport:** a dedicated Decision Lab step, source/snapshot heading, one explain action; results show verdict and counts, then an expandable trace and sensitivity comparison.
**Form:** extend the existing investigation workspace, retaining its navigation and scoped state. Synthetic challenges have a persistent DEMO heading and their own context.
**Finish:** actual browser captures, regression results and explicit local/remote limits.

## Competitive evidence checked 19 October 2026

The provided ranking is commentary, not an acceptance test. Sources examined: [PLUME repository](https://github.com/KaavinB/PLUME), [CanopyProof submission](https://devpost.com/software/canopyproof-lwsvz4), [IEEE overview](https://ieee-climatechain-hack.devpost.com/). Their claims are not independently executed here. This increment targets visible decision utility and reproducibility; it does not establish a ranking or measured climate impact.
