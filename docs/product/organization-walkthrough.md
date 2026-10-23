# An investigation your team can hand off

[Documentation home](../README.md) · [Setup](../development/local-setup.md) · [Connected workflow](../development/connected-investigations.md)

## The job

**User:** an environmental analyst preparing work for an investigation reviewer.

**Constraint:** the team can investigate ten historical sources. It needs to defend its selection, identify missing evidence, and preserve the decision when another response arrives.

**Takeaway:** a reproducible plan, a specific evidence request, a versioned decision JSON, a separately retained digest, and a readable Markdown handoff. These are software artifacts, not proof of repair, human productivity or field adoption.

## Choose the appropriate route

| Route | Prerequisites | What you can finish |
|---|---|---|
| [Public preview](https://methaneresponse-preview.onrender.com/dashboard) | Browser; no confidential material | Inspect historical sources; run the anonymous baseline on KAZ_S_159, LBY_S_143 or CAN_S_002 |
| Basic local application | Repository-pinned Bun, Linux flock, installed dependencies | Explore the bundled snapshot, compare plans, run rules and export an audit |
| Repeatable software demonstration below | Basic prerequisites plus Playwright Chromium | A complete TKM_S_021 DEMO request/review/decision/revisit with actual exports |
| Private organizational workspace | Backend reviewer directory, scoped tokens, local state backup and authorized source material | Your own private investigation; enroll real reviewers separately |

The public preview does not expose private review or blockchain writes. Its temporary state is unsuitable for retaining an organization's records.

## Self-guided local task

Run the [local setup](../development/local-setup.md), then open `/dashboard/cases`.

1. **Plan:** open **Plan investigation capacity**, set capacity to 10, keep the region and country quota visible, and compare the four strategies. Inspect selection/exclusion reasons and download the reproducible plan. Explicitly activate the chosen queue.
2. **Compare:** change capacity to 20 and compare again. Check that the ten-source active queue remains intact until you explicitly activate a replacement. Record which assumptions and selected source IDs differ.
3. **Inspect:** open the source from that selected queue. Preserve its original source ID, snapshot, UTC scope, units and uncertainty. Do not claim it was selected by a plan that excludes it.
4. **Assess:** choose the question under review and run the rules baseline. For a mitigation claim without attributable post-action measurements, insufficient evidence is an appropriate outcome. A different claim or scope needs its own assessment.
5. **Request:** in the configured private workspace, attach the accepted plan revision. Record the required evidence, recipient role, due date and acceptance criteria. Ask for source-linked action dates, follow-up measurements, methods, units, uncertainty and observation opportunities where needed. Save the shared revision.
6. **Review:** link the scoped assessment, inspect the exact dossier and references, then freeze the reviewer's decision. Keep the digest from the reviewer history separately from the downloaded JSON.
7. **Hand off:** select **Download handoff brief** beside the frozen decision. Read the Markdown and check the source, period, actual decision, request and deadline. Missing fields remain **Not recorded**. Check rights and redact before sharing. No request is sent automatically.
8. **Revisit:** record an authorized later response. Inspect the reason to review and download the original decision again. The frozen decision stays unchanged; the current revisit signal is separate.
9. **Verify:** run the independent JSON verifier against the separately trusted pin. Use chain verification only with the matching configured target and receipt. The new Markdown brief itself is unsigned.

Private review requires server authorization. Do not invent a reviewer or weaken permissions when a token is missing. For an isolated no-credential demonstration, use the next section.

## Repeatable software demonstration

From the repository root, with installed dependencies:

```bash
bun run playwright install chromium
PLAYWRIGHT_OUTPUT_DIR=.playwright-cli/organization-demo bun run demo:workflow
```

Use `PLAYWRIGHT_BROWSERS_PATH` if the installed runtime lives outside Playwright's default location. No implicit runtime download is performed by `demo:workflow` itself. The isolated runner defaults to API 43139, web 4179 and mock-provider 43140; these ports must be available.

The command uses the existing browser runner and production build. It starts temporary API/web/mock services, creates short-lived DEMO reviewer credentials, and runs one connected-investigation scenario. The exercised assessment is human-path software review; the available provider is a local mock, not DeepSeek. Real environment credentials are not forwarded. Requests to external hosts from the page are blocked. The test cleans up its services and temporary state; requested output artifacts remain.

The scenario uses historical **TKM_S_021** and snapshot `unep-mars-675417694883`. Its requests, response URLs, original-file digests and reviewer are **DEMO fixtures**, not an actual operator exchange. It requests more evidence; it does not certify mitigation. An accepted plan is part of the dossier. The separate capacity-comparison browser regression covers the 10→20 allocation behavior.

Under the named output directory, find the folder whose name begins `ai-review-workflow-connect-`. It contains:

| File | Purpose |
|---|---|
| `connected-investigation.json` | Source/snapshot-bound dossier, accepted plan, assessment and work history |
| `trusted-decision-digest.json` | Pin captured from the reviewer UI before download; DEMO trust source disclosed |
| `frozen-investigation-decision.json` | Decision revision 1 and its frozen dossier |
| `organization-handoff.md` | Actual Markdown download from the new browser control |
| `revisited-investigation-decision.json` | The same frozen decision with a later-response review recommendation |
| `evidence-request-desktop.png` | Actual structured-request UI |
| `decision-desktop.png` | Actual frozen-decision and handoff controls |
| `connected-investigation-mobile.png` | Narrow-viewport software check; not physical-phone testing |

A PASS means the listed software assertions succeeded. It does not establish an independent human's ability to complete the task, task speed, model quality, or institutional outcomes. This run neither replaces r12 nor creates new agent episodes.

## Verify and render a downloaded decision

Use the paths and pin from your own take, not a digest copied from another case or revision:

```bash
bun run verify:investigation-decision path/to/frozen-investigation-decision.json \
  --expected-digest 0xYOUR_TRUSTED_SHA256

bun run export:investigation-brief path/to/frozen-investigation-decision.json \
  --expected-digest 0xYOUR_TRUSTED_SHA256 \
  --output path/to/new-handoff.md
```

The CLI verifies the canonical decision and dossier relationships before rendering. It creates a new file with owner-only permissions and refuses to overwrite an existing path. No provider, signing key or network transaction is required. The destination's parent directory must already exist. Retain the JSON and the trusted pin; changing Markdown does not update either one.

For actual chain event verification, follow the [retained local TKM replay](../evidence/video-v17-2026-10-22/README.md). The new export command does not verify blockchain, independently establish reviewer identity, or authenticate an untrusted pin. A `NOT_VERIFIED` chain result must remain explicit.

## Acceptance checklist

- [ ] Plan parameters and exact selected source IDs are inspectable.
- [ ] A capacity comparison does not silently replace the active queue.
- [ ] Source, snapshot, exact claim and UTC period are consistent.
- [ ] Missing evidence is expressed as a concrete request with acceptance criteria.
- [ ] Unassigned work and missing deadlines remain visible, not inferred.
- [ ] The reviewer decision and its original JSON can be retained.
- [ ] New evidence recommends review without rewriting the frozen determination.
- [ ] An edited decision fails against the original trusted pin.
- [ ] The handoff is reviewed for confidentiality before sharing.

These are task acceptance criteria, not a usability-study score. Record failures and assistance separately if the checklist is later used with independent participants.

## Recovery and operational limits

| Condition | Next step |
|---|---|
| Reviewer control unavailable | Use anonymous rules, configure authorized local review, or run the isolated DEMO. Do not bypass authorization. |
| Store/revision conflict | Reload the current revision; preserve the draft and resolve the conflict explicitly. |
| No source-specific post-action evidence | Request it; preserve insufficient evidence rather than assuming repair failed or succeeded. |
| No trusted digest | Obtain the pin through a separately trusted channel. A digest chosen by the downloaded file cannot independently authenticate that file. |
| Imagery unavailable | Use the source table, coordinates, observation records and imagery fallback. Basemap tiles are not methane evidence. |
| No provider or chain | Use rules/manual review and offline trusted-digest verification; label the unavailable integration. |
| Public preview restarts | Treat state as temporary. Retain allowed exports; use local backed-up state for private work. |

One writer and process-local limits are deliberate prototype constraints. Current storage limits include 500 work items, 100 revisions per item and 40 evidence events per revision. Their existence does not prove load tolerance or suitability for a multi-organization deployment. Human effectiveness, concurrent-user scalability and field mitigation outcomes remain open validation areas.
