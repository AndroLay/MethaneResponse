# P4 domain-expert review checklist

**Version:** P4-checklist-2026-10-18-v1. **Date:** 18 October 2026. Companion to [P4-2026-10-18-v1 package](../evidence/domain-review-remediation-2026-10-18/README.md). Record both versions if this checklist is used in a session.

Review objective: assess whether MethaneResponse's method, data interpretation, and language are suitable for a historical-evidence investigation prototype. A human expert conducts the review within their competence; the team prepares the materials and handles findings.

## How to use this checklist

1. The facilitator checks prerequisites and provides the reviewer ZIP.
2. The expert reads the brief, evaluates the cases, and fills out the form **before seeing the case-specific baseline**.
3. The facilitator provides the comparison ZIP; the expert records differences and reasons.
4. The team fixes material findings; the expert rechecks the changes.
5. The final summary records results, unassessed areas, and publication permission.

Use the statuses **adequate for scope / needs improvement / cannot yet be assessed**, with reasons. If a section is outside the expert's competence or materials are unavailable, record the limit and the additional reviewer/evidence needed. A checkmark means an item was reviewed, not that it is automatically correct or passed. All boxes below remain unchecked; this is not a review result.

## 1. Qualifications, independence, and version

**Owner:** facilitator with the expert.

- [ ] Relevant experience in methane/MRV, remote sensing, or evidence auditing can be demonstrated; expertise scope and areas outside competence are recorded.
- [ ] Relationships with the team, development roles, and conflicts of interest are disclosed. The independent expert is not a product author or AI agent.
- [ ] Package version, data snapshot, checksum, date, and materials actually reviewed are recorded.
- [ ] Willingness to participate is obtained before the review; identity, contact, and consent are stored privately.

**Output:** private qualification/scope record and review-version identity. Public name/affiliation require separate permission.

## 2. Data origin and traceability

**Question:** Can each piece of information be traced to its original source and record?

- [ ] Historical UNEP IMEO/MARS metadata is clearly separated from six fabricated cases labeled DEMO.
- [ ] Source ID, plume/observation ID, timestamp, unit, and case value match the referenced source data.
- [ ] Historical snapshot and reference-page check date are distinguished; a newly read page is not treated as a dataset update.
- [ ] Dataset attribution/license and limits on publisher-report rights are recorded. A report link is not treated as permission to copy its contents.

**Materials:** [cases](../evidence/domain-review-remediation-2026-10-18/reviewer/03-cases.md), [JSON](../evidence/domain-review-remediation-2026-10-18/reviewer/cases.json), [source register](../evidence/domain-review-remediation-2026-10-18/reviewer/05-source-register.md).

## 3. Separation of response stages

**Question:** Does each conclusion remain within the response stage supported by the available evidence?

- [ ] Detection, source attribution, notification, stakeholder response, mitigation action, and follow-up are distinguished.
- [ ] A `feedback` flag is not used alone to claim equipment repair or emissions reduction.
- [ ] An aggregate notification flag is not converted into a claim that a specific recipient received a notification about a specific event.
- [ ] Product function is described according to the work actually performed: organizing and assessing historical evidence.

**Output:** workflow sections/statements that are adequate or need correction, with domain rationale.

## 4. Source, event, period, and recipient scope

- [ ] Evidence refers to the same source and, when specified, observation ID as the claim.
- [ ] Observation, notification, action, follow-up, and report publication dates are not conflated.
- [ ] Evidence outside the period is described accurately; the effect of calendar-day boundaries in the rules is checked.
- [ ] Notification recipient and claim specificity match the available evidence.
- [ ] Every sentence in the exact claim is assessed substantively. A matching reference type and scope alone do not prove the whole sentence is fully supported.

**Output:** correct scope, mismatched evidence, and suggested claim separation if needed.

## 5. Meaning of decision labels

**Question:** Are `supported`, `contradicted`, and `insufficient_evidence` appropriate to the materials and clear enough for readers?

- [ ] `supported` does not imply greater physical certainty than the material reviewed warrants.
- [ ] `contradicted` has a relevant, checkable basis; absence of evidence is not evidence of contradiction.
- [ ] Conflicting support/contradiction is handled with a clear rationale, without selecting the outcome most favorable to the project.
- [ ] Insufficient evidence and inability to assess can be reported without forcing a yes/no result.
- [ ] The name `mitigation_confirmed` and the risk of case D05 are critically assessed. The expert may request a different label or a substantive evidence gate.

**Materials:** brief and method excerpts in the reviewer ZIP. Baseline output is read after the initial assessment.

## 6. Adequacy of action and follow-up evidence

- [ ] The relationship between the claim, action, time, location/source, reference document, and post-action observation is checked.
- [ ] Complete metadata fields are distinguished from document authenticity, content relevance, and measurement quality.
- [ ] D02/D03/D05 are used to assess fabricated-evidence risk, conflicting evidence, and administrative completeness.
- [ ] If a physical check requires report contents, sensor data, or inspection materials not included, that need is recorded without substituting a conclusion.

**Output:** minimum evidence needed for a stronger conclusion and controls that should be improved.

## 7. Uncertainty and missing observations

- [ ] Flux in kg/h and standard deviation are read in the correct units; standard deviation is not automatically described as a confidence interval.
- [ ] Coverage, observation opportunities, and attribution limits are considered within the expert's competence and the available materials.
- [ ] Absence of a later plume/record is not treated as zero emissions or proof of successful mitigation.
- [ ] Historical observation samples are not used to calculate cumulative emissions reductions without adequate method and data.

**Output:** suitable uncertainty language and inferences that need limits.

## 8. Comparison with publisher interpretation

- [ ] Publisher item title/metadata is distinguished from reviewing the report contents and from an independent assessment.
- [ ] Conclusions are limited to materials actually read. An incomplete package does not automatically contradict the publisher's conclusion.
- [ ] Interpretation differences are explained with a traceable URL/locator, scope, and domain basis.
- [ ] An unavailable report or unclear usage rights are recorded as review limits.

**Main cases:** R03–R06.

## 9. Actionable follow-up

- [ ] The next evidence request identifies the requested evidence, relevant party/role, and connection to the evidence gap.
- [ ] The request distinguishes evidence of action, notification evidence, and follow-up measurements.
- [ ] Suggestions do not exceed the user's mandate or imply that the application has sent an official notification.
- [ ] Priorities and action limits are stated, including what cannot be determined from metadata.

**Output:** revised next evidence requests by case if needed. Practical usefulness to users still requires a P5 pilot.

## 10. Meaning of trust, reviewer identity, and integrity

- [ ] Reviewer authority in the directory is distinguished from verification of competence, independence, and correctness of the review.
- [ ] Hashes, digests, and receipts are described as integrity/version evidence; they do not certify physical conditions or claim content.
- [ ] A local Anvil receipt is distinguished from an unavailable public Sepolia transaction.
- [ ] Publication/correction/withdrawal status is distinguished from an offline file-checksum check.

**Division of work:** the expert assesses adequacy of meaning and risk of misinterpretation. The technical team provides relevant operational evidence. P4 documentary review does not cover all security or deployment testing.

## 11. Privacy, publication permission, and benefit limits

- [ ] Private materials, reviewer identity, and restricted documents are handled through agreed channels.
- [ ] Participation consent is separate from permission for summaries, quotations, names, and affiliations; public text is approved separately.
- [ ] Public output consistently states limits on historical metadata, DEMO, uncertainty, and unchecked material.
- [ ] Claims about user benefit, AI accuracy, or emissions reductions do not exceed available results. P5/P6 have separate checks.

**Output:** required language corrections and permitted publication scope.

## 12. Findings, fixes, and recheck

- [ ] Each finding has an ID, case/domain, version, basis, consequence, and proposed change/evidence.
- [ ] Severity is recorded: critical for serious physical-conclusion risk/private disclosure; major for important changes to assessment/scope/evidence; minor for clarity that does not change the conclusion.
- [ ] The team records whether it accepts, rejects with a reason, or defers; unresolved material findings remain visible.
- [ ] Material changes are rechecked by the expert against a known version. Adding a disclaimer alone does not resolve a substantive concern.
- [ ] The summary lists cases reviewed/skipped, assistance/additional materials, fixes, recheck status, and limitations.

**Output:** findings ledger, fix references, recheck results, and approved summary. P4 is complete after an actual review, material findings are closed, and the fixes are rechecked as required by the [protocol](domain-expert-review.md).

## Review map for 12 cases

This table directs attention; it does not set the correct answer or expert label.

| ID | Review focus |
|---|---|
| R01 | What can be inferred from a detection record for a specific event; attribution and uncertainty limits |
| R02 | Whether notification metadata supports a claim about a specific recipient and event |
| R03 | Relationship between historical KAZ_S_159 metadata and the publisher item; additional materials needed to assess action/follow-up |
| R04 | Chronology of April observations and the July publisher item for CAN_S_002 |
| R05 | Limits of one observation for LBY_S_143 and the publisher link |
| R06 | Limits of assessing ARG_S_055 when report contents and usage rights are unavailable |
| D01 DEMO | Matching notification reference, date, event, and recipient |
| D02 DEMO | Adequacy of an explicit contrary reference and risk of fabricated metadata |
| D03 DEMO | Handling conflicting supporting and contrary evidence |
| D04 DEMO | Effect of follow-up outside the claim period |
| D05 DEMO | Whether complete fields are enough for the label used; required authenticity/content controls |
| D06 DEMO | Suitable conclusion when evidence and follow-up observations are empty |

## Response format and minimum result

Fill in the [expert form](../evidence/domain-review-remediation-2026-10-18/reviewer/04-response-form.md) on a private copy. For each case, record:

1. Initial conclusion and its scope/limits.
2. Rationale and reference/locator actually reviewed.
3. Next evidence needed.
4. Uncertainty or areas that cannot yet be assessed.
5. After the baseline is provided: differences of opinion and their causes.

For each finding, record **ID → risk → required change/evidence → team action → fix version → expert recheck**. The [ledger template](../evidence/domain-review-remediation-2026-10-18/maintainer/findings-template.csv) and [summary template](../evidence/domain-review-remediation-2026-10-18/maintainer/review-summary-template.md) are available.

Minimum results are a traceable assessment, findings/fixes list, material recheck, and summary with clear limits/permissions. There is no target score or requirement to agree with the baseline. Skipped cases must still be reported.
