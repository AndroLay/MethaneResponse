# MARS prospective recurrence evaluation registration

## What is registered

The ledger freezes predictions about **whether a source already known to the archive will have at least one additional linked MARS detection date**. The target is not methane presence, future emission rates, physical leaks, repairs, or emissions reductions. The historical temporal backtest passed internal gates, but the test period was inspected during development; this ledger does not establish prospective performance.

The active baseline snapshot is the UNEP release downloaded and verified on 14 October 2026:

| Property | Value |
|---|---|
| Dataset snapshot | `unep-mars-675417694883` |
| Publisher CSV archive SHA-256 | `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43` |
| Browser input file SHA-256 | `f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7` |
| Last observation date at cutoff | `2026-09-13` |
| Number of source predictions | 4,218 |
| Outcome window | `(2026-09-13, 2027-09-13]` |
| Earliest follow-up snapshot eligible for evaluation | Retrieved on/after `2027-10-13`, with linked observations through at least `2027-09-13` |

The canonical ledger is [`record-recurrence-ledger-2026-10-14-v6.json`](../../data/processed/prospective/record-recurrence-ledger-2026-10-14-v6.json). File SHA-256: `f6038d156bfa408af568cf76df449c864069f454995edef5fb9ec2d262d825ff`. Prediction-list hash: `696aa3af6dc8ce9b235ec454853b72253eed0820e3bc469b4660d760b95cbb7b`. The ledger binds the browser input, CSV archive, cutoff, model/calibrator, source IDs, probabilities, simple baseline, code version, and registration time `2026-10-14T06:10:12Z`. Ledger v5 and earlier versions remain as history; v5 uses the 13 October snapshot with a 12 September cutoff.

The next cohort must be registered using a fixed UTC registration time and a new, unused versioned output path. The `--output` option intentionally has no default path: old ledgers are immutable and must not be write targets for the active snapshot. Example versioned name: `data/processed/prospective/record-recurrence-ledger-2027-10-14-v1.json`. Do not overwrite v6 or create a new ledger just to repeat the same evaluation.

## How to check results when a future snapshot is available

Run from the repository root after a new UNEP MARS snapshot covers the 365-day horizon and the minimum 30-day publication buffer:

```bash
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run \
  --project services/data-pipeline --locked --extra research \
  python services/data-pipeline/prospective_recurrence.py \
  --ledger data/processed/prospective/record-recurrence-ledger-2026-10-14-v6.json \
  --followup-snapshot path/to/later-mars-snapshot.json.gz \
  --evaluation-output data/processed/prospective/record-recurrence-evaluation-2027-10-13.json
```

The evaluator rejects a truncated snapshot, the same snapshot, a different publisher/dataset, an incomplete window, or retrieval before the 30-day buffer. A source ID that no longer appears is marked **unknown** and is not counted as negative. Backfill dates on or before the cutoff are excluded from labels. Evaluation uses only linked observation dates within the frozen window.

`prospective_snapshot_gates_passed` means the internal evaluation gates were met for one temporal cohort; it does not make the system a leak predictor or an operational decision basis. The absence of a later record in the archive is not proof of zero emissions or that a source stopped leaking. The evaluation records the follow-up snapshot hash, evaluator code hash, metrics, cluster-bootstrap intervals, rule baseline, and limitations.

## Evidence currently available

- Ledger v6 covers **4,218** sources and is bound to the 14 October snapshot. File SHA-256 `f6038d…`; prediction hash `696aa3…`. The same snapshot was deliberately replayed as an abstention test: [`record-recurrence-evaluation-2026-10-14-v6-baseline.json`](../../data/processed/prospective/record-recurrence-evaluation-2026-10-14-v6-baseline.json), SHA-256 `39e79be1f3316079674ea4c788ab0e09a62554ae014cbe79dc8e141a894c7158`, status `not_available`, 0 labels because a different, newer publisher release is required. This demonstrates fail-closed behavior, not prospective accuracy.
- The historical backtest on the active snapshot contains 3,131 test sources and 1,251 positive records: ROC AUC `0.80810118` (95% cluster-bootstrap CI `0.78665772–0.82756648`), Brier skill `0.27676816` (95% lower bound `0.23888887`), ECE10 `0.08817986` (95% upper bound `0.14075545`), and AUC delta over the baseline `0.02028538–0.04053327`. The bootstrap uses 79 country clusters, 400 replicates, and seed 177. These figures concern MARS records in a retrospective holdout inspected during development; they are not an independent evaluation, leak probabilities, or mitigation outcomes.
- Freeze checks reject mismatched provenance/relationships, unreproducible probabilities, malformed model/calibrator data, and invalid bootstrap/gate metadata. These tests do not turn observation sources into physical-emissions labels.

The ledger and baseline are not signed or anchored to a blockchain. A local hash proves consistency of the checked bytes, not publisher identity, ownership, or a source's physical condition. Publishing a commit or an authorized future transaction may add chronology/integrity evidence, but does not prove methane repair.
