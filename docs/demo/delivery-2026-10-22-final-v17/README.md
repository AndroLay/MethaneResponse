# v17 — Action-targeted camera and consistent cursor

Local revision of v16 responding to unclear zoom targets and inconsistent cursor behavior. Preserves v15/v16 files, narration, English captions and the 280-second story. No app behavior or frozen evaluation is changed.

## What changes

- A new real browser capture instruments click, fill, select and check actions, including their target geometry and timestamps. Entered values are never logged. Password/token fields are masked and their intervals excluded from the edit.
- Native cursor is hidden in the capture. One constant-size (32px) cursor uses recorded click positions and times with the exact same affine transform as the viewport. Travel between the recorded endpoints is editorially eased; it is not a claim of unmodified raw mouse travel. Click pulses require actual pointer-down events.
- Per-action phase markers are decoded from original-resolution video pixels with a checksum, avoiding the 1.85s global-clock mismatch detected in take5. The 96×12px editorial sync strip at the extreme upper-left is removed from the finished footage; no evidence field is replaced. Timing resolution is one 25fps frame, not sub-frame accuracy.
- Camera framing uses actual action boxes. Quintic easing approaches the target, holds for interaction/readout, widens during significant scrolling and returns before cuts. Uniform scale preserves aspect ratio. Brief wide-view pivots between nearby actions are removed; moving camera transitions last at least 0.8 seconds, with a full second reserved for the final zoom-out.
- Current action appears outside the viewport; an outline highlights the actual target. No explanatory card obscures form actions. Long idle setup/IPC waits are omitted; edited playback is not a latency benchmark.
- Soft feathered reveals connect scenes and content changes without overlapping two full pages of text. One cursor is added after content transitions, avoiding duplicate ghost pointers. Chapter headings fade smoothly without spring motion.

## Reproduce locally

Requires the already-installed Bun, bundled Playwright Chromium 156 headless shell, Playwright FFmpeg, Python/Pillow/NumPy, FFmpeg and Foundry toolchain. No paid model execution or public chain is used. The local capture needs sandbox-enabled Chromium and localhost sockets.

```bash
bun --no-env-file x tsc --project docs/demo/delivery-2026-10-22-final-v17/tsconfig.json
TMPDIR=/tmp/mr17 bun --no-env-file docs/demo/delivery-2026-10-22-final-v17/probe-cursor.ts
# A fresh capture is optional: choose a NEW raw-take directory in run-capture.ts first.
python3 docs/demo/delivery-2026-10-22-final-v17/prepare.py
```

Capture attempts have distinct directories. Initial environment failures and take6/take7 system-Chromium closure after download remain recorded separately; a failed take is never labeled a successful workflow. Locator checks after navigation use a 250ms cap, avoiding the 20s wait for buttons that have legitimately disappeared. Capture metadata is checkpointed after actions. Do not rerun into an existing successful take. Read its separately retained `trusted-decision-digest.json`, then pass that exact digest and its `frozen-investigation-decision.json` to `scripts/run-retained-decision-proof.ts` (see v17 verification records). That wrapper isolates a disposable local Anvil and never calls a public RPC. Do not reuse the v15/v16 receipt for this new capture.

```bash
python3 docs/demo/delivery-2026-10-22-final-v17/bundle_evidence.py
python3 docs/demo/delivery-2026-10-22-final-v17/test_motion.py
python3 docs/demo/delivery-2026-10-22-final-v17/render.py --frames
python3 docs/demo/delivery-2026-10-22-final-v17/render.py --smoke
python3 docs/demo/delivery-2026-10-22-final-v17/render.py
python3 docs/demo/delivery-2026-10-22-final-v17/finish.py
```

The saved Anvil state can also be verified read-only with `verify_evidence.py --expected-digest <separately retained pin> --output <new report>`. It sends no transactions.

## Boundaries

TKM_S_021 is the primary historical case; software review/response fixtures are labeled DEMO. DeepSeek footage remains an explicitly separate archived KAZ_S_159 example. Anvil is local; hash verification does not establish a repair. r12 task completion remains 0/48 under its frozen scorer. No human-productivity or climate outcome is claimed.

The male narration is the unchanged synthetic Andrew voice and original score, not a human recording or a voice clone. A local artifact is not a GitHub publication, a public deployment, or an uploaded submission. Technical audits and sampled frame inspection do not substitute for complete real-time playback and listening.

## Capture diagnostics and test scope

The final master uses the complete passing bundled-Chromium **take8**, including the original browser-enforced cross-origin digest check. Take8 provides the actual footage, frozen decision, separately retained UI digest and matching Anvil proof. Later take9/take10 retries did not complete and are not workflow evidence. A secondary transport probe was changed to APIRequestContext in the future capture script, but no completed journey from that newer script is claimed. The original application/E2E tests are unchanged.

The capture runtime now supplies the same explicit local click position as its preceding mouse movement, including the click before filling a wide field. This correction passed a separate real-browser probe with a 1450px input and a 700px button (three actions). That probe verifies the native cursor-position fix; it is not another complete application journey. In the final take8 edit, eased travel retains each recorded click's position and time.

Every non-sensitive action's `performAt` must be decoded from a checksum-verified video marker. Skipped secondary repaint phases and scene slates are recorded as locally interpolated timings. They are not represented as measured phases or sub-frame synchronization. The final output still requires native frame inspection at the actual action targets.

## Motion verification

The focused suite now has 22 passing regressions, including all 25 visible edited pointer-down events remaining inside the camera pane, exact recorded click endpoints, stable cursor sizing, action-target geometry, camera bounds and a minimum 0.8-second camera transition. The measured shortest moving transition is approximately 0.868 seconds. These checks verify the authored camera, not human usability or display performance on every device.

A failed earlier parallel render and the deliberately interrupted pre-correction render remain diagnostic artifacts; neither is the delivered MP4. Final production uses one scene, one encoder and one current decoder at a time. The cache key includes both renderer and camera code.

## Delivered local artifact

- MP4: `delivery-output/final-v17/MethaneResponse-Final-Submission-v17.mp4`.
- Duration 280 seconds; 1920×1080; 25fps; 7,000 decoded frames with continuous 0.04-second timestamps.
- 18/18 technical checks passed; 22 motion/evidence regressions passed; capture-tool TypeScript check passed; the three-action native-cursor browser probe passed.
- Actual output inspection: 52 sampled frames spanning cuts and action times, plus native-resolution action frames. This is sampled visual inspection, not a claim of complete real-time playback and listening.
- Audio: −18.03 LUFS, −2.01 dBTP. Burned-in English captions; no duplicate selectable subtitle stream. Ten chapter markers.
- 340 earlier acceptance source hashes and 57 artifact hashes remain unchanged. This does not represent another execution of those earlier application suites.
- The take8 retained-state verifier passed original / altered / altered-and-rehashed / original-restored checks with zero transactions sent.
- Full details: `delivery-output/final-v17/verification-summary.json` and `docs/evidence/video-v17-2026-10-22/technical-video-audit.json`.

Final MP4 SHA-256: `e0764396ca1ec16e458396f037c09e3de36b3cd39b91d4bde4f2a3059171f57c`.

The final edit is local. No source publication, deployment, upload, public transaction or new model-provider call was performed.
