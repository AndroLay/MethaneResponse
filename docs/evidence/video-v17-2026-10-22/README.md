# Take8 TKM proof retained in v17 and v18

This is project-supplied **local** evidence, not a public notarization or proof
of methane repair. The v18 film reuses the v17 take8 footage and commitment.
Do not substitute the older v16 take2 pin, export or receipt.

| Identifier | Exact take8 value |
|---|---|
| Historical source | `TKM_S_021` |
| Snapshot | `unep-mars-675417694883` |
| Archive SHA-256 | `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43` |
| Decision | revision 1, `request_more_evidence` |
| Trusted UI digest | `0xcab36a271a000facd92cefbbfb902b314cce70eed565a9471ca6b263b5353ec2` |
| Local transaction | `0x796615896c4dff30b01fcda5c7aade8a971b4aa7586d6ef6855aba167d7f7393` |
| Local registry | `0xbc487944444414d935a8a3a4e7183805003e9ffb` |
| Chain/block/version | Anvil **31337**, block **2**, version **1** |

`browser-export.json` is the unchanged take8 export. `trusted-digest.json`
retains its pin from the software DEMO reviewer UI before download.
`decision-with-receipt.json` and `anvil-proof.json` bind that exact decision to
the retained contract event; `anvil-state.json` holds the local ledger state.
`manifest.json` records explicit file checksums. A project-supplied pin and state
do not independently authenticate a reviewer or establish physical truth.

## Replay without signing or a public transaction

From the full repository with its pinned Bun dependencies and Foundry `anvil`:

```bash
python3 docs/demo/delivery-2026-10-22-final-v17/verify_evidence.py \
  --expected-digest 0xcab36a271a000facd92cefbbfb902b314cce70eed565a9471ca6b263b5353ec2 \
  --output delivery-output/tkm-take8-recheck.json
```

Choose a new output path for each run. The verifier checks manifest hashes and
same-take equality, restores state into a disposable loopback-only Anvil, and
runs the real decision CLI with `--require-chain`. No private key, AI provider,
deployment or new transaction is needed. Expected exits:

1. Original: **0**, event and receipt match.
2. Altered rationale versus original pin: **1**.
3. Altered rationale with recalculated digest: **1**, contract event mismatch.
4. Original restored: **0**.

The archived run is `retained-state-verification.json`. New checks are dated in
the active submission package; they do not overwrite that earlier run.

## Scientific and video continuity

- TKM source metadata is real historical MARS data. Requests, responses and the
  reviewer are explicitly software DEMO fixtures. `mitigation_confirmed` denotes
  a claim being examined, not a successful repair finding.
- `verified-facts.json` retains 4,218 sources, 30,414 total plume records,
  23,861 linked and 6,553 unlinked. A single displayed satellite estimate is
  22,926 kg/h with reported SD 7,969 kg/h on 2021-05-09 07:06:21 UTC.
- KAZ_S_159 is a **separate archived DeepSeek integration** on a project-authored
  DEMO excerpt, not an AI inference for TKM or field mitigation evidence.
- V18 verification: `../video-v18-2026-10-22/verification-summary.json`.
  The local MP4 is 297 seconds, SHA-256
  `b14bc61f893176631c8ce15445217ea1ab4977e52a1c252b81d2e661b4006fad`.
- Historical data and derived excerpts retain the included CC BY-NC-SA 4.0
  notice. No third-party report body is redistributed and no UNEP endorsement
  is asserted.
- Frozen r12 stays 0/48 according to its frozen scorer. Neither the video nor
  these software checks establish user productivity or reduced emissions.
