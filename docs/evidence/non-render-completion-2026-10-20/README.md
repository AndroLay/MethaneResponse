# Non-Render prototype completion — 20 October 2026

This package records a new local verification increment after public source
`173bbb8b763a0014289031d3d14dec5a64399c9f`. It does not replace any earlier frozen
package. Exact commands, source bytes and outcomes are in `checks.json` and
`source-bindings.json`; `artifact-manifest.json` inventories this package.

## Decisions and implemented changes

- **Render excluded** by the user. No Render resource or other project's
  service is changed. No database is added.
- **Blockchain accepted as a local prototype without wallet funding.** Actual
  EvidenceRegistry transactions on disposable Anvil chain 31337 verify latest
  and historical receipts, reject tampering (including recomputed checksums),
  reconcile lost RPC acknowledgement, and recover process crashes. The
  independent CLI is invoked while the local chain is running. The integration
  test stops that chain afterward; its receipts have no public explorer URL.
- **Luna configuration deferred by the user.** The existing backend contract,
  security/rights constraints and future acceptance sequence are documented in
  [the integration guide](../../development/luna-integration.md). No substitute
  model is downloaded, no Luna request is made, and mock-provider results do
  not establish model accuracy or compatibility.
- **Map/CI regression fixed.** Explicit Locate previously depended on a viewport
  notification before lazy MapPanel could mount. The queue could push the map
  below the viewport. The browser regression suppresses just that notification
  and reproduces the original missing `20 planned sources` caption before the
  fix. Explicit focus now activates and scrolls the map, while normal lazy
  loading remains. The same regression checks exact 10→20 source membership,
  map visibility and the selected-source handoff to Evidence Auditor.
- **Delivery packaging strengthened.** An opt-in allowlisted completion layer
  retains the original P2 payload and appends these dated receipts/checks and
  captures. Missing, extra, non-byte, oversized or replacement inputs are
  rejected. Per-file hashes and archive CRC/size checks remain mandatory.

## Verification boundaries

`bun run check:all` passed **877 primary tests**: 296 API, 278 web, 63 TypeScript
tooling, 221 pipeline Python, 15 delivery-tool Python and four Foundry tests.
Frozen install, typecheck, production build and App bundle budget pass;
App entry is **74,702 / 75,000 gzip bytes**. The large lazy MapPanel chunk still
has its existing advisory; this is not a new measured mobile performance result.

Additional submission packager regressions and real local Anvil integration
have separate logs. Browser results in `checks.json` distinguish the Node schema
check from actual journeys and exclude the five runner-helper tests from the
unique total. Real Chromium screenshots were inspected. The map regression
deliberately blocks external imagery for a deterministic offline fallback;
its marker/caption screenshot is not evidence of loaded satellite tiles or
physical-phone rendering quality. The mock AI and DEMO reviewer are software
fixtures, not an external model or independently enrolled human.

**170 frozen artifacts in seven earlier packages** still match their manifests.
The active data remains `unep-mars-675417694883` (4,218 source / 30,414 plume
records). The separately staged `unep-mars-b65f695b5168` candidate is retained,
not partially activated. Promotion requires rebuilding and binding all
derivatives, preserving old inputs and versioning transition replay; a dataset
removal or reassignment cannot silently rewrite old judgments.

## Repeat the local blockchain demonstration

With Bun, Forge and Anvil installed, run from repository root:

```sh
bun run test:chain-integration --evidence /tmp/methane-local-proof-new.json
```

Use a fresh evidence path. The runner filters environment, disables `.env`, uses
an ephemeral signer and loopback RPC, and does not call Sepolia. Receipt and event
validation are actual contract execution, not a fake UI response. This is an
automated demonstration; it does not leave a persistent blockchain preview.

For the broader application, follow [local setup](../../development/local-setup.md).
Rules/manual review and file-backed audit reports do not require an AI account,
cloud service or cryptocurrency wallet.

## Public state and remaining external prerequisites

- Earlier CI `39419272105` failed the viewport-dependent map journey after 27
  main passes; Python and Solidity jobs passed. The exact new commit's CI must
  be checked separately on GitHub after authorized push. Local test success is
  not a claim that public CI or hosting succeeded.
- A fresh Sepolia read-only check found balance 0, pending nonce 0 and no registry
  bytecode; no transaction was sent. The user then selected the no-funding local
  prototype path. Sepolia is optional future evidence, not an unfinished local
  transaction to be fabricated or funded automatically.
- Devpost `list_my_projects` returned connector internal error `-32603`.
  No form target was obtained and no submission was performed. Video upload,
  public application verification and final form publication remain separate
  actions. Notion import/publication is not required by the user.
- v12 is the historical 267.92-second narrated film; the 65.4-second supplement
  records the connected workflow. Existing video bytes are retained. Neither
  demonstrates live Luna or a public chain. Upload and full human audiovisual
  review are not inferred from file hashes or successful decode.
- Rights-cleared independent labels, actual human pilot/expert review and
  physical-phone validation are not replaced by agent simulation or viewport
  emulation. Recruitment remains deferred. No winning score, operational time
  saving or methane reduction is inferred from test counts.

Feedback is not repair. Missing observations are not zero emissions. A verified
hash or chain receipt establishes integrity/chronology, not physical truth.
Software is MIT; attributed MARS-derived screenshot data retains its recorded
CC BY-NC-SA 4.0 terms. No third-party report body or private runtime state is
included in this package.
