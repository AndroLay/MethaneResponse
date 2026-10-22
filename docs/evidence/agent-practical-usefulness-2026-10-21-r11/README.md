# Agent practical-usefulness lab — revision 11

Protocol source: `~/Downloads/MethaneResponse_AI_Agent_Evaluation_Lab_Protocol.md` (local input, not reproduced here).

This packet schedules 48 synthetic agent episodes: 8 role simulations x 3 task families x 2 conditions. The selected runtime is GPT-6 Luna at max reasoning effort through the signed-in Codex CLI plan. A restricted per-episode MCP bridge supplies Playwright tools for C1 or bounded manual-packet tools for C0. This is not a human pilot, expert validation, user-satisfaction study or independent scientific gold set.

## Run

Run `bun --no-env-file run agent-lab:run-luna-max` to verify the r10 parent, freeze r11, execute deterministic gates and scripted dry-runs, carry forward valid attempts, run remaining episodes serially, and finalize the report. The launcher pins `codex-cli-gpt-6-luna-max`, records the Codex CLI version and uses the locally signed-in account. No API key is required or stored. The app and isolated MCP bridge receive no Codex credentials. Shell, built-in browser, external browser and computer tools are disabled; task tools are limited to the local application or supplied packet.

Codex plan usage is recorded from the aggregate `turn.completed` usage event for each isolated episode. Internal model request counts and per-request input/output totals are unavailable from this CLI path, so the API-only per-request token limits do not apply. The whole-lab 100-million-token cap includes prior r10 usage and is checked after each reported episode; later episodes stop when it is crossed. Each episode also has a task tool-step limit and timeout. The account plan exposes no API price or USD invoice, so `costUsd` is null and the report does not infer dollar cost. Running the packet consumes ChatGPT/Codex plan usage. T2's uncleared external-report metadata is removed from model input.

The TypeScript MCP server is launched through Bun from the Node-based Playwright worker. The command refuses to overwrite a frozen packet or sealed episode. Carried-forward episode records are immutable. A Codex startup failure, missing first model turn, or missing MCP tool submission stops the serial runner immediately.

## Evidence and limits

- `runs/dry-run/` contains scripted browser instrumentation only; those records are excluded from agent metrics.
- `runs/sealed/` contains one immutable attempt per scheduled episode, including abstentions and failures.
- C0 T1 exposes bounded score-ranked packet pages and source lookup; it does not apply the quota or return a selected plan.
- C1 is limited to the disposable localhost application. External links and non-local navigation are blocked. Reviewer-token and credential fields cannot be read or filled by the agent.
- MARS metadata remains attributed to UNEP IMEO. No third-party report body is included or sent.
- Source feedback does not prove a repair, and missing later plume observations do not establish zero methane. Digests prove integrity, not physical truth.


## Continuation lineage

This r11 revision preserves the r10 task schedule and frozen packets. The only packet field changed is the protocol revision ID. The migration carries only verified completed/abstained attempts, retains all 50,989,768 aggregate tokens already consumed in r10, excludes the cap-stopped r10 attempt from scoring, and replays that episode here. The cumulative cap is 100 million tokens.
