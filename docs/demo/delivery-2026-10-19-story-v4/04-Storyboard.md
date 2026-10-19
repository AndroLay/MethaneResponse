# Story v4 — The boundary between a report and an auditable claim

**Target runtime:** 290 seconds (4:50), within the official 3–5 minute window  
**Format:** 1920×1080, 30 fps, H.264/yuv420p, English narration and captions, original instrumental bed  
**Audience:** climate-data judges, researchers, auditors, public-interest teams  
**Story promise:** explain why traceable evidence matters, what MethaneResponse adds to MARS, how one historical claim is reviewed, and what the local checks actually prove.  
**Primary proof:** the real KAZ_S_159 MARS snapshot, linked UNEP catalogue metadata, a date-bounded rules result, a locally verified export, a rejected altered copy, and a second check of the original file.

## Narrative logic

1. **Why:** Methane is a major climate driver, and a response statistic cannot tell an outside reviewer whether a specific mitigation claim is supported. A traceable evidence trail helps keep those questions separate.
2. **What:** MethaneResponse is a claim-review and record-verification layer around historical methane information; it does not replace MARS detection or establish physical truth.
3. **How:** follow one source, inspect its publisher reference and discrete observations, apply a date scope, run the deterministic rules baseline, record the next evidence request, and verify the exported report.
4. **What the proof establishes:** the captured UI/API workflow is reproducible, and changing a hash-bound field while leaving its digest unchanged is detected. This proves the software check behaved as shown, not that mitigation occurred or the report's issuer is authentic.

## Creative treatment

The viewer follows one record from a searchable source row into its publisher reference, observation history, selected event scope, audit result, follow-up note, and report verifier. The cursor is the guide. Each move answers a new question; no generic globe animation or repeated card montage is used as evidence.

The opening starts on the actual Cases table with KAZ_S_159 selected. A direct cursor action moves from the source row to its case modal; the source ID stays the visual anchor. The linked UNEP item is shown inside the real evidence inventory, including the notice that report contents are not included. The report itself is not opened or copied. Actual observation values then move into the Auditor timeline, and the same July 11 event remains selected when the scope and result appear. The last beats compare the intact export, an altered copy, and the original file again. Keep attention on the changing evidence state, not cursor decoration.

Type is limited to one short takeaway per beat, with source attribution in a legible secondary line. The cursor uses the existing white pointer and teal click pulse. UI scrolls settle before critical values are read. The score is the existing original instrumental, ducked beneath the synthetic English narration; no added whooshes or fabricated satellite imagery.

## Timed storyboard

| Time | Entry → action → reading hold → exit | Narration purpose / on-screen copy | Evidence and guardrail |
|---|---|---|---|
| **00:00–00:18** | Enter on the filtered Cases table. Cursor opens KAZ_S_159 and selects Observations. | Hook: this historical MARS source is linked to a public catalogue item titled “Confirmed Mitigation Action.” What can this review establish? | Actual table and case modal. The title is a publisher reference, not contents in the submitted bundle. |
| **00:18–00:40** | Switch to the case Evidence tab; hold on the source record. | Why this matters: methane is a major climate driver, so reliable follow-up and evidence boundaries matter. | UNEP's ~30% figure is global climate context, not project impact or case-specific benefit. |
| **00:40–01:08** | Click “Review evidence”; hold on the actual claim-review Overview and scope controls. | What MARS already does, what its 2025 response statistic measures, and what MethaneResponse adds: checking the claim against records. | Attribute ~12% to IEA. Response does not mean repair; no inference about the remaining cases. |
| **01:08–01:32** | Open the Auditor's Observations step; scroll until the linked reference and “contents not included” note are visible. | Read the official UNEP catalogue abstract about Uzen Field and explain that this casebook stores metadata and a link, not the report. | Do not open, copy, or imply independent review of the licensed report. |
| **01:32–01:57** | Click Observations; hold on the actual event timeline. | Show three dated EnMAP estimates and their reported uncertainty. | 591±335, 307±66, 496±226 kg/h on 2024-06-07, 2026-06-05 and 2026-07-11. Discrete estimates, not continuous monitoring. |
| **01:57–02:28** | Select the July 11 event, apply its exact UTC day, and hold on the scope. | Explain the timing ambiguity: the catalogue gives July but no exact action day, so the observation cannot be ordered relative to the action. | Use the actual event and single-day scope. UTC is this app's date-scope convention. |
| **02:28–03:06** | Select the mitigation claim and run the rules baseline; hold on result, reason, and scope. | Explain the bundle-limited “insufficient evidence” result and why it neither contradicts UNEP nor shows that mitigation failed. | Actual API/UI result; no eligible date-matched citation in this submitted bundle. Not AI and not a review of report contents. |
| **03:06–03:29** | Enter and save the local casework note. | State the next evidence request and show that the note is local. | No message is sent to an operator; no external investigation is assigned. |
| **03:29–03:48** | Open Reports, export JSON, and verify that exact file. | Explain the bundle digest and export-context checksum. | Both checks are local. The file contains no blockchain receipt. |
| **03:48–04:11** | Alter one hash-bound reason while leaving the saved digest unchanged; show rejection. | Demonstrate tamper detection and state its limits. | Proves only that this local verifier detects this changed copy under the stored digest. |
| **04:11–04:33** | Reselect the original export; show valid digest/context checks again. | Explain that matching in-file hashes establish consistency with those hashes, not a trusted issuer. | Actual original download is reused. No signature, external trust anchor, or physical truth. |
| **04:33–04:50** | Hold on the verified original report and its result; let cursor settle. | Close with the product's evidence-review value and explicit current preview limits. | Rules baseline only; no live AI provider, public-chain receipt, emissions avoided, or time saved measured. |

## Approved spoken narrative

The matching timed source script is `narration-en.json`; on-screen captions are `06-Captions-EN.srt`. Both remain separate source artifacts alongside the local production scripts. One narrative spine applies to every asset:

> MethaneResponse helps a reviewer trace a historical source, inspect a claim against the evidence actually submitted, and see what remains unknown. In this case the official UNEP catalogue abstract is preserved as linked metadata, while the selected bundle does not include report contents or an exact action day. A deterministic, date-scoped baseline therefore returns insufficient evidence within that bundle. The reviewer can see why, record the next evidence request, verify the original export's hashes, and detect a changed copy. None of these checks proves the physical outcome.

## Claim and production checks

- **Response statistic:** 12% of MARS notifications received a response in 2025; never label it a repair or mitigation rate.
- **Case result:** `insufficient_evidence` means the selected submitted bundle lacks an eligible date-matched mitigation citation. It does not refute the UNEP catalogue abstract or establish failure.
- **Temporal inference:** July 11, 2026 cannot be placed before or after an action described only as occurring in July 2026.
- **Observation plot:** preserve reported uncertainty bars and discrete dates. Do not draw a smooth trend or call the values continuous emissions.
- **Technology status:** the captured flow uses the deterministic rules baseline. No live AI provider or public-chain receipt is enabled in this preview.
- **Integrity:** local SHA-256 checks detect a changed bundle under the embedded digest. No issuer, external trust anchor, or physical outcome is established.
- **Rights:** display the UNEP item's title, brief attributed abstract statement, publisher, and link. The casebook does not copy the licensed report; do not show its PDF/pages or extracted content.
- **Impact:** no emissions reduction, time saving, or user-pilot outcome has been measured.

## Acceptance evidence

Use actual Playwright footage from the local production build and ephemeral preview API. The capture must show the selected July 11 event scope and resulting mitigation baseline, export the same audit it verifies, alter a copy and show the mismatch, then select the original export again and show that its checks still match. Keep old revision artifacts intact. Technical validation and subjective playback/listening are recorded separately; a successful render alone is not creative approval.
