# v10 — current exported artifact review

Date: 2026-10-19. This is a local video revision, not an upload, deployment, or competition submission.

## Artifact and provenance

- [MP4, 4:50](../../../delivery-output/story-v10/MethaneResponse-Directed-Presentation-Demo-4m50-v10.mp4): 48,888,439 bytes.
- SHA-256: `8e5a36f716c97257320b9b9e2ec6ed519c3da7f34bc55b17b0c1f1285174d1de`.
- Render build key: `e5aa6ed12a8708`. [Manifest](../../../delivery-output/story-v10/render-manifest.json).
- Actual new browser recording: eight shots, zero page errors. Raw capture SHA-256: `3de8dc98ffd4cb0e9aaf00f3a1b8838949cc84e7a04bce9257af3e0a0a4a2b98`.
- Source: `KAZ_S_159`, snapshot `unep-mars-675417694883`. Each shot is synchronized using an observed full-screen recording slate; slates are excluded from the edit. Cursor events and DOM focus rectangles are retained in the capture manifest. Browser recording/event delivery is not a forensic timing guarantee.
- [Capture manifest](../../../delivery-output/story-v10/capture-master/capture.json), [sync manifest](../../../delivery-output/story-v10/sync.json), and [verification summary](../../../delivery-output/story-v10/verification-summary.json).
- English voice and original instrumental are retained from v9.3. Audio packet SHA-256 is unchanged: `5ae55953d8962346089b61f9a5e810c5e248401f65517d28f91a270644c4019f`. Voice is synthetic Kokoro `af_heart`.

Earlier exports and capture takes remain available. Neither local audit state nor earlier verification evidence is silently replaced.

## Implemented changes

1. Replaced integer crop/zoom steps with a continuous fractional affine transform and quintic easing. Camera movement has explicit entry, settled reading/typing holds, and return to context. Page scrolling uses a neutral camera.
2. Tightened form close-ups and moved smoothly between the actual question, next-action and requested-evidence fields. Shared controls remain in one stable crop while selecting scope.
3. Connected presentation and demo through the same 16:9 application window. The recorded first frame expands from a preview; the recorded last frame contracts into the following explanation. The palette and header blend when returning to a light scene.
4. Drew a larger high-contrast cursor from actual timestamped browser events, with minimum-jerk mouse travel, a dwell before clicks, and restrained click ripples. Choose File actions target the actual button.
5. Added original explanatory models: shaded globe/satellite, complementary MARS/review lanes, three dated estimates with uncertainty, the unresolved action-month boundary, evidence coverage, requested documents, and actual digest comparison. These graphics explain the source and workflow; they are not measurement imagery.
6. Added the persistent **Inspect → Scope → Assess → Request → Verify** guide and contextual action headings. The underlying English narrative explains climate context, MARS, the specific evidence gap, the next request, and the limits of local integrity checks.
7. Fixed prematurely visible text using explicit glyph-opacity masks and added a regression for it. Fixed the abrupt presentation palette change with another regression.

## Technical verification — pass

| Check | Current result |
|---|---|
| Web production build used for capture | `bun run build:web` passed; Vite's existing chunk-size advisory remains |
| Capture runtime | Eight actual application shots; zero `pageerror` events |
| Motion regressions | Six passed, zero skipped; `python3 -m unittest discover -s docs/demo/delivery-2026-10-19-directed-v10 -p test_render.py` |
| Python compilation | `render.py` and `visuals.py` passed `py_compile` |
| Delivery contract | 1920×1080, H.264, yuv420p, BT.709 tags, 25 fps, exactly 290.000 seconds |
| Timestamp scan | 7,250 frames, first 0.00 s, last 289.96 s; every adjacent presentation timestamp differs by 0.04 s |
| Full decode | Passed, no decoder errors |
| Audio | AAC stereo, 48 kHz, 290.000 seconds; −18.08 LUFS, −2.86 dBTP |
| Provenance | Current file, render manifest and audit report hashes agree; raw capture and original report hashes agree with their manifests |
| Local integrity workflow | Original digest/checksum match; altered bundle rejected; untouched original matches again; no receipt included |

[Machine audit](../../../delivery-output/story-v10/review-final/report.json) contains 18 passing technical checks and no failures. [Verification summary](../../../delivery-output/story-v10/verification-summary.json) binds the supplementary frame-timestamp and capture checks to this artifact. Frame-rate results describe the encoded video, not device or application rendering performance.

## Visual evidence and coverage

The current MP4 supplied 18 additional full-resolution frames around complete transition intervals and proof states. The [connected-join contact sheet](../../../delivery-output/story-v10/review-motion-final/connected-joins-contact.png) was inspected, together with full-resolution current-video frames at 03:14 and 04:15. Earlier source-render stills were also inspected for the source, uncertainty plot, month boundary, scope controls and altered-report result. The technical helper extracted 45 further frames; their presence does not mean every one was visually reviewed.

| Interval | Observed evidence |
|---|---|
| 00:18.00 / 00:18.60 / 00:19.20 | The case window contracts and the dark application background blends toward the light climate scene |
| 02:19.60 / 02:20.00 / 02:20.60 / 02:21.20 | The scope form remains the shared subject as the explanation yields to the application |
| 02:23 / 02:27 | Scope controls are enlarged together; pointer and focus outline identify the current action |
| 02:50.96 / 02:51.60 / 02:52.20 | The recorded result frame returns to the bounded-result explanation |
| 03:07.60 / 03:08.60 / 03:10 | The explanation connects to actual casework and the first typed field |
| 03:14, full resolution | The next-action text and cursor are readable in the close-up; surrounding nonessential content is intentionally cropped |
| 04:00 / 04:15 | Actual changed-copy rejection and restored-original matching result remain visible |

## Artistic review — partial

| Dimension | Status | Evidence and limit |
|---|---|---|
| Product proof and bounded claims | pass | Actual source, baseline, casework, report and verifier capture; source ledger retained |
| Composition and UI framing | pass, sampled | Current-video transition samples and full-resolution close-ups above; this is not approval of every frame |
| Camera continuity implementation | pass | Fractional-position and camera-path regressions, neutral scrolling, sampled crop states |
| Transition geometry and palette | pass, sampled | Connected intervals above; first/last source frames retained across joins |
| Whole-film rhythm and perceived smoothness | not_reviewed | Full normal-speed viewing has not been performed in this session |
| Narration naturalness and sound-motion integration | not_reviewed | Current export has not been listened to; signal and packet checks do not establish perceived quality |
| Reference-film parity | not_reviewed | No claim of matching the reference videos' complete production quality |
| Phone viewing/readability | not_reviewed | No physical phone playback; landscape desktop export only |

Deliverable state: **technically verified local revision with partial visual review**. The helper intentionally leaves `creative_status: not_reviewed` and `delivery_ready: false`. Full normal-speed viewing with audio remains necessary for an artistic approval or publication-ready claim.

## Scientific, rights and service boundaries

Use the [approved source/claim ledger](../delivery-2026-10-19-story-v4/03-Sources-and-Claims.md). Three EnMAP estimates are separate dated observations with recorded uncertainty. The graphic's column spacing is categorical. The warming-attribution counter and sphere are explanatory animation, not a time series or methane measurement.

The UNEP catalogue describes July action without an exact day in the retained metadata. The local insufficient-coverage result concerns this submitted bundle and selected UTC scope; it does not contradict UNEP or establish failed repair. Analyst casework is browser-local and does not contact an operator. Hashes/checksums demonstrate local consistency, not issuer identity or physical mitigation. No AI provider, public chain receipt, or measured climate/user impact is represented as verified.

Graphics and satellite prop are original procedural work; no reference-video assets or full third-party report are reproduced. Existing MARS data attribution and report-link licensing boundaries remain in the claim ledger. Fonts are rendered from local Inter/DejaVu; voice/music provenance is retained. Prior human review/pilot deferral remains in force. Public upload, deployment and submission were not performed by this revision.
