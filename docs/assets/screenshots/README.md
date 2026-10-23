# README screenshot provenance

Five actual browser screenshots are presented in the root README. The gallery
uses lossless WebP encoding with no crop, resize, compositing or generated art.
Decoded RGB pixels were compared with each source PNG. Combined image size is
less than 2 MiB; full-resolution files remain clickable.

[manifest.json](manifest.json) records capture dates, original paths and hashes,
output hashes, dimensions and environment. The public dashboard was captured on
21 October 2026; the four task screenshots were captured on 23 October in local
isolated production-build browser workflows. They are not all public-preview
screens, and the new handoff control is not part of the older v18 film.

The TKM_S_021 records are historical MARS metadata. Requests, responses and the
reviewer are software DEMO fixtures. The mock-provider availability indicator in
the local workspace does not establish a live model invocation. The request
capture shows an issued DEMO request, not a message delivered to an operator.
The decision capture has no chain receipt. Basemap imagery in the public
dashboard provides location context, not a methane concentration measurement.

Run `python3 -m unittest discover -s scripts -p 'test_*.py'` to check README local
links, image hashes and provenance inventory. Reproduce the task screenshots
with the commands in the [organization walkthrough](../../product/organization-walkthrough.md).
The gallery intentionally retains the source PNGs in their original evidence or
ignored browser-output locations; raw run outputs are not all in the repository.

The documentation structure takes inspiration from the concise hero, clear
entry links and visual feature sections in [Orca](https://github.com/stablyai/orca),
the explicit project-status and documentation entry points in
[Immich](https://github.com/immich-app/immich), and the user's local Evidrilo README.
No screenshots, brand assets or product copy from those projects were reused.

Original application UI has the repository's software license. Underlying UNEP
data and third-party imagery retain their separate terms: [NOTICE](../../../NOTICE)
and [data attribution](../../../data/real/README.md).
