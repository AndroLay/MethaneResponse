# Local demo operator runbook — English

The historical filename is retained for link compatibility. This English edition
describes the original local workflow; later [current production](../delivery-2026-10-22-final-v18/README.md)
supersedes video direction without rewriting historical evidence.

## Purpose and boundaries

Follow actual KAZ_S_159 records→observations→UTC scope→rules baseline→local follow-up
notes→report export→digest verification→altered copy rejection. This cut does not
show live AI, a blockchain receipt, a regulatory decision or physical repair validation.
Story v4 targets 4:50. Scope is the 11 July 2026 UTC observation day. Run mitigation
coverage only. UNEP's catalog gives a July 2026 action month; the underlying report
body and exact action day are absent from this bundle. Insufficient evidence applies
to this loaded scope and does not refute UNEP or establish failed action.

## Capture prerequisites and commands

Bun, `/usr/bin/chromium`, FFmpeg/FFprobe, Python 3, NumPy and DejaVuSans fonts must already
be available. The narrated story additionally needs local KokoroONNX/model/voice
assets. Never place credentials in shell/browser capture. The capture wrapper uses
a temporary symlink to installed FFmpeg; it does not download a binary. It filters
environment, uses disposable preview API state and retains Chromium sandboxing.
Run from the repository root:

`bun run build:web`

`METHANE_DELIVERY_DURATION_SECONDS=290 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bash scripts/capture-delivery-demo.sh`

`python3 scripts/generate-demo-music.py delivery-output/story-v4/original-instrumental.wav 290`

`METHANE_DELIVERY_DURATION_SECONDS=290 METHANE_DELIVERY_OPENING_STILL_SECONDS=2 METHANE_DELIVERY_OPENING_STILL=delivery-output/story-v4/assets/01-case-directory.png bash scripts/render-delivery-narrated-demo.sh`

`METHANE_DELIVERY_OUTPUT_DIR`

Existing output is never overwritten. Set `METHANE_DELIVERY_OUTPUT_DIR` to a fresh
path. Preserve old captures/manifests; the narrated story uses a short workspace
temporary alias to avoid depending on `/tmp` quota. Its renderer checks duration,
codec, frame count, sample rate and full decode. The initial still represents actual
app loading coverage, not a fabricated interactive result.

## Manual presenter sequence

1. Open the local production build; show preview/historical labels and attribution.
2. Select KAZ_S_159 and inspect three discrete EnMAP observations with reported uncertainty.
3. Set the intended event/day/claim scope and Apply; explain metadata coverage rather than authentication.
4. Run mitigation assessment; bound insufficient evidence to the provided bundle/period.
5. Save local notes requesting action date and method-appropriate follow-up evidence; do not claim the request was sent.
6. Download JSON in Reports and select the same file in Verification Center. Show digest/context results and explicitly missing blockchain receipt.
7. Select a separately altered bundle copy. The verifier must reject it; retain/reselect the original and show matching verification again.
8. Explain that an unsigned checksum can be recomputed; integrity consistency, authorship and physical truth are different checks.

## Reset and fallback

Stop only demo-owned processes; use a new output/state directory for another run.
If external tiles fail, show fallback status, source ID, coordinates and provenance;
imagery is location context, not plume evidence. If source/menu/API/baseline fails,
stop capture and inspect logs instead of inventing successful overlays. Original
verification must pass before showing tamper rejection. Never delete user state.

## Delivery recorded at the time

Materials/MP4 were local and not uploaded. The earlier Notion ZIP was not imported
or published; later story production did not require Notion. Render Blueprint was
then reviewable but not deployed; service creation/publication required explicit
target/source authorization. These historical statements do not describe the
current Render service. Follow current release evidence for public status.
