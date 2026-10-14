# Interface asset rights inventory

**Checked:** 14 October 2026 (WITA)
**Scope:** ten WebP files found under `apps/web/public/assets/` at the start of this review.

## Finding

The files came with a user-supplied UI source package. The repository contains
no original URLs, creators, generation records, or license grants for them.
The fact that a file was supplied for integration does not establish a right
to redistribute it in a public repository. Until permission or provenance is
recorded, these files are not covered by the repository's MIT license and are
not cleared for a public release or submission bundle.

The table records the exact starting files using their SHA-256 and notes their
prior uses. File hashes identify the inspected files; they do not prove
authorship or permission.

| File | SHA-256 | Prior use at initial audit | Rights status |
|---|---|---|---|
| `atlas-demo.webp` | `28bd26db1005fed30d5b262962bd03a02694cbaa3b1a13e7470a534421fae02a` | Landing page prototype visual; labeled illustrative, not live UNEP data | Unknown |
| `earth-decor.webp` | `561039b06e11110290153b09111c26e816e949391d1cecd93a93826f9cd091fd` | CSS decorative Earth background | Unknown |
| `earth-observation-hero.webp` | `a88166423ea7174926c783cbc615fb9d822970793b688f81ed52d7042498fff4` | Landing page conceptual illustration; docs say it is not MARS evidence | Unknown |
| `landing-earth.webp` | `2371142182a80088a5da1cd5ad4beed990390468fd133c9d4ab0193b6db10636` | Dashboard and report-cover CSS backgrounds | Unknown |
| `observation-1.webp` | `cec38804973fdf02543a2b620b1156c0d2d72362430cede22fbc7e0021d6dd85` | No text reference found | Unknown; unreferenced |
| `observation-2.webp` | `b3f5d0c0db83184e1f3ebc6fae088e8e5e73e400051dad2ef46f9e7eec6fb361` | No text reference found | Unknown; unreferenced |
| `observation-3.webp` | `d863672202da224ceee1b0a972baeb41d5866fc4599a794cd1adde7045a1d629` | No text reference found | Unknown; unreferenced |
| `observation-4.webp` | `b3a58388ac8b3a04d979ec5cb473881f0352f7091df60e5b718e7e83311f29e5` | No text reference found | Unknown; unreferenced |
| `observation-5.webp` | `7f68f129cc8ffa8f1894d9487d7fc0c8d490fa34babb8850323cfb15d3acd5d0` | No text reference found | Unknown; unreferenced |
| `site-demo.webp` | `82f8cfbcb7a617d7cfd984de2696dbfdd6ab76dbf9b73390247988930569dfa6` | No text reference found | Unknown; unreferenced |

## Local implementation status

- All ten files were copied to `/tmp/methaneresponse-withheld-ui-assets-20261014/`.
  Backup SHA-256 values match the inspected originals.
- The files were removed from the active `apps/web/public/assets/` tree.
  Previously tracked files show as local deletions; the untracked hero image
  was preserved in the temporary backup. No change was staged or committed.
- The landing hero now plots the three linked historical MARS flux estimates
  for `KAZ_S_159` in UTC date order, with categorical spacing and reported
  standard-deviation whiskers. Exact dates are shown below; it has no connecting
  line and is not presented as satellite imagery.
- Project-owned gradients replace the decorative dashboard Earth backgrounds.
- No local files are currently approved under `apps/web/public/assets/`.
  Vite development returns 404 for any unapproved path under `/assets/`; the
  production build prunes files copied from that directory unless their
  relative paths are explicitly allowlisted. Generated JS/CSS chunks and files
  under `public/data/` are outside this asset rule. Focused tests cover the
  denylist, allowlist behavior, and preservation of unrelated output.
- These are local changes. The public Git remote has not been updated; earlier
  commits may still expose previously tracked files. No history rewrite was
  performed.

## Remaining release actions

1. Do not restore or add files under `public/assets/` unless creator/source,
   license or written permission, attribution, and restrictions are documented
   and the exact relative path is added to the approved asset list.
2. Keep the local `/tmp` backup out of repository ZIPs.
3. After a future commit/release, verify the public revision and published
   build. The current local changes alone do not alter the remote repository.

## Additional design-reference files

Eight PNG page mockups supplied with the 2026-10-13 redesign archive are present in the local-only directory `docs/design-reference/2026-10-13/`. Their source, creator, and redistribution license are not recorded. They are layout references rather than product assets; the files remain in the local working tree but have been excluded from the public release candidate. The public UI redesign note links only to actual application browser evidence, not these mockups.

## Verification boundary

This is a local inventory, not a legal opinion. The current app's runtime
location-context tiles are fetched from Esri/OpenFreeMap and have separate
on-screen attribution and provider terms; they are not these bundled WebP
files. The MARS source observations and publisher geometries also have their
own attribution and dataset terms in `data/real/README.md` and
`docs/MARS_PUBLISHER_GEOMETRY.md`.
