# Connected investigation — technical video supplement

This is a separately dated **actual software workflow recording**, alongside the
historical narrated v12 presentation. It is not a replacement 3–5 minute
submission film. English chapter captions and the project's original instrumental
accompany the real application; this supplement has no new voiceover.

The browser exercises a production build and local Hono API on disposable state.
It accepts an allocation, scopes source `TKM_S_021`, issues an evidence request,
records a software DEMO assessment, compares reused evidence, saves a response,
freezes the dossier and checks that later evidence recommends review without
rewriting the frozen decision. No model request or public-chain transaction is
depicted. The real historical source metadata and synthetic reviewer actions are
explicitly distinguished.

## Reproduce

Install the locked app dependencies, FFmpeg and Python Pillow. Run from repo root.
The capture uses the existing Playwright scenario with an optional cursor/marker
hook, a new output directory and separate local ports. Install the small
Playwright recorder binary locally if it is unavailable:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/delivery-output/playwright-tools" bun run playwright install ffmpeg
PLAYWRIGHT_BROWSERS_PATH="$PWD/delivery-output/playwright-tools" bun --no-env-file docs/demo/connected-2026-10-20/record.ts --output delivery-output/NEW-CAPTURE
python3 docs/demo/connected-2026-10-20/edit.py --capture delivery-output/NEW-CAPTURE --output delivery-output/NEW-EDIT
python3 -m unittest discover -s docs/demo/connected-2026-10-20 -p 'test_*.py'
```

**Run builds/captures/browser suites sequentially.** They share `apps/web/dist`.
A second build during an existing preview can remove content-addressed chunks
still needed by an open tab. Different HTTP ports alone do not isolate build
output. Earlier unsuccessful capture attempts and the affected test log remain
in ignored local output; they are not represented as application assertion passes.

The editor preserves native 1440×1000 application pixels inside a 1920×1080
canvas, adds side/footer context and bookends, and encodes H.264/AAC at 25 fps.
Actions are not sped up. The clip intentionally contains viewport-resize and
stale-response regression steps, so it is a technical supplement rather than
polished uninterrupted presentation footage. Chapter timing uses actual marker
times with an estimated browser-start offset. No camera-shake or zoom effect is
added to the application. Existing v12 has the separately authored narration,
editorial camera work and introductory explanation.

Local final artifact:
`delivery-output/connected-walkthrough-2026-10-20-v2/MethaneResponse-Connected-Workflow-2026-10-20.mp4`.
Its verification JSON records exact duration, hash, raw-capture identity and
limitations. Full decode and frame inspection are separate from normal-speed
human audiovisual review. No file is uploaded by these scripts. The original
score is reused from `delivery-output/story-v4/original-instrumental.wav`; retain
or rebuild that original project asset to reproduce the edit.
