# Organization handoff — 23 October 2026

**Scope:** a new readable export and onboarding path, actual application
screenshots, and focused local software acceptance. No independent human study,
new agent evaluation, provider request, deployment or public transaction.

## What changed

- A shared renderer validates the frozen decision and dossier against a supplied
  trusted digest before creating a readable handoff. Claim, source, snapshot,
  UTC scope, decision, request, due date, acceptance criteria and response-date
  precision are retained. Missing values are explicit.
- **Download handoff brief** uses the existing authenticated decision read path.
  The UI retains its stale-context guard. A browser test exercises keyboard
  activation and the same frozen brief on mobile after a new response arrives.
- `bun run export:investigation-brief` supports offline rendering, exclusive file
  creation and owner-only permissions. It does not verify a chain event, turn a
  recorded reviewer into a verified human, or modify the original decision.
- `bun run demo:workflow` exposes the existing isolated connected-investigation
  scenario through a discoverable command. The [task guide](../../product/organization-walkthrough.md)
  separates preview, basic local use, private configuration and software DEMO.
- The root README now leads with the problem, actual screenshots, user outputs,
  quick start and an environment matrix, followed by technical evidence and limits.

## Inspect the actual output

- [organization-handoff.md](organization-handoff.md): actual browser download.
- [decision.json.gz](decision.json.gz): the exact corresponding JSON export,
  gzip-compressed without changing the decompressed bytes.
- [trusted-decision-digest.json](trusted-decision-digest.json): pin captured from
  the reviewer UI before download. It is supplied by the project and a DEMO
  reviewer; it is not independent public notarization.
- [validation.json](validation.json): focused checks, replay outcomes, hashes
  and scope. These new artifacts do not replace the frozen r12 results or the
  earlier TKM take8 Anvil receipt used by video v18.

To replay, decompress `decision.json.gz` into a new local JSON path, read the
pin in `trusted-decision-digest.json`, and use:

```bash
bun run verify:investigation-decision path/to/decision.json \
  --expected-digest 0xPIN_FROM_THIS_DEMO_TAKE

bun run export:investigation-brief path/to/decision.json \
  --expected-digest 0xPIN_FROM_THIS_DEMO_TAKE \
  --output path/to/new-handoff.md
```

Choose an existing parent directory and a new destination file. The full browser
scenario and screenshots can be regenerated with `bun run demo:workflow` after
the required Chromium runtime is installed. This uses temporary software DEMO
authority, a local mock-provider service and real historical TKM metadata; it
does not call DeepSeek or contact an operator. Repeated capture runs are the same
scenario, not additional participants or research episodes.

## Interpretation and compatibility

The generated handoff is a readable private derivative. Review it for sharing
permission; retain the JSON and pin as the actual verification inputs. The
compressed example contains only authored DEMO casework and historical metadata,
with no credentials or third-party report body. The historical data remains
subject to [UNEP attribution and CC BY-NC-SA 4.0](../../../data/real/README.md).

The existing API contracts, decision schema, hashes, authorization rules,
EvidenceRegistry and previous receipts are unchanged. Rendering is lazy-loaded
on demand; the App bundle budget remains checked. There is no database or
multi-writer architecture change.

New evidence confirms the export's behavior and a reproducible task path. It
does not establish human productivity, institutional adoption, load scalability,
physical mitigation or reduced emissions. Those remain open validation areas.
The 73 frozen r12 inputs remain unchanged; 0/48 remains its frozen scorer result.
