# Runbook: agent practical-usefulness lab r11 continuation

Protocol: `agent-practical-usefulness-2026-10-21-r11`

This is a resource-only continuation of r10. It retains the same 48-episode schedule, personas, task assignments, gold set, provider, model, reasoning effort and signed-in Codex plan. The three scenario packets and their gold files are inherited from the verified r10 freeze; only their top-level `protocolId` is rebound. The whole-lab cumulative cap rises from 50,000,000 to 100,000,000 tokens because r10 stopped at 50,989,768 tokens after 36 valid attempts and one cap-stopped attempt.

The continuation migration verifies r10's checksums, frozen protocol, report and gates. It carries forward only the 36 completed or abstained attempts, copied byte-for-byte. The cap-stopped `P7-T1-C1_APPLICATION_BROWSER` record is retained in the lineage manifest with its hash and token usage, excluded from r11 scoring, and rerun under the higher cap. The r10 usage ledger is carried into r11 before any new model call, so the 100-million limit is cumulative. Eleven r10 episodes were NOT_RUN; together with the cap-stopped episode, these are the 12 attempts r11 executes.

Run the complete continuation with:

```sh
TMPDIR=/dev/shm bun --no-env-file run agent-lab:run-luna-max
```

The runner pins `codex-cli-gpt-6-luna-max`, requires the installed Codex CLI's signed-in plan, records its version, and does not require or store an API key. Shell, built-in browser, external browser and computer tools remain disabled for the task agent. C1 browser navigation is limited to the disposable localhost app; C0 uses the supplied packet.

Codex `turn.completed` events expose aggregate usage per isolated episode, not internal provider-request counts or per-request input/output totals. The API-only per-request limits therefore do not apply. The 100-million-token budget includes the r10 cumulative ledger and stops new episodes once crossed. The ChatGPT/Codex plan exposes no USD invoice for this run; reported dollar cost remains unavailable, not zero. This run consumes plan usage.

Do not treat this lab as a human pilot, expert validation, user-satisfaction study or independent scientific gold set. Source feedback alone does not prove a repaired asset or reduced emissions; missing later plume measurements do not prove zero emissions. Digests establish integrity and chronology, not physical truth.
