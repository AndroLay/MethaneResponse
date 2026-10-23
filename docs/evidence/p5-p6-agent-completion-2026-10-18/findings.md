# P5/P6 agent-execution findings and resolution

[Full results](README.md) · [CLI recheck](cli-context-after-fix.json)

| ID | Finding | Follow-up and status |
|---|---|---|
| F01 | CLI checked the bundle but ignored the export checksum, allowing changes to `claim`/`sourceDataset.snapshotId` outside the bundle | **Fixed:** verify export checksum; `--require-context`; check claim/source/synthetic fields and snapshot/archive/input hash against the bundle when present. Unknown/repeated options are rejected. 11 CLI regressions passed; 25 original/tampered JSON files replayed in default and strict modes, 50/50 as expected. Pre-patch evidence is retained. |
| F02 | A02/A04 app T3 selected a scope beginning one day after the observation | **Deviation retained:** two partial results, excluded from time pairs that require correct answers. A06 and three agent1 sessions used the correct task scope and are recorded separately. No app input-scope failure was found; this does not prove the design is easy for humans to understand. |
| F03 | Three manual T3 answers from agent2 implied that the observation preceded the action/period, although action dates were unavailable | **Scored as partial:** document/observation dates do not establish action order. [Annotation guide](../../testing/ai-benchmark-annotation.md) was clarified. The original answers were not corrected or re-scored as correct. |
| F04 | Both P6 agents chose contradicted for a BHR notification claim whose reference was insufficient; all quotes were exact matches | **Decision closed:** raw outputs and test set remain unchanged. Report correlated error; no AI benefit over rules; no activation eligibility. Rationale/semantic citation relevance was not scored; no claim that the agents have been fixed. |
| F05 | Repeated sessions, both manual cases visible, facilitator hint, some automation errors/stale references; app was slower in the time pairs that passed the filter | **Study limits recorded:** two agents are not six people; carryover and assistance are shown. Agent wall time is not promoted as human benefit; tool errors are not claimed to be runtime bugs. No claim of superiority over all submissions. |
| F06 | Input digest was compared only across outputs; raw→grounded replay and prompt binding needed strengthening | **Fixed:** helper recomputes two digests from frozen inputs and replays grounding/verdict/count; 9 regressions; all 216 actual bindings matched. Prompt is compared to method digest; exact match is not semantic validity. |

No material code findings remain open within this change scope after review. The lack of human participants/experts, independent gold, permitted event/repair documents, and provider benchmark continues to limit the **original research**. Closing agent scope does not mark those gates as passed.

Review was done by a different agent in read-only mode. It checked the CLI, P6 binding, and P5 raw→scoring→aggregate consistency; this is engineering review, not domain-expert review or human adjudication.
