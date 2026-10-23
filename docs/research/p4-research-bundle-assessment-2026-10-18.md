# P4 Research-Bundle Assessment — 18 October 2026

**Type:** AI-assisted research triage and local implementation inspection. **P4 status:** human review has not occurred. This document records checks of the bundle supplied by the user and differences from repository context.

[P4 checklist](../testing/p4-review-checklist.md) · [Frozen review package](../evidence/domain-review-preparation-2026-10-18/README.md) · [Human protocol](../testing/domain-expert-review.md)

## Materials received

Original archive: `/home/andro/Downloads/MethaneResponse-P4-research-bundle-2026-10-18.zip`, 15,222 bytes.

SHA-256: `e4a014622a37933161e7449cf8c6bef80b66ff24aab8acdca905e29272223d73`.

Five files contained a README, research report, CSV of 30 experiments, CSV of 12 OPEN findings, and JavaScript port of a ZIP review-method snippet. Archive CRC passed; there were no absolute/traversal paths or encrypted members. All documents/code were read locally. Scripts in the archive were not executed.

The report says its assessment was AI-assisted, without access to the full repo or the Phase B baseline package. Those limits match the supplied input. The claim that the comparison ZIP had not been received is not evidence that no comparison ZIP existed in the repo.

## Checks performed

1. Read all five archive members, including all M01–M18 changes and F01–F12 ledger entries.
2. Compared findings with current `assess`/`claimEvidence` functions, evidence/scope/human-input schemas, API routes, and web presentation.
3. Reconstructed 12 cases and 18 changes in a temporary checker, then imported the repository's actual TypeScript functions. The ZIP's ported code was not used as an executable.
4. Compared function outputs with all 30 CSV results. Tested human-input schema parsing on a DEMO fixture; this is not an expert-assessment record.
5. Reproduced the URL issue on the Hono handler via `app.request`, fixture authorization, and `MemoryAuditStore`. No network server, deployment, persistent storage, or provider was used.
6. Checked primary sources for MARS dictionary context and publication metadata cited in the report. Did not read or copy publisher-report PDFs.

## Main result

**All 30 of 30 raw function results matched** the CSV: 12 base cases and 18 changes. This confirms program behavior on those inputs. It is not scientific accuracy, 30 field observations, human gold labels, or evidence that 30 API requests would be accepted.

### Raw function behavior versus current application validation

| Case | Raw function result | Current input-layer result |
|---|---|---|
| M03: reference removed | `supported` | Evidence schema and human input reject the missing reference |
| M04: follow-up reference contains spaces | `supported` | Human-input validator throws `TypeError`; additional bug F13 below |
| M08: scope removed | `supported` | `HumanAssessmentInput` requires scope. Legacy baseline accepts optional scope |
| M09: contrary reference removed | `contradicted` | Evidence schema and human input reject the missing reference |
| M11: extra spaces in recipient scope | `insufficient_evidence` | Scope schema trims spaces; parsed baseline becomes `supported` |
| M13: offset timestamp in human reference | `supported` | Human input accepts calendar dates, so that timestamp is rejected; generic evidence function still uses date-substring behavior |

Six variants are rejected by schema validation: M03/M05/M08/M09/M12/M13. M04 raises an exception rather than a handled validation rejection. Distinguish this when reporting results.

Human input was constructed from a DEMO fixture with locator and required fields to test parsing. Successful parsing does not prove authentication, source resolution, or endpoint acceptance. The baseline route also does not accept arbitrary evidence arrays in requests; evidence is retrieved from the server source.

## F01–F12 triage

All dispositions below are the implementer's assessment of the report; they are not resolved status or expert rechecks.

| ID | Repository comparison | Follow-up |
|---|---|---|
| F01 | Label-meaning risk is relevant. Baseline reads only type/scope metadata; UI and bundle already state limits and separate human assessment. | Prioritize expert review of wording/status sufficiency and substantive evidence gates. Do not treat complete fields as physical verification. |
| F02 | Contrary tags determine function output; a missing-reference variant is rejected by schema. Document substance is not automatically checked. | Keep input control; review exact claim/content relationship and reviewer accountability. |
| F03 | The no-scope bypass is reproducible in the raw function. Human input requires scope; legacy baseline compatibility is covered by existing tests. | Consider strengthening the function without silently breaking legacy bundle/API compatibility; do not call it a human-endpoint bypass. |
| F04 | Baseline does not test action-text semantics. Human input checks `sourceId`; assessment creation also checks observation membership. | Review sufficiency of action/asset/document-content linkage. Narrow any claim that no linkage exists. |
| F05 | R02 is indeed insufficient. Aggregate notification is separated from recipient evidence in code/UI. | Include in interpretation review. A sent/delivered/received event log is a proposed follow-up feature/integration, not an agreed new requirement. |
| F06 | Publisher links, metadata, and assessed references are distinguished; this input did not reproduce automatic mixing. | Ask an expert to assess presentation sufficiency. Do not immediately call a mixing bug confirmed. |
| F07 | Non-detection, feedback, and emission-reduction claim limits are explained. This package has no valid-observation denominator or reduction estimate. | Review wording/next-request sufficiency. Additional MRV calculations need separate data and methods. |
| F08 | Date-substring behavior is confirmed in the generic function; human timestamp variant is rejected by date schema. | Define the time contract before changing normalization; distinguish a human calendar date from a publisher observation instant. |
| F09 | Trim asymmetry exists when calling the function directly; scope schema already trims. | Not reproduced on parsed input. Direct-function strengthening can be considered as extra defense. |
| F10 | Dataset license and use limits are recorded in data/package. | Retain attribution/rights limits; commercial-use decisions need separate review for the intended purpose. |
| F11 | The ARG metadata month difference could not be reverified on the primary page in this check. | Leave unverified. Preserve case period; do not add a guessed confirmation month. |
| F12 | Human experts/results/recheck are indeed absent. Comparison ZIP was available and intentionally supplied after Phase A. | P4 remains in progress; run the human phase under its protocol when experts are available. |

## Additional finding F13 — invalid URL produces a server error

**Status:** locally confirmed, not fixed at the time of this intake. **Type:** input-handling bug; first technical priority from this intake.

`SecureReference` calls `new URL(value)` inside `.refine` without handling parse failure. With the installed Zod dependency, this later refinement can still run after the string failed the preceding URL check. Consequently, `safeParse` can throw `TypeError`.

Reproduction used two authorized DEMO requests to `/api/human-assessments`, with a non-URL value:

| Field changed to five spaces | Actual status | Expected behavior |
|---|---|---|
| `evidence[0].reference` | **HTTP 500** | Reject invalid input with **HTTP 400** |
| `evidence[0].followUpReference` | **HTTP 500** | Reject invalid input with **HTTP 400** |

The error occurs during parsing, before assessment storage. It does not show a bypass that creates a valid assessment or establishes physical truth. The local request used an in-process fixture identity, not an expert identity or operational configuration change.

**References:** [validator](../../packages/shared/src/index.ts#L236), [route parsing](../../apps/api/src/app.ts#L650).

**Fix to test:** invalid URL strings should produce safe validation failure; retain HTTPS requirements and rejection of credentials in the URL. Regressions should include primary/follow-up references, empty/space/malformed strings, prohibited schemes, URLs with credentials, and valid HTTPS URLs. Do not mark this finding fixed until changes and checks are complete.

## Primary sources and reading limits

- [MARS dictionary](https://methanedata.unep.org/dict-mars-plumes), checked 18 October 2026: supports source/plume separation, flux/SD units, aggregate flags, requantification note, and license notice. This document does not alter the frozen case snapshot.
- [PubMed record for Reuland et al.](https://pubmed.ncbi.nlm.nih.gov/42875571/): title/DOI, publication date, and abstract counts of 746 events and 12 satellites support the identity of the research cited in the bundle. Those values are not transferred to MethaneResponse performance. The full Nature article could not be opened through the tool because of an authentication redirect; no full methodology or supplementary-data review was done.
- The [ARG publisher item](https://wedocs.unep.org/handle/20.500.11822/44120) could not be reopened through the tool; the suspected March/May difference is not treated as a verified fact.

## Follow-up order

1. Fix F13 with input regression and handler checks; record new evidence without overwriting old evidence.
2. Consider stronger reference/follow-up completeness in raw functions and legacy-scope compatibility. Test function and input layers separately.
3. Bring F01/F02/F04 risks and F05–F08 wording sufficiency to domain review. Status/schema changes need compatibility design and appropriate evidence.
4. Continue human phases A/B/C, material fixes, and rechecks. This research is additional input; expert results are still unavailable.

No application function changed during this intake. Frozen P4 documents/ZIP retain their source bytes, versions, and checksums. This local review did not rerun the full P3 gate/browser or satisfy P5 pilot/P6 benchmark requirements.
