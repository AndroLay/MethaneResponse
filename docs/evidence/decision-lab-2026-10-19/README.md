# Evidence Decision Lab — 19 October 2026

Prototype increment from baseline `8e19c034e666a6b00d93b4cb3f5747f563c75aab`. [verification.json](proof/verification.json) binds runtime source/regressions by SHA-256. This historical record does not claim that the increment was pushed or deployed. Earlier evidence, video, and judging packages were not rewritten.

## Decisions that can be inspected

**Product question:** which references change the decision, and what evidence should be obtained next?

| Capability | Implementation and boundary |
|---|---|
| Eligibility trace | Explains supporting, contrary, and excluded references using the baseline policy. Dates/events/recipients and action/follow-up remain required by category. Eligible metadata does not authenticate document contents. |
| Sensitivity | Remove one ID and rerun policy: at most eight individual dependencies and one aggregate removal. Omitted individual dependencies are counted explicitly. Not a repair probability, scientific uncertainty estimate, or forecast. |
| Evidence request | Markdown draft with source/scope, snapshot/hash, attribution/license, limitations, and acceptance checks. No email or automatic work-status change. |
| Replay | Download input, trace, sensitivity, policy version, and digest. Browser/CLI verify checksum and recalculate. Unsigned; authenticity requires a separately trusted issuer/commitment. |
| Human handoff | Explicit actions to human assessment/follow-up for the selected investigation. Reviewer authorization and audit schemas 2/3/4 are preserved. |
| Authored challenges | Five separate DEMO fixtures: complete, missing follow-up, out-of-period, contrary, and conflict. They do not replace real-case audits or metadata. |

No database, frontend model, contract, or dependency was added. The API limits bodies to 16 KiB and analysis to 20 requests/minute/client with a separate limiter. Evidence comes from the server snapshot; client-injected evidence/provenance is rejected. Analysis does not write audits, call an AI provider, or fetch external documents.

## Try it in the application

Follow [local setup](../../development/local-setup.md) and open `/dashboard/audit?sourceId=KAZ_S_159`.

1. Select `source_detected`, then **Decision Lab → Explain current evidence**. Three source-level detection references meet policy. Removing all eligible references produces insufficient evidence.
2. Apply UTC day `2024-06-07` in scope controls and rerun. Only one of three references is eligible; the others fall outside the period. Removing that reference changes the result.
3. Select a mitigation claim for the appropriate period, inspect action/follow-up checks, and download the evidence request. Insufficient evidence describes gaps in loaded references; it does not prove that no repair occurred.
4. Open synthetic challenges. **Complete reference metadata** produces required references present; **missing follow-up** produces insufficient; **contrary** produces contrary reference present; **conflict** produces insufficient with an adjudication request. Out-of-period also produces insufficient.
5. For conflict, remove support → contrary; remove contrary → supported; remove both → insufficient. These are replayable policy changes, not environmental events.
6. **Return to selected MARS source** restores real context. Continue to human assessment/follow-up, copy the reviewed draft, and save through the existing workflow.

Apply draft scope before analysis. Source/claim/scope/snapshot changes clear results and invalidate old requests. Loading, unavailable source, stale snapshot, preview permission, rate-limit, clipboard fallback, and error states are covered. Trace starts with 20 rows and adds 50 per action. The Decision Lab chunk loads when opened.

## Recorded results

- [Six historical analyses and source binding](proof/verification.json): detection and mitigation for KAZ_S_159, LBY_S_143, CAN_S_002. Detection was supported; mitigation insufficient against loaded references. **6/6 matched the saved baseline**: small same-policy conformance, not independent-gold accuracy.
- [KAZ evidence request](proof/KAZ_S_159-mitigation_confirmed-request.md) records snapshot `unep-mars-675417694883`, archive hash, and license. JSON/requests for the other sources are alongside it.
- [Five DEMO challenges](proof/DEMO-conflict.json) use authored source `DEMO_DECISION_LAB`; no real operator, measurement, or repair is represented.
- [Four CLI checks](cli-verification.json): original replay and matching expected digest accepted; changed contents and wrong expected digest rejected.
- [Actual Anvil transactions](local-chain-proof.json): local deployment and KAZ_S_159 detection-audit anchor; a separate verifier accepts the original and rejects an altered **and rehashed** report because receipt/event retain the original commitment. Historical receipts, forged issuer, revert, SIGKILL before/after broadcast, and lost RPC acknowledgement are also recorded. Disposable chain **31337**, not Sepolia; RPC does not remain running afterward.

CAN_S_002 has an official mitigation-report link in the UI. This trace checks loaded reference metadata, not separately licensed report contents. Insufficient evidence neither disputes the publisher nor asserts that the facility was not repaired.

## Checks and reproduction

[checks.json](checks.json) and [actual output](checks-output.txt) distinguish local/remote status. Main gates: **735 tests** (210 API, 255 web, 54 tooling, 212 Python, 4 Foundry), frozen install, API/web/E2E/evaluation typecheck, production build, bundle budget, and baseline conformance. **26 browser scenarios** passed in one complete invocation (17 main + nine private/team/publication/mock-provider), without skips/automatic retries. Four runner helpers and one chain integration/42 assertions are separate; focused repeats are not added.

```bash
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
bun run test:chain-integration --evidence /tmp/methane-new-chain-proof.json
bun run prove:decision --output /tmp/methane-new-decision-proof
bun run prove:decision --verify docs/evidence/decision-lab-2026-10-19/proof/KAZ_S_159-source_detected.json
```

The proof output directory must not exist; overwrite is refused. `--expected-digest 0x…` compares against a commitment obtained through a trusted channel. Future replay requires the recorded policy implementation. This new format does not replace historical bundles/receipts.

Local Bun was **1.4.3**, repository pin 1.4.2. Checks record local Python, Foundry, and Chromium versions. Browser used SwiftShader with sandbox enabled; mobile means viewport emulation, not a physical phone or FPS benchmark.

Actual screenshots: [real source, desktop](decision-lab-real-desktop.png) · [DEMO conflict, mobile](decision-lab-challenge-mobile.png). Separate focused captures are not extra full-suite scenarios.

## Change map

| File | Responsibility |
|---|---|
| [Shared policy](../../../packages/shared/src/decision-lab.ts) | Schemas, eligibility trace, bounded sensitivity, digest/replay, authored fixtures; additive package subpath |
| [API](../../../apps/api/src/app.ts) · [regressions](../../../apps/api/src/decision-lab.test.ts) | Two nonpersistent routes; source/snapshot, preview/input/rate-limit boundaries |
| [Panel](../../../apps/web/src/DecisionLabPanel.tsx) · [client/export](../../../apps/web/src/decision-lab.ts) | Lazy step, error/permission states, replay/export/handoff, responsive styles |
| [Proof runner](../../../scripts/decision-lab-proof.ts) | Six historical plans, five challenges, baseline parity, source hashes, CLI verification |
| [Browser policy](../../../scripts/e2e-runner-utils.ts) · [E2E](../../../e2e/audit-workflow.spec.ts) | Hosted-runner compatibility, local sandbox, credential isolation, workflow/capture regressions |
| [Chain integration](../../../scripts/chain-integration.test.ts) | Actual local transaction and rehashed-tampering rejection for a real-source audit |

No database migration or Solidity change. Historical schemas/receipts remain; DecisionPlan schema 1 is a separate analysis artifact.

### CI and handled failures

- Baseline [GitHub Actions run 39237532964](https://github.com/AndroLay/MethaneResponse/actions/runs/39237532964) failed before E2E assertions: `No usable sandbox`. The new policy disables sandbox only when `CI=true`, `GITHUB_ACTIONS=true`, and `RUNNER_ENVIRONMENT=github-hosted`. Local, self-hosted, and unknown CI retain sandboxing. Four helpers check policy/credential isolation. **No remote run for this increment was available at this checkpoint.**
- Initial gates found a new DEMO endpoint bug: extra source fields were passed to strict input. Explicit field selection fixed it; 20 successful requests/21st rate-limit regression and final suite passed.
- Initial browser execution lacked socket permission. Approved host access was used while retaining Chromium sandboxing.
- First full browser run: 16 pass/one fail; trace showed `ERR_NETWORK_CHANGED` fetching a local module before rendering, not an incorrect document assertion. No skip, automatic retry, or weaker assertion was added. A complete rerun is recorded separately.
- Read-only code review found missing provenance/license in exports; plan/UI/Markdown/regressions were fixed. Suspected literal `\\n` was checked against source bytes/newline tests and was not established; serialization did not need changing.

## Boundaries and next steps at this checkpoint

1. Publish approved changes and check Actions on the new revision. Local configuration fixes are not remote CI success.
2. Updated submission material should demonstrate dependency/conflict and local-chain rehashed tampering. Historical v12 lacks these steps.
3. Expert review/human pilot remain deferred. This increment does not establish external-provider AI, user time/accuracy gains, or emission reductions.

The increment clarifies decisions and evidence needs. Test counts and fixtures establish neither competition ranking, successful repairs, nor AI superiority over rules.
