# v16 revision acceptance — 22 October 2026

**Local technically valid revision; no upload, push or deployment performed.**

MP4: `delivery-output/final-v16/MethaneResponse-Final-Submission-v16.mp4`.
SHA-256: `95ab00b68ac3c0322a49e88e135434d8bb8824db7a53078b2b9a8f66a4238046`.
Size: **34,689,872 bytes**. V15 remains unchanged.

## Checks actually run

- **14/14** focused production regressions passed: exact runtime, unchanged v15,
  sound/caption reuse, clip bounds, same-take receipt/export, exact quote hash,
  linked/unlinked counts, real-observation values, revisit history, AI separation,
  allowlisted manifest, credential-field guard, capacity-field crop and type bounds.
- **18/18** technical video checks passed. Full decode: **7,000 frames** with
  **0.040 s** timestamp increments; 280.000 s, 1920×1080, H.264/yuv420p, 25 fps.
- AAC stereo 48 kHz; measured **−18.03 LUFS**, **−2.01 dBTP**. Same v15 mixed
  audio input, unchanged stock synthetic male Andrew voice and original score.
- **10 chapters**, burned-in English captions, **zero embedded subtitle streams**.
  Sidecar SRT retained separately; do not overlay it on the burned-in text.
- Retained local chain replay: original **0**, altered/original pin **1**,
  altered/recomputed pin **1**, original restored **0**. No transaction sent.
  A repeat also passed after adding the data license to the input manifest.
- Prior acceptance remains bound: **340 source hashes + 57 artifact hashes**
  match. No new application behavior, agent experiment, human pilot, provider
  invocation or public-chain event was introduced by this editorial revision.

## Visual evidence actually inspected

Three complete hard sequences were rendered as smoke exports: AI (28 s),
request/review (31 s), verifier (39 s). Selected encoded frames were inspected
before reusing those exact byte-identical segments in the full edit.

The actual final MP4 was sampled at **46 positions**, including before/at/after
all nine chapter joins and reading holds at 57, 70, 77, 85, 113, 132, 143, 158,
162, 177, 198, 215, 224, 234, 240 and 274 seconds. Contact sheets establish
composition/continuity only; native key frames establish sampled readability.

Observed repairs:

- TKM observation: UTC timestamp, kg/h and reported SD are enlarged, with a
  visible one-observation/non-continuous limitation.
- Capacity input stays in frame; active 10/comparison 20 is explained. Total
  30,414 versus source-linked 23,861 is identified as different populations.
- Actual archived KAZ result is cropped; the exact quote is then transcribed
  at 39 px, with a matching quote SHA and visible DEMO status.
- Request/acceptance/recipient/due date and actual request-more-evidence
  decision are enlarged as labeled export excerpts.
- New authorized response, work revision 5→6 and preserved decision 1 are clear.
- Full digest/transaction are split over large readable lines; local chain and
  supplied-state limitations are visible. CLI statuses come from actual proof.
- Main repo/limited-preview links and the frozen r12 scorer context are visible.

The short shared-background dips at exact chapter boundaries are intentional;
they do not represent failed captures. Camera approaches/returns use fixed
focus regions and smooth easing. No new cursor or fake model request was added.

## Limits and release state

**Full normal-speed playback and audio listening: not reviewed by this agent.**
The audio is unchanged, but meters do not establish pronunciation, naturalness or
subjective music balance. Sampled visual review is not a complete motion review.
Accordingly, the audit helper's `creative_status: not_reviewed` and
`delivery_ready: false` remain unchanged. No editorial score is invented.

All source documents and proof are prepared locally. The public GitHub/Render
revisions were not changed for this edit. A judging supplement is generated
separately; it includes the exact video hash and proof, not the MP4 itself.
Check published source and uploaded video after an authorized publication.

Source continuity: real historical **TKM_S_021**, DEMO mitigation hypothesis,
software DEMO reviewer/response, exact frozen decision; **KAZ_S_159 AI is separate**.
Anvil 31337 is local. Frozen r12 stays 0/48 under its scorer; no human usefulness,
physical repair, emissions savings or competition outcome is claimed.
