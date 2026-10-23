# P5/P6 findings ledger

Sources: tool inspection by the main agent, metadata inspection by the P6 agent, and browser use by the P5 agent. All assessments are engineering/agent reviews, not domain-expert endorsements.

| ID | Finding | Action / decision | Status |
|---|---|---|---|
| E01 | P5 had no paired-results processor | `pilot_study.py`: frozen assignments, T1–T4, denominator includes missing/failed tasks, help/accuracy/duration, exit beliefs, private/no-overwrite output | Implemented; tests in verification |
| E02 | An agent could be counted as a human | Separate `participantKind`; agents always fail the human gate; empty slots are not actual participants; separate counterbalancing test | Implemented; regression available |
| E03 | P6 baseline was not bound to exact inputs | Mandatory wording/input/rights digests + rules basis/version; mismatches rejected | Implemented; regression available |
| E04 | Metadata baseline does not read natural-language documents | A basis is mandatory; metadata comparison cannot establish document AI benefit; 12 agent claims are reported only as policy conformance | Closed through contract/reporting, without a new capability claim |
| E05 | One provider failure could remove a batch result | CLI complete-attempt mode records sanitized failure/verdict null/latency; failure counts as an error, not a correct insufficient-evidence answer | Implemented; provider fixture, no live provider |
| E06 | Passing an absolute score could be mistaken for AI benefit | `aiBenefit` and `activationEligible` separated; paired interval/basis/telemetry checked; ties/negative results remain reported | Implemented; positive/negative regressions |
| E07 | Old freeze did not freeze source/document splits | `--require-partitions=yes` + source/type/doc/split metadata; source/document overlap rejected before annotation | Implemented; old mode remains compatible |
| E08 | A rights URL could be supplied without being the input source URL | Benchmark requires input source URL to match rights URL | Implemented; not automatic legal clearance |
| E09 | Benchmark inputs/reports needed private storage | Owner-only file/directory guards outside the repo; evaluator output required, no overwrite, concise stdout status | Implemented; owner-only/no-overwrite tests |
| E10 | No participants/annotators/corpus/permitted provider | Task package/answer key/manual packet/runbook ready; agent explored metadata. No fabricated research results created | Pending real inputs; does not block engineering work |
| E11 | Agent found detailed priority information at the Document AI step | Task instructions separate heuristic input panel from provider call; AI remains off. Potential discoverability needs a user study | UX observation; not established as a human problem |
| E12 | Baseline did not request the exact natural-language claim | P5 no-cleared-excerpt branch explicitly assesses reference coverage with scope; P6 forbids comparing document meaning from coverage | Capability limit documented; not a bug closed with false labels |
| E13 | Export requires selecting a revision in Reports | Walkthrough records the step; original/tampered verifiers were run in browser | Flow works; human usability has not been measured |

P4 v1/v2, the model corpus, public-summary projection, dependencies, and credentials were not changed in this increment. The earlier source-binding engineering change remains a historical record; current evaluation has its own manifest.

Additional review found that legacy telemetry could still pass the absolute gate, freeze wording was too narrow, and cell assignment was imbalanced. All three were fixed, given RED→GREEN regressions, then confirmed by a second agent inspection. Hash binding attests equality; the operator must still preserve the rules/transform code, not only attach a digest.
