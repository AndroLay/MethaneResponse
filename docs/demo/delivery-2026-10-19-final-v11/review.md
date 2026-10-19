# Export review — final cut v11

## Scope of observation

This revision polishes the presentation film. It does not change application
behavior, frozen evidence packages, dataset content, reports or chain state.
The underlying UI recording is the attributed v10 local capture, checked by its
SHA-256 before rendering. No new deployment or upload is represented.

The 31-second study was rendered before the full film, with current neural
audio. Selected actual study frames were inspected across the calendar → scope
transition, selected UTC day, baseline result, and input-form zooms. The full
export has its own technical audit and join samples. Sampling is not equivalent
to complete normal-speed playback or audio listening.

## Changes supported by evidence

| Finding | Local evidence |
|---|---|
| Previous long gaps were real | Prior 290-second narration: 212.061 seconds of cue spans, maximum inter-block gap 15.248 seconds |
| New edit is shorter | New contiguous, frame-aligned timeline: 248.48 seconds |
| New voice timing is tighter | 48 stock neural speech cues; 200.324 seconds of cue spans (80.6% of the edit); maximum inter-cue gap 2.91 seconds |
| Quiet is bounded in the actual waveform | Voice-only 10 ms RMS analysis, -42 dBFS threshold, minimum 400 ms: longest quiet 3.05 seconds; final audit repeats the analysis |
| Action time is truthful | All eight recorded app scene durations are preserved, totaling 114 seconds; audio fit for the observation commentary is bounded to about 1.041×, with no speedup of UI footage |
| Critical element reveals are connected to speech | Generated word timestamps drive warming attribution, MARS/review lanes, estimates, July ordering and closing value statement |
| Result does not get narrated before it exists | Coverage commentary starts 14.5 seconds into the real audit shot, after the captured result focus begins at 13.99 seconds |
| Visible action guides follow narration | Each header guide follows its actual speech cue; the Assess stage starts at the recorded run action |
| Zoom remains continuous | Current regression samples camera parameters every 4 ms; neutral camera during scroll, still entry/exit, fractional affine crop |
| Captions have readable phrases and punctuation | 88 timestamped groups from the authored script; no single-word leftovers; subtitle/SRT verification on the final MP4 |
| Music is original and aligned | Existing original v4 score, trimmed/faded at the new ending, ducked under narration, two-pass normalization |

The longest remaining quiet is an intentional result-reading hold, not the
former 10–15-second padding between explanations. Numerical cue spans include
natural pauses within generated sentences; they are not a claim that 80.6% of
samples contain audible speech.

## Reproducible checks

**Observed final result:** 12 current tests and 6 archived regression tests pass;
all 18 technical audit checks pass. The final export contains **6,212 frames**,
every timestamp step is 0.04 seconds, and embedded captions match the sidecar
exactly. The encoded AAC mix measures **-18.01 LUFS / -3.87 dBTP**. Selected
samples in both final contact sheets were inspected after the audit.

Final artifact: **46,775,674 bytes**, SHA-256
`63c20c927d215963ec8a3d50153732067d63cae0a978e5f01f0fd69aa14584ba`.
See the checked-in [verification summary](verification.json); full artifact-bound
logs and frame evidence remain in the ignored local output folder.

- `test_timing.py`: 12 current regression tests for timing, exact retained
  capture identity, scientific boundaries, guides, subtitle grouping, model
  anchors, camera continuity, subpixel motion and palette transitions.
- Retained v10 `test_render.py`: 6 regression checks on the archived camera/
  opacity/transition implementation and its original timeline. These are kept
  distinct from current-version tests.
- `verify.py`: verifies voice quiet, both test suites, all final frame timestamps,
  matching embedded/sidecar captions, then runs the installed video audit helper
  against this final artifact. It also extracts 36 frames spanning six complete
  important transitions, rather than checking only the cut instant.
- `delivery-output/story-v11/verification-summary.json`,
  `review-final/report.json`, `review-joins/contact.png`, and
  `production-source-hashes.json` contain the actual run results.

## Product truth and visual interpretation

- The source is KAZ_S_159, from snapshot `unep-mars-675417694883`.
- The three EnMAP observations retain their dates, kg/h estimates and reported
  uncertainties. No missing observation is plotted as zero.
- UNEP's catalogue finding remains attributed. This review lacks a matching
  eligible report citation; it does not contradict UNEP or prove failed repair.
- Analyst casework is saved in the local browser; no operator is contacted.
- Original/changed/original verification uses actual app footage and actual
  exported digests. A hash match alone establishes neither issuer nor physical
  mitigation. No receipt or live LLM result is invented.
- Procedural sphere, satellite, documents and diagrams are explanatory models.
  They are not satellite evidence or footage of a physical repair.
- The narrator is a stock **synthetic** neural voice. No voice cloning, human
  narrator, user pilot, measured climate benefit or subjective jury score is claimed.

## Review limits

| Review surface | Status |
|---|---|
| Real study-frame inspection | Performed; actual rendered frames, not concept art |
| Source/timing tests | Run on this revision; see current output |
| Full-file technical/decode audit | Recorded against final MP4 hash by `verify.py` |
| Complete normal-speed watch | **Not performed** in this environment |
| Direct listening to the complete final mix | **Not performed** in this environment |
| Perceived human naturalness, emotional delivery and overall artistic approval | **Not reviewed**; meters, captions and stills cannot establish these |
| Upload/public service/player validation | **Not performed**; artifact remains local |

The file is delivered as the requested final cut. The audit helper deliberately
retains `creative_status: not_reviewed` and `delivery_ready: false` until a full
human playback/listening review is recorded; successful encoding is not an
artistic certificate.
