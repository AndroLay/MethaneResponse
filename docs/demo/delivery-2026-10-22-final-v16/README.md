# v16 — readable proof, unchanged story

Focused revision of the preserved v15 film, **4:40 / 280 seconds / 1080p / 25 fps**.
English narration, original instrumental score and exact caption timing are
reused. No new model request, narrator generation, paid service, deployment,
public transaction or upload is part of this edit.

## Editorial changes

| Time | Repair |
|---|---|
| 00:22–00:43 | Explicit full-local-demo versus restricted-public-preview label |
| 00:54–01:03 | One real TKM observation enlarged: date UTC, kg/h and reported SD |
| 01:03–01:39 | Tighter capacity-field framing; 30,414 total versus 23,861 linked explained; active 10/comparison 20 distinction |
| 01:47–02:05 | Question under review distinguished from insufficient-evidence decision |
| 02:05–02:33 | Actual archived AI-result crop, then enlarged exact quote/verdict; KAZ remains visibly separate |
| 02:33–03:04 | Clearly labeled exact DEMO export fields: requested measurement, acceptance, recipient, deadline and decision |
| 03:04–03:27 | Actual revisit reason and frozen work 5/latest work 6; decision 1 preserved |
| 03:27–04:06 | Large trusted digest, transaction hash, decision/source identifiers and real CLI outcomes |
| 04:06–04:40 | Frozen r12 result contextualized; code and limited-preview URLs more visible |

The callout cards are **editorial excerpts**, not invented application panels.
They disclose their source and DEMO status. Raw UI footage is unchanged; cropping,
reading holds and timing remain explicit in `delivery-output/final-v16/edit.json`.

## Evidence and technical verification

[Actual v16 acceptance and review limits](REVIEW.md) records the final hash,
18 technical checks, 14 regressions and sampled visual coverage.

[Same-take TKM proof and reproduction](../../evidence/video-v16-2026-10-22/README.md)
includes the exact browser export, separately captured UI trust pin, recorded
receipt/state and fresh read-only replay. It is prepared locally; GitHub presence
must be checked after an authorized push. No public notarization is implied.

V15 is preserved at `delivery-output/final-v15-TAKE01/` with SHA-256
`c23e05776f8094c249364481e6b2304f4e9ecf7eb5251be46bc2bfde318df408`.
V16 output is `delivery-output/final-v16/MethaneResponse-Final-Submission-v16.mp4`.
Actual v16 hash and checks belong to `verification-summary.json` and
`final-audit/report.json` beside that file; do not reuse v15's acceptance digest.

The MP4 uses **burned-in captions only**, without a selectable subtitle stream.
The unchanged SRT is supplied separately for accessibility or alternate delivery.
Do not enable another caption overlay on top of the burned-in text.

## Rebuild or inspect locally

Use existing Pillow, NumPy, FFmpeg, Python and retained v15 capture/audio assets:

```sh
python3 docs/demo/delivery-2026-10-22-final-v16/prepare.py
python3 docs/demo/delivery-2026-10-22-final-v16/test_revision.py
python3 docs/demo/delivery-2026-10-22-final-v16/render.py --frames
python3 docs/demo/delivery-2026-10-22-final-v16/render.py --smoke
python3 docs/demo/delivery-2026-10-22-final-v16/render.py
python3 docs/demo/delivery-2026-10-22-final-v16/finish.py
```

Run the evidence verifier from the linked README before `finish.py`. Existing
final exports and final audit directories are intentionally not overwritten.
The smoke pass checks the three hardest sequences before full rendering.

## Submission wording

> The demo shows the full local prototype. The public preview is limited to
> selected sources and excludes private review and blockchain writes. The AI
> segment is a separate recorded KAZ_S_159 DEMO integration. TKM verification
> uses the exact exported decision on Anvil local chain 31337, not Sepolia.

Suggested video description:

> MethaneResponse helps investigation teams turn historical UNEP MARS records
> into an explainable plan, an actionable evidence request, and a verifiable
> decision. Source and reproducible TKM proof: github.com/AndroLay/MethaneResponse,
> docs/evidence/video-v16-2026-10-22/. Limited preview:
> methaneresponse-preview.onrender.com. Historical data, software DEMO review,
> separate recorded AI example, and local-chain integrity checks. Human
> productivity and physical climate outcomes remain unproven.

Copy the complete `CREDITS.txt` with an eventual authorized upload. This directory
does not establish that the video, latest code or latest proof is public yet.
Full normal-speed playback and audio listening remain separately documented;
automated meters and selected frames are not an artistic approval.
