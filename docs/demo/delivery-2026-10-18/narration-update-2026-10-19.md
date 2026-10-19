# Narrated demo update — 19 October 2026

This update preserves the October 18 instrumental-only export and earlier narrated revisions. Revision 3 changes the story after review feedback: the prior 4-minute edit spent only 115.613 seconds in narration and moved into controls before explaining the climate context, MARS's role, or why an independent evidence review helps. The new edit opens with the methane rationale, explains what MARS already does, then demonstrates the product value through one real historical case. The capture remains a local preview with temporary API state; it is not a live service, blockchain transaction, or public deployment.

## Latest artifacts — story revision 3

- Final MP4: `/tmp/MethaneResponse-delivery-2026-10-19-voice/MethaneResponse-IEEE-ClimateChain-Demo-4m-2026-10-19.mp4`
- MP4 SHA-256: `1622609ddacfcc81c9f798aaa62b931f964a09d906c43079015d213e2cb13785`
- Timed English narration: [`narration-en-story-v3.json`](narration-en-story-v3.json)
- English on-screen captions: [`06-Captions-EN-story-v3.srt`](06-Captions-EN-story-v3.srt)
- Voice WAV and segment manifest: `/tmp/MethaneResponse-delivery-2026-10-19-voice/narration-story-v3-storyfix.wav` and matching `.manifest.json`
- Short voice preview: `/tmp/MethaneResponse-delivery-2026-10-19-voice/voice-preview-story-v3-storyfix-18s.mp3`
- Technical audit: `/tmp/MethaneResponse-video-review-2026-10-19-final/report.json`

The 471-word script explains why methane matters, what MARS already does, the review gap MethaneResponse addresses, the real KAZ_S_159 evidence, the date-scoped rules result, its limitations, a follow-up request, and the report digest check. UNEP's roughly 30% global-warming context and IEA's 12% MARS response figure are attributed in captions and the source ledger. The latter is explicitly a response statistic, not a repair rate. The app's actual screenshots cover startup/loading intervals so the opening is not a long blank loading screen. Kokoro `af_heart` at 0.94 speed produced 206.348 seconds of speech across 11 segments in a 240-second track; the WAV SHA-256 is `77f2a04bc4b85dbac12436a12f1429b1e4905872d85283e10decdd1bede8e11c` and the 18-second preview SHA-256 is `a3bee91a8d634329ee64b1aad4fd47759c5e745348efb52e2b8f0204ef32a529`.

The final MP4 is 11,496,134 bytes, H.264 1920×1080/30 fps (`yuv420p`), AAC stereo/48 kHz, exactly 240 seconds and 7,200 frames. Its audio measures −18.15 LUFS integrated and −1.49 dBTP true peak. The final technical audit passed every format, signal, duration and full-decode check at `/tmp/MethaneResponse-video-review-2026-10-19-final/report.json`. The contact sheet was reviewed to confirm the opening no longer contains blank loading frames and key product evidence stays legible. `creative_status = not_reviewed` and `delivery_ready = false` remain because full-speed playback and human listening were not completed.

This is a synthetic Kokoro `af_heart` voice, not a human recording. Full-speed listening, creative polish, and naturalness have not been human-reviewed; technical conformance alone does not establish those qualities.

## Revision 2 artifacts — natural voice edit preserved

- Final MP4: `/tmp/MethaneResponse-delivery-2026-10-19-voice/MethaneResponse-IEEE-ClimateChain-4m-natural-voice-v2.mp4`
- Final MP4 SHA-256: `9b4fd972c9c18a0412f9dbed570f2847a067dfecfd595857fedf250254783222`
- 12-second voice preview: `/tmp/MethaneResponse-delivery-2026-10-19-voice/voice-preview-natural-12s.mp3`
- Timed English script: [`narration-en-natural-v2.json`](narration-en-natural-v2.json)
- Technical audit: `/tmp/MethaneResponse-video-review-2026-10-19-natural-v2/report.json`

The 289-word script uses `af_heart` at 0.96 speed and generates 115.613 seconds of speech in 11 timed blocks. It uses contractions, shorter sentences, clearer transitions, and more breathing room while preserving the same source limits. The final audio is −18.20 LUFS integrated with a −1.47 dBTP true peak. Full-speed playback and human listening were not available here, so the warmer delivery is an intended improvement, not a subjectively verified result. The preview is supplied so the voice can be assessed directly.

## Revision 1 artifacts — preserved

- Final MP4: `/tmp/MethaneResponse-delivery-2026-10-19-voice/MethaneResponse-IEEE-ClimateChain-4m-narrated-240s.mp4`
- Final MP4 SHA-256: `100b318a9032e75b0ce87b6bebcfc4cccafc09b710a0a1634e68fa9a3ae3ab5a`
- 12-second audio preview: `/tmp/MethaneResponse-delivery-2026-10-19-voice/voice-preview-12s.mp3`
- Timed English script: [`narration-en.json`](narration-en.json)
- Reproduction script: [`../../../scripts/generate-demo-narration.py`](../../../scripts/generate-demo-narration.py)
- Browser cursor implementation and regression: [`../../../scripts/delivery-cursor.ts`](../../../scripts/delivery-cursor.ts), [`../../../scripts/delivery-cursor.test.ts`](../../../scripts/delivery-cursor.test.ts)
- Capture manifest: `/tmp/MethaneResponse-delivery-2026-10-19-voice/capture-manifest.json`
- Technical audit: `/tmp/MethaneResponse-video-review-2026-10-19-240s/report.json`

## What changed

- A white pointer with a teal accent and a restrained click pulse follows actual Playwright pointer events. It has `pointer-events: none`, so it cannot intercept product controls. It is hidden while the eight evidence screenshots are taken.
- Eleven English voice segments align with the scene markers. Kokoro-82M ONNX v1.0 uses the `af_sarah` en-US voice at normal speed. The output is a synthetic neural voice, not a human recording or a cloned voice. The model card lists Apache-2.0; model files were held in `/tmp` and are not part of the application bundle.
- The original instrumental is sidechain-ducked under narration and remains audible in the reading pauses. The video renderer holds the last verifier frame through the short capture tail to meet the exact 240-second/7,200-frame output contract.

## Verification evidence

| Check | Result |
|---|---|
| Cursor browser regression | Pass: 1 test, 5 assertions; follows coordinates, shows click state, does not block controls, survives navigation without page errors |
| Actual application capture | Pass: eight screenshots, `pageErrors = 0`, `blockedExternalHosts = 0`; local production build and temporary API state |
| Narration generation | Pass: 11 segments, 415 words, 167.199 seconds of speech on a 240-second mono PCM track; no segment exceeded its scene window |
| Final video format | Pass: H.264, 1920×1080, 30 fps, `yuv420p`, AAC stereo/48 kHz, exactly 240.000 seconds and 7,200 video frames |
| Audio measurement | Pass: −18.22 LUFS integrated, −1.51 dBTP; measured with FFmpeg EBU R128/loudnorm |
| Full file decode | Pass: FFmpeg decoded the complete final file |
| Video audit | Technical pass; report is bound to the MP4 digest above |

## Review limits

The final file was reviewed through the full technical audit, the contact sheet, and full-resolution stills at key workflow moments. Normal-speed playback of all four minutes and subjective listening to the exported voice/music mix were not available in this environment. The audit therefore leaves `creative_status = not_reviewed` and `delivery_ready = false`; codec, loudness, and still frames do not establish natural voice performance or sound-motion polish. A short preview is provided for listening on a device with audio output.

The footage covers Cases → Evidence Auditor → Reports. The globe is still omitted because the headless capture did not render public basemap tiles consistently. The UI facts and claim limits remain unchanged: observations are historical, a rules baseline is not AI, a local digest is not a blockchain receipt, and no checksum proves physical mitigation.

## Revision 2 verification

The natural-voice export passed the separate video audit at `/tmp/MethaneResponse-video-review-2026-10-19-natural-v2/report.json`: 1920×1080 H.264, 30 fps, `yuv420p`, exactly 240 seconds/7,200 frames, AAC stereo/48 kHz, full decode, −18.20 LUFS and −1.47 dBTP. SHA-256 is recorded above. Contact-sheet and full-resolution checks show the same application capture, captions and cursor as revision 1. Those stills do not verify timing or voice performance.

The cursor source did not change in revision 2. Its current test rerun was blocked before assertions because Playwright's `/usr/bin/chromium` launch failed with `socket() failed: Operation not permitted`; an earlier run passed 1 test with 5 assertions. The current result is therefore not a fresh browser regression pass.

## Reproduction

Use the local `uv` runtime and TTS model paths, then run:

```bash
uv run --python 3.13 scripts/generate-demo-narration.py \
  --script docs/demo/delivery-2026-10-18/narration-en-natural-v2.json \
  --model /path/to/kokoro-v1.0.onnx \
  --voices /path/to/voices-v1.0.bin \
  --output /tmp/narration-voiceover.wav \
  --base-speed 0.96 --max-fit-speed 1.06 --lead-in 0.45

PLAYWRIGHT_BROWSERS_PATH=/path/to/playwright-browsers \
  METHANE_DELIVERY_OUTPUT_DIR=/tmp/methane-delivery \
  METHANE_DELIVERY_ASSETS_DIR=/tmp/methane-delivery/assets \
  bun run scripts/capture-delivery-demo.ts

METHANE_DELIVERY_OUTPUT_DIR=/tmp/methane-delivery \
METHANE_DELIVERY_VOICEOVER=/tmp/narration-voiceover.wav \
  bash scripts/render-delivery-narrated-demo.sh
```

The existing video and previous review directories are retained; the new render script refuses to overwrite an output file.
