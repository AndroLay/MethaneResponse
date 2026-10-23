# MethaneResponse Candidate Audit

**Reviewed:** 11 October 2026 (WITA)

**Method:** two independent agent audits (MARS/IEA and Carbon Mapper), followed by cross-checks against official sources.

**Purpose:** test the claim that MethaneResponse is the best and sufficiently differentiated choice for IEEE ClimateChain.

## Short verdict

**The problem is real and the data are promising; the claim that this concept is the newest or best choice has not been established.** The proposal's focus on AI detection, attribution, alert-to-action, response tracking, and satellite verification overlaps with functions already carried out by MARS/Eye on Methane and Carbon Mapper. Do not make MethaneResponse the primary choice solely on a heuristic score such as 9.18/10: that is not the official rubric, a test result, or evidence of winning potential.

MethaneResponse remains a **conditional candidate** if it narrows to an unmet need and demonstrates that need in the first two days. There is currently no evidence that a blockchain ledger or additional AI would improve response or mitigation.

## Verified facts

### 1. The 12% figure is not a mitigation rate

The IEA says about 12% of MARS notifications in 2025 received a response. This measures *feedback/response*, not 12% successful mitigation or 88% of cases left without mitigation. In UNEP's public metric, response is counted as emission sources receiving a response relative to sources alerted in a rolling 12-month period; data are released with roughly a two-month delay. A response may include an investigation, emission cause, status, and mitigation action that is completed, underway, or planned. **A response does not automatically mean the action was completed and verified.**

The official August 2026 MARS report separately says that more than 40 large sources had undergone confirmed mitigation. UNEP says these cases involved technical assessment of the response and follow-up satellite observations that no longer detected emissions. The accurate framing is therefore “the response rate remains low, while some mitigation cases have also been confirmed,” not “MARS does not turn alerts into action.”

Sources: [IEA, responding to MARS notifications (4 May 2026)](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [UNEP response metrics](https://methanedata.unep.org/story-MARS-snapshot), [August 2026 MARS snapshot](https://methanedata.unep.org/downloads/top50_emitters/latest/mars_snapshot_latest.pdf), [MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes).

### 2. The proposed core workflow is already part of existing systems and guidance

MARS already detects and quantifies emissions, uses AI models alongside expert analysis, attributes sources to facilities/operators, notifies governments/companies, requests feedback, monitors sites after notification, and publishes response status through Eye on Methane. Public data generally appear after 30 days. The Eye on Methane // INSIGHTS portal also gives authorized government users more detailed notification history and feedback status.

The IEA–IMEO guidance dated 4 May 2026 already proposes five steps very similar to the MethaneResponse workflow: receive/assign/classify an alert; contact the operator; receive a response; verify follow-up; then document the case. The guidance is non-binding and emphasizes the need for government authority and resources.

Carbon Mapper also provides detection, quality triage, repeat-source/persistence grouping, sector/source attribution, an API, and STAC. Its API lists a *limited beta* for operator reports, including investigation, repair, and verification status. Carbon Mapper explicitly says operator reports are voluntary, are not verified or endorsed by Carbon Mapper, and may not be validated emissions data. In 2025, Carbon Mapper reported 60 notifications for more than 50 sources and confirmed mitigation at 10 sources through verification by government agencies, operators, and follow-up observations. Carbon Mapper also announced a partnership with IMEO/MARS in June 2026.

Sources: [how MARS works](https://methanedata.unep.org/methane-alert-response-system), [MARS FAQ](https://www.unep.org/topics/energy/methane/international-methane-emissions-observatory/mars-frequently-asked-questions), [IEA–IMEO guidance](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [Carbon Mapper Product Guide](https://carbonmapper.org/articles/product-guide), [Carbon Mapper API](https://api.carbonmapper.org/api/v1/docs), [Carbon Mapper program history](https://carbonmapper.org/articles/tanager-1-two-years-of-turning-satellite-data-into-methane-action).

### 3. Real data are available, but API access is not frictionless

Carbon Mapper provides plume and source observations with time, coordinates, sector, emission estimates, uncertainty, and recurrence/persistence metrics. Its Product Guide says standard plume/source products are generally published about 30 days after acquisition; faster PHME products are experimental and released on a best-effort basis. This supports historical replay, not a guarantee of real-time alerts.

Carbon Mapper asks developers to register to begin API access. Its tutorial documentation says many endpoints require authentication/token, while some STAC endpoints have optional authentication. A visible catalog therefore does not prove that every query/item can be retrieved without an account. This audit did not make an authenticated data pull and **did not verify that 200+ usable records were available**.

Carbon Mapper's terms limit data use to noncommercial purposes aligned with emissions reduction, require attribution, and restrict redistribution/derivative products. MARS data are licensed CC BY-NC-SA 4.0. License and publication timing must be part of the demo/repository design.

Sources: [Carbon Mapper Data](https://carbonmapper.org/data), [official API authentication tutorial](https://github.com/carbon-mapper/platform-public/blob/main/tutorials/README.md), [Product Guide](https://carbonmapper.org/articles/product-guide), [Terms of Use](https://carbonmapper.org/terms), [MARS data/license](https://methanedata.unep.org/dict-mars-plumes).

## Corrections to proposal claims

| Proposal claim/component | Audit result |
|---|---|
| “Only 12% responded” proves the system produces no mitigation | Incorrect. This is a feedback metric; MARS also reports confirmed mitigation cases. |
| Alert → assignment → response → verification is a new innovation | Not established. It is already part of MARS and the five-step IEA–IMEO guidance. |
| AI will identify sources and recurrence | Not enough differentiation. MARS and Carbon Mapper already perform attribution and recurrence analysis. A new model needs labels and evaluation against a baseline. |
| Blockchain makes mitigation trustworthy | Too broad. A hash can help show that a file/history has not changed after commitment; it does not establish the truth of an operator report, sender identity, or physical mitigation. |
| Carbon Mapper data are ready for a frictionless live demo | Not established. Registration/token guidance, release constraints, rate limits, and license restrictions apply. |
| A prototype without a field survey can prove methane reduction | No. Satellite replay can show observation patterns; mitigation claims need a field response and appropriate verification. Simulated responses must be labeled as simulations. |

## Possible differentiation, still a hypothesis

If this theme continues, do not build “a new MARS detector.” Test a narrower version: **a cross-source evidence package for auditing case changes**. The system would take one real observation, store source references and versions, create an event timeline, record responses/files as stakeholder-provided input, then show whether evidence changed after commitment.

Added value is plausible only if a specific user needs to combine records from multiple providers/authorities that are not connected, or to inspect evidence changes without access to a restricted government portal. Neither need has been validated through interviews or real use. Limit blockchain to artifact content/order integrity and give AI a measurable task. If public data are already structured, AI may be unnecessary. If only one organization updates records, an ordinary ledger may be enough.

## 48-hour go/no-go gate

Continue only if the team can show evidence for all of these questions:

1. **Access:** one script can retrieve/read the intended data; record count, time range, fields, delay, and license are documented. Do not rely on catalog counts or a “200+” claim before extraction.
2. **Differentiation:** one user action is not already supported by Eye on Methane/MARS or Carbon Mapper, with a specific user rationale. If not, stop claiming an “alert-to-action gap” as the innovation.
3. **AI:** define one target with labels/ground truth and compare AI against a simple baseline. If there is no measurable benefit, remove the AI claim or describe AI only as a bounded aid.
4. **Ledger:** demonstrate two parties/actors adding evidence, auditable ordering, and failed verification after an artifact is changed. Explain that this proves record integrity, not emission truth.
5. **Honest demo:** show real satellite observations and clearly distinguish real data, simulated operator input, and verification results. Do not claim emissions reduction from the demo.

## Decision recommendation

**Status: conditional candidate, not selected.** Available evidence supports the problem's urgency and data availability, but contradicts the idea that the proposal's main components—AI detection/attribution, response workflow, and verification—are an empty space. Run the 48-hour gate before building UI. If user differentiation or data access is not established, pivot to another researched idea; do not retain MethaneResponse based on a subjective score or sunk cost.

Do not claim better Top 3 odds than other candidates. There is no complete competitor-submission data or published judge weighting to support that claim. Winner assessment remains unpredictable.
