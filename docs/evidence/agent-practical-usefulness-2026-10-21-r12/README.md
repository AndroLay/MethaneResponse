# Agent practical-usefulness lab — revision 12

Protocol source: `~/Downloads/MethaneResponse_AI_Agent_Evaluation_Lab_Protocol.md` (local input, not reproduced here).

This packet schedules the same 48 synthetic agent episodes: 8 role simulations x 3 task families x 2 conditions. The runtime remains GPT-6 Luna at max reasoning effort through the signed-in Codex CLI plan. A restricted per-episode MCP bridge supplies Playwright tools for C1 or bounded manual-packet tools for C0. This is not a human pilot, expert validation, user-satisfaction study or independent scientific gold set.

## Run

Run `bash scripts/agent-usefulness/run-codex-luna-max-r12.sh` to verify the r11 parent, freeze r12, run deterministic gates and scripted dry-runs, carry forward validated attempts and cumulative usage, execute the remaining episodes serially, and finalize the report. The launcher pins `codex-cli-gpt-6-luna-max`, records the Codex CLI version and uses the locally signed-in account. No API key is required or stored. The app and isolated MCP bridge receive no Codex credentials. Shell, built-in browser, external browser and computer tools are disabled; task tools are limited to the local application or supplied packet.

The 100-million-token cumulative cap is inherited unchanged from r11. Codex plan usage is recorded from the aggregate `turn.completed` usage event for each isolated episode. Internal model request counts and per-request input/output totals are unavailable from this CLI path, so the API-only per-request token limits do not apply. Each episode also has a task tool-step limit and timeout. The account plan exposes no API price or USD invoice, so `costUsd` is null and the report does not infer dollar cost. Running this packet consumes ChatGPT/Codex plan usage. T2's uncleared external-report metadata is removed from model input.

The TypeScript MCP server is launched through Bun from the Node-based Playwright worker. The command refuses to overwrite a frozen packet or sealed episode. Carried-forward episode records are immutable. A Codex startup failure, missing first model turn, or missing MCP tool submission stops the serial runner immediately.

## Evidence and limits

- `runs/dry-run/` contains scripted browser instrumentation only; those records are excluded from agent metrics.
- `runs/sealed/` contains one immutable attempt per scheduled episode, including abstentions and failures.
- C0 T1 exposes bounded score-ranked packet pages and source lookup; it does not apply the quota or return a selected plan.
- C1 is limited to the disposable localhost application. External links and non-local navigation are blocked. Reviewer-token and credential fields cannot be read or filled by the agent.
- MARS metadata remains attributed to UNEP IMEO. No third-party report body is included or sent.
- Source feedback does not prove a repair, and missing later plume observations do not establish zero methane. Digests prove integrity, not physical truth.


## Continuation lineage

This r12 revision preserves the r11 task schedule and frozen packets. The only packet field changed is the protocol revision ID. It carries forward 43 hash-verified completed/abstained records and the r11 cumulative usage ledger. The interrupted P8-T1-C1 attempt is rerun, along with the four scheduled episodes that had not started. The model, reasoning effort and 100-million-token cumulative cap are unchanged.
