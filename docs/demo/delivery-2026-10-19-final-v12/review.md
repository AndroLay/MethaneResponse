# v12 review record

## Scope

This revision changes presentation source and renders a new film. It does not
change application behavior, deploy services, upload media or re-run the previous
application acceptance suite. Retained application tests/capture are identified
by their original revision and source hashes.

## Review performed

- Reviewed the rewritten 18-scene script against the retained claim ledger.
  Benefit appears in the opening, the hypothetical opening is labeled, exact
  uncertainty/date records are retained, and the incomplete-review finding is
  distinguished from UNEP's catalogue statement.
- Rendered a 35-second motion study from six complete source scenes before the
  full export. Inspected its actual frames, including the opening transformation,
  MARS-to-application entry, the actual result, the request fields and camera
  positions. These are rendered frames, not generated concept artwork.
- Reviewed all ten explanatory compositions as rendered stills. Their varied
  visual forms have specific roles: decision, climate context, system roles,
  uncertainty, date ambiguity, result, evidence request, fingerprint, limits and
  closing workflow.
- Added timing, guide-size, plain-language, transition and composition regressions
  alongside the existing camera, caption, provenance and scientific-limit checks.
- The fresh full-export technical report and selected transition frames are
  recorded in [verification.json](verification.json). The output directory retains
  their detailed measurements and native-resolution samples.
- Compared actual v11/v12 encoded frames at the same source action offset
  (+7.52 s within the evidence-request shot). The new guide is visibly larger
  and the form is framed more closely. The comparison is retained as
  `delivery-output/story-v12/comparison-casework-v11-v12.png`; it is a two-frame
  comparison, not a user readability study.
- Inspected additional actual encoded frames for the accepted original, rejected
  altered copy, accepted original again, and closing value statement. Their
  contact sheet is `delivery-output/story-v12/proof-results-contact.png`.

## Measured export results

| Check | Result |
|---|---|
| Current timing/composition/provenance regressions | 16 passed, 0 failed |
| Retained v10 renderer tests, run separately | 6 passed, 0 failed |
| Fresh encoded-export technical audit | 18 passed, 0 failed |
| Duration and cadence | 267.92 s; 6,698 frames; every adjacent frame timestamp differs by 0.04 s |
| Embedded captions | Identical to the supplied SRT; 96 groups |
| Encoded audio | −18.01 LUFS, −3.56 dBTP; stereo 48 kHz |
| Longest quiet interval in voice-only track | 3.12 s at the documented −42 dBFS RMS threshold |
| Video SHA-256 | `9b087b3b65f117937cb064e05a3af03030fa7ca80df8146d35efe00b067682b9` |

These measurements belong to v12. They are not inferred from the earlier v11
export. No test failure was observed in these scoped checks.

## Interpretation

The common technical template used by v11 has been reduced: only the first entry
introduces the real application through a shared window. Direct cuts retain
context during actions; brief dissolves join related explanatory sequences.
Larger editorial guides and closer form views improve the intended reading
hierarchy while preserving the actual interface and cursor.

Source camera tests sample the path at 4 ms intervals and check neutral views
during page scrolling. Constant encoded frame spacing and selected join frames
provide additional evidence. Neither check guarantees that every viewer will
perceive every motion as comfortable.

## Remaining review limits

- **No full normal-speed audiovisual playback or human listening was completed
  in this environment.** Acoustic measurements do not establish natural prosody,
  correct pronunciation, subjective music balance or absence of every audible
  edit. The narrator is still synthetic.
- Frame inspection is sampled, not a claim that every frame was visually judged.
  Decode/cadence checks cover the full encoded stream mechanically.
- Larger important text was inspected in frames and tested structurally. Physical
  phone playback, accessibility testing and first-time audience comprehension
  remain unverified. Small original metadata may require pausing or desktop view.
- No expert panel, human pilot, live AI assessment, public receipt, cloud delivery
  or measured climate benefit is inferred from the video.
- This is the completed requested local final cut. Publication and an artistic
  acceptance decision remain separate from successful technical export.

## Suggested final playback checklist

Watch with captions off once, then with English captions on. Listen for unusual
stress on MARS, UNEP, Uzen and UTC; check whether each instruction is understood
before its result is discussed; inspect the evidence-request typing sequence;
confirm original → changed → original verification is unmistakable. Repeat a
short section on the intended phone display. Any future change requires a new
export hash and fresh verification rather than reusing this cut's pass report.
