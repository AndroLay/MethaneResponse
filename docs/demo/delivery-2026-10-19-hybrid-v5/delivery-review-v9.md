# Local export review — v9.1

**Review date:** 2026-10-19  
**Export:** `delivery-output/story-v5/MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.1-final.mp4`  
**SHA-256:** `881367a23846a7bb9e837fc36fce2bf1eb7dbfd02188a1c728e8b59e1b0c6568`

## Changes in this revision

- Removed continuous camera drift from designed slides; the authored diagram, point, and annotation reveals remain.
- Replaced directional slide-to-product wipes with short cross-dissolves.
- Rendered at 25 fps to match the recorded browser capture cadence and avoid 25-to-30 fps frame duplication.
- Added an actual application segment for the selected July 11 observation and date scope. The date is already selected in part of the recorded form; no keystrokes or altered UI were synthesized.
- Retimed zooms to frame the scope fields and “Apply assessment scope,” then the “Run rules baseline” action before holding on the resulting assessment.

## Technical verification

The local `audit_video.py` report is at `delivery-output/story-v5/review-v9.1-final-audit/report.json`.

- Technical status: **pass**; no failed checks.
- Full-file decode: pass.
- Video: H.264, 1920×1080, yuv420p, constant 25 fps, 290 seconds.
- Audio: AAC stereo, 48 kHz, 290 seconds, −18.08 LUFS integrated, −2.86 dBFS true peak.
- English SRT sidecar is present at `delivery-output/story-v5/MethaneResponse-Hybrid-Presentation-Demo-4m50-v9.1-final.mp4.en.srt`.
- Video size: 22,379,586 bytes.

## Visual review coverage and limits

The full-file audit sampled 44 frames around the opening, scene boundaries, application workflow, and close. Separate motion-study clips were rendered for the observation view, selected-date scope, scope action, rules-baseline run, report check, and mismatch result. Full-resolution frames were inspected across the scope and audit zoom moves. In a settled authored-slide section, two decoded frames 120 ms apart differed by a mean of 0.0012 RGB levels; only 29 of 2,073,600 pixels differed by more than two levels. This confirms a locked frame in that sample, rather than proving the entire video has been watched. App close-ups were frame-sampled at their approach, hold, and result points.

This was a frame-sampled review, not a complete normal-speed playback or a full listening pass. Therefore `creative_status` remains **not_reviewed** and the automated audit reports `delivery_ready: false`; the technical pass does not imply creative approval.

## Delivery state

The MP4 and sidecar are local artifacts in the ignored `delivery-output/` directory. Nothing was uploaded, published, or imported into Notion. Earlier v5–v9 artifacts remain preserved. The historical MARS scope and all claim limitations are unchanged.
