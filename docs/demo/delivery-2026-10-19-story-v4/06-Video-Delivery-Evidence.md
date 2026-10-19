# Video delivery evidence — Story v4

**Status:** rendered and technically audited locally; not uploaded or published.  
**Current file:** `delivery-output/story-v4/MethaneResponse-IEEE-ClimateChain-Demo-4m50-story-v4-final.mp4`  
**SHA-256:** `3629647ebfde7f30eb776c1f649d5f05876202e11eac83893d2ccd70fa9c31c3`

## What was rendered

- 290.000 seconds (4:50), 1920×1080, H.264/yuv420p, 30 fps, 8,700 frames.
- AAC stereo, 48 kHz, 290 seconds; measured integrated loudness −18.08 LUFS and true peak −1.42 dBFS.
- Real browser footage from the local production build and ephemeral Bun/Hono preview API. The first two seconds use a real Cases screenshot to cover the UI's initial loading state; the interactive capture follows it.
- Historical KAZ_S_159 data and a deterministic rules baseline. Preview storage is temporary; there is no live AI provider or blockchain receipt in the captured workflow.
- Synthetic English Kokoro narration (`af_heart`) and an original instrumental score. The narration file is 290 seconds with 212.061 seconds of speech across 12 timed segments.

## Technical checks

The local video audit passed all declared checks: media readability, one video and one audio stream, dimensions, average frame rate, container and stream duration, codec, pixel format, complete decode, audio presence, channels, sample rate, audio duration, measurable signal, loudness, true peak, and unchanged source fingerprint.

Three audit reports use the same MP4 digest above: a general six-frame contact sheet and two batches sampling the storyboard joins. They are under the ignored local directory `delivery-output/story-v4/video-audit-final2*`. The production capture manifest records ten browser screenshots, zero page errors, and zero blocked external tile hosts. Its browser used Chromium SwiftShader, so these results are not a physical-GPU or device-performance test.

## What these checks do not establish

Frame samples and media measurements do not replace a complete normal-speed creative review. The full video has not been watched start-to-finish with a human reviewer, and the synthetic voice/music mix has not received subjective human listening approval. Accordingly, this is a **technically valid local draft**, not an artistically approved or public-ready video.

The demonstration shows a bundle-scoped `insufficient evidence` rules result, a matching local report digest, and rejection of a changed copy. It does not establish physical mitigation, authenticate an issuer, prove an operator was contacted, measure emissions avoided or reviewer time saved, or demonstrate a live AI or blockchain workflow.

## Reproduction inputs

| Artifact | SHA-256 |
|---|---|
| Browser capture `actual-app-capture.webm` | `df3f352ca759bbc5ca529293a3533d4a77f77fc7189545badd2e47683224d767` |
| Synthetic narration WAV | `b68929365ca165871cf5f4baecb7f4f71b9b49c0f809253263873795a371dc8` |
| Original instrumental WAV | `0f12404cbccaa70712d7af17ee206b564d2241a5542e3e0b7501992a8abdfb8b` |

The MP4 is a separate local artifact from the written presentation materials. No Notion import or publication is planned.
