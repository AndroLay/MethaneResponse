# MethaneResponse — directed presentation and actual demo, v10

This revision implements the requested clearer zooms, deliberate presentation/demo transitions, useful animated models, and a larger, smoother cursor. It retains the 4:50 English narration and approved source/claim ledger from story v4. All earlier exports remain available.

## Direction

The viewer follows **Inspect → Scope → Assess → Request → Verify**. Each application shot starts with context, settles into the relevant controls, shows the real action, holds the result, and returns to context. A shared application window expands from a presentation preview and contracts into the next explanation. There is no perpetual camera drift. A continuous fractional image transform avoids integer crop stepping during zooms.

The presentation uses original procedural models and diagrams: a globe with a satellite, the two complementary MARS/review lanes, three real observation estimates with uncertainty, a month-wide action window, an evidence gate, and a hash comparison. These explanatory graphics are not satellite measurements. No plume or mitigation result is generated.

## Reproducible local workflow

Prerequisites: the repository's Bun/Playwright dependencies, `/usr/bin/chromium`, system FFmpeg/ffprobe, Python with Pillow/numpy, Inter and DejaVu Sans Mono. This workspace uses a local FFmpeg bridge at `delivery-output/capture-runtime/ffmpeg-1013/ffmpeg-linux` pointing to `/usr/bin/ffmpeg` for Playwright's recorder. No paid generation service or new JavaScript dependency is required.

1. Build the current web application with `bun run build:web`.
2. Run `PLAYWRIGHT_BROWSERS_PATH=delivery-output/capture-runtime bun --no-env-file docs/demo/delivery-2026-10-19-directed-v10/capture.ts`.
3. Run `python3 docs/demo/delivery-2026-10-19-directed-v10/render.py study`, inspect the representative study, then run with `full` for the master.
4. Run the local video-quality audit against `delivery-spec.json`; inspect the exported frames and the motion itself. Record actual playback/listening coverage separately from technical checks.

Run the motion regressions with:

```bash
python3 -m unittest discover -s docs/demo/delivery-2026-10-19-directed-v10 -p test_render.py
```

The six checks cover camera continuity, still entry/exit, a neutral camera during scrolling, fractional movement, exact timeline/capture binding, real text-opacity reveals, and a gradual return to the light presentation palette. Capture-dependent checks require the actual master capture; skipped checks do not count as a pass. A second capture can use `MR_DIRECTED_CAPTURE_OUTPUT_DIR`; existing master captures and exports are protected from replacement.

The capture starts an isolated production preview on loopback, with temporary local audit state and no AI, DB, reviewer, RPC or signer secrets. It verifies the actual source, scoped baseline result, report export, altered-copy rejection and restored original. The compositor draws its pointer from recorded browser pointer/click events; browser movement uses minimum-jerk easing and dwell before actual clicks. Focus rectangles come from real DOM bounds. Colored sync slates are excluded from the edit and used to align actions to source frames.

Outputs and capture manifests are under the ignored `delivery-output/story-v10/` directory. They are local artifacts; publishing and uploading are separate actions.

## Local deliverables

- [Full video, 4:50](../../../delivery-output/story-v10/MethaneResponse-Directed-Presentation-Demo-4m50-v10.mp4)
- [English captions](../../../delivery-output/story-v10/MethaneResponse-Directed-Presentation-Demo-4m50-v10.mp4.en.srt)
- [Current artifact review and verification limits](review.md)
- [Storyboard and timecodes](storyboard.md)
- [Capture provenance](../../../delivery-output/story-v10/capture-master/capture.json)
- [Render manifest](../../../delivery-output/story-v10/render-manifest.json)

The source of the editable animation is `render.py`, `visuals.py` and `timeline.json`; `capture.ts` records the application. Per-frame text masks fix premature text appearances in the initial study. The light presentation palette now blends from and back to the dark application frame instead of flashing at the cut. Earlier studies and videos are retained locally.

## Scientific scope

Use the [approved sources and claims](../delivery-2026-10-19-story-v4/03-Sources-and-Claims.md). The three estimates are discrete observations with reported uncertainty. The July 2026 catalogue metadata does not give an exact action day. The displayed audit is the deterministic baseline for the submitted bundle and selected scope; it does not refute UNEP or establish failed mitigation. Local digest checks detect inconsistency and do not authenticate an issuer or prove physical repair. The retained voice is synthetic Kokoro `af_heart`; the instrumental is the original local composition from story v4.
