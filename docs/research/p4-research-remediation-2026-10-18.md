# P4 — Research Finding Remediation Results

[Intake and initial reproduction](p4-research-bundle-assessment-2026-10-18.md) · [Implementation plan](../plans/2026-10-18-p4-research-remediation.md) · [v2 package and evidence](../evidence/domain-review-remediation-2026-10-18/README.md)

**Date:** 18 October 2026. **Result type:** engineering fixes and scope decisions for F01–F13. Domain assessment, report authenticity, and physical outcomes remain unverified. This ledger is not an expert response or permission to use a report.

## Changes available for use

1. The baseline displays **Required references present**, **Contrary reference present**, or **Insufficient reference coverage**. Codes `supported`/`contradicted` remain for compatibility. `mitigation_confirmed` is a claim question, not a facility status.
2. New bundles bind `assessmentSemantics`: metadata/human/model basis and `physicalVerification: not_established_by_application`. API, browser, and CLI reject false semantics even if a hash is recomputed. Human review of model output still uses the model basis.
3. New notification/mitigation assessments require scope. Legacy baseline requests remain accepted, but without scope return insufficient with an explicit reason. Stored bundles are not reassessed or rehashed.
4. Primary/contrary/follow-up pointers are checked. Real evidence requires valid HTTPS without credentials; `fixture://` is for DEMO only. A valid pointer does not prove the URL is live, the document is authentic, or action/asset semantics are related.
5. Calendar dates are checked strictly; offset timestamps normalize to UTC day. MARS timestamps without offset are treated as UTC. Resolver, baseline, human observation linkage, scope picker, inventory, and verifier use the same helper. Periods are inclusive; follow-up cannot be before the action or after the scope end.
6. Invalid URLs in human input return HTTP 400. Primary and follow-up references no longer throw an exception/500.
7. UI, history, report preview, brief, and public summary explain evidence basis and physical limits. Unproven claims of human independence were removed. The schema 1 public-summary payload remains unchanged; added explanation is in the view.

## Disposition of each finding

| ID | Decision and action | Evidence / actual remaining work |
|---|---|---|
| F01 | Technically addressed: separate metadata coverage from human/model determination and physical verification; bind basis to hash. | Semantics/presentation/export tests. Wording sufficiency and physical-evidence requirements remain for experts; complete-looking false metadata does not become an authentic claim. |
| F02 | Require a valid contrary pointer matching claim/date/scope; label says only that a contrary reference exists. | M09 replay is now insufficient. The app does not automatically read report contents; reviewer remains responsible for assessing substance. |
| F03 | Require scope for all new notification/mitigation evaluations, including direct function calls. | M08 now insufficient; legacy requests do not error and cannot return supported without scope; old hashes remain valid. |
| F04 | Keep source/event membership and date checks; human basis says inspection is self-attested. Baseline does not equate an action field with physical outcome. | M17 insufficient; M18 may still pass metadata coverage and always has physical verification not established. Validating text relevance requires source inspection, not keyword heuristics. |
| F05 | Existing control retained: `notified` flag is not proof of receipt. Scope names the recipient; R02 remains insufficient. | No fabricated sent/delivered/received log. Official notification delivery and receipt integration are new work requiring a separate channel/authorization. |
| F06 | Publisher links, assessed citations, and historical context stay separate; report/brief explains each status. | An insufficient result on supplied material does not contradict the publisher. No report linked but unread was copied or described as read. |
| F07 | Keep non-detection unknown; explicitly state physical verification is not established by the app. | No estimate of emission reduction/zero methane/valid denominator without data. D06 remains insufficient; scientific and field benefit are unproven. |
| F08 | Fixed: strict UTC/calendar helper is used across decision layers. | M12/M13, offset resolver, scope UI, and export verifier; report date remains publication date, not action/follow-up date. |
| F09 | Fixed: trim and lowercase recipient on both sides. | M11 is now supported metadata; wrong recipient remains insufficient. |
| F10 | License/attribution controls retained; no rights change, report reproduction, or new commercial use. | CC BY-NC-SA notice/provenance appears in both packages; app makes no legal determination about permission beyond current purpose. |
| F11 | Held as an unverified source question; no confirmation month was invented and no frozen dataset was replaced. | Reopening ARG item timed out again through web tool on 18 October. `reportDate: 2023-11` remains publication metadata, not a confirmation date. Expert/publisher should clarify the suspected March/May difference. |
| F12 | v2 package is ready for phases A/B/C with empty human form/ledger; v1 remains historical. | **0 experts / 0 sessions / 0 human results.** Human review and recheck remain incomplete external work. |
| F13 | Fixed: URL validator handles parse failure safely. | Schema/handler regressions for both fields: spaces/malformed/HTTP/credentials → 400; valid HTTPS accepted. |

## Reading the 30-experiment replay

`apps/api/src/p4-research-replay.test.ts` uses 12 unchanged v1 inputs and 18 locally reconstructed variants. The JavaScript code from the research ZIP was not run. The twelve base outputs remain 3 supported metadata, 1 contrary, and 8 insufficient. Deliberate changes:

| Variant | Before | After | Reason |
|---|---|---|---|
| M03 / M04 | supported | insufficient | Primary/follow-up pointer missing or empty |
| M08 | supported | insufficient | Scope required |
| M09 | contradicted | insufficient | Contrary pointer missing |
| M11 | insufficient | supported metadata | Symmetric recipient normalization |
| M13 | supported | insufficient | Instant falls on 1 October UTC, outside 30 September scope |

Syntactically valid fake URLs, false titles, or irrelevant actions (M01/M02/M10/M14/M18) may still pass **metadata coverage**. This is an explicitly recorded limit, not scientific verification. Tests do not describe those outcomes as physical truth or model accuracy.

## Compatibility and completion limits

Old bundles without the semantics field remain accepted with unchanged bytes. A new revision from a legacy model parent gets a model basis before hashing; the parent remains unchanged. v1 and P1–P3 evidence packages retain their bytes. Historical code bindings may differ from the new checkout; use the v2 manifest for this version.

Engineering fixes do not complete the five P4 human-results checklist items. Those require a relevant expert to review a specified package, material findings to be addressed and rechecked, and consent for the summary. No P5 user pilot, P6 AI benchmark, or public Sepolia receipt was produced by this work.
