# Luna Max continuation runbook — r12

This is a continuation of the immutable partial report in `agent-practical-usefulness-2026-10-21-r11/`. The r11 packet contains 43 valid sealed attempts and one interrupted marker. Revision r12 verifies the r11 checksums, copies the 43 valid attempts byte-for-byte, carries forward its cumulative usage ledger, and runs exactly the five remaining schedule entries, including a fresh attempt for the interrupted `P8-T1-C1_APPLICATION_BROWSER` episode.

## Run

From the repository root, run:

```sh
bash scripts/agent-usefulness/run-codex-luna-max-r12.sh
```

The launcher requires the signed-in Codex CLI and pins GPT-6 Luna at max reasoning effort through the ChatGPT plan. It needs no API key. It freezes r12, checks the deterministic gates, records four scripted Playwright dry-runs, migrates the verified r11 evidence, runs remaining episodes serially, and finalizes the report. Existing frozen outputs are never overwritten. Set `TMPDIR=/dev/shm` when the host temporary directory has a quota; the launcher selects `/usr/bin/chromium` when available.

The r11 cumulative cap of 100,000,000 reported tokens remains in force. The runner records aggregate `turn.completed` usage from Codex CLI, not internal per-request counts. Plan billing exposes no reliable USD invoice or token price through this runner, so `costUsd` remains null and the report does not infer a dollar cost. This execution consumes the signed-in ChatGPT/Codex plan usage.

## Result files

- `findings.md`: human-readable partial or final report.
- `results.json` and `verification.json`: episode scoring, lineage, hashes, gates and completion status.
- `runs/sealed/`: one immutable record per scheduled episode; inherited r11 files retain their exact bytes.
- `runs/runtime/continuation-migration.json`: parent linkage, missing episode list and carried-forward usage.
- `checksums.sha256`: packet checksum inventory.

The study tests synthetic task usefulness and does not constitute a human pilot, expert validation, or an independent scientific gold set. A source feedback event does not prove a repair or reduced emissions; missing later plume measurements do not prove zero methane. Digests establish file integrity, not physical truth.
