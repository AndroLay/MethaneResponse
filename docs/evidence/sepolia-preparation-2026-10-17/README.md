# P2 public-operation preparation — Sepolia

**Historical status:** target/private configuration prepared; the user approved the three operations. Funding remained blocked: both Chain Platform and QuickNode reportedly rejected an issuer without a Mainnet balance. **No public deployment, anchor, or receipt existed at this checkpoint.**

This continues [P2 local implementation evidence](../blockchain-recovery-2026-10-17/README.md). Earlier evidence is preserved. Preparation does not complete P2 integration.

## Concrete target

| Field | Value |
|---|---|
| Network | Ethereum Sepolia, chain ID `11155111` |
| Checked public RPC | `https://11155111.rpc.thirdweb.com`; installed viem Sepolia default |
| Dedicated new P2 issuer | `0x211334Ab7398e2A7268014c31809bd712F033afa` |
| Planned registry | `0x0F78a787142abF509b6A7178bA1bfDfb9c8b202d` |
| Registry state | Predicted CREATE address at issuer nonce 0; **no bytecode yet** |
| Operational audit | `52d1031b-bdf0-4bc7-803c-8a59040975ab`, revision 1 |
| Source / case / claim | `KAZ_S_159` / `MARS-REPORT-KAZ-S-159` / `source_detected` |
| Bundle SHA-256 | `0xc8bf622d1c87752a6d76dd5cca0c2e1897e78a1d017fe7b35f1b85951f82d442` |
| Minimum confirmations | Two blocks with canonicality rechecked, not guaranteed finality |

The audit was created through the baseline endpoint using actual `FileAuditStore` under `flock` in dedicated new state. The [unanchored operational export](operational-baseline-unanchored.json) passed offline verification. Earlier candidate audit/hash values differ because issuance ID/time changed; they do **not** authorize this operation. Only attributed historical metadata was used, without invented mitigation or copied third-party report contents.

Server/signing configuration was prepared at the user's request. `data/state/p2-sepolia/server.env` and all associated state are Git-ignored; directory mode 0700, configuration/audit/marker files 0600. Never display their contents. Signing remains `ENABLE_CHAIN_WRITES=false`. State is separate from the user's `data/state/audits.json`; the active API does not automatically switch.

## Funding history

The user reported Chain Platform required **0.001 Mainnet ETH**. The new issuer did not qualify; CAPTCHA completion alone was insufficient. No purchase/transfer of Mainnet ETH was requested. [Follow-up](funding-follow-up.json) separates the user report from the first browser inspection.

QuickNode was also rejected: the user reported `Invalid ETH mainnet balance` on the actual form, contradicting the official FAQ used earlier. **The recommendation that QuickNode suited a new issuer was withdrawn.** An initial page/FAQ does not establish eligibility. [Correction](funding-runtime-correction.json) records this distinction.

An initial inspection of [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/) and its public API configuration found native SepETH, minimum claim 0.05, startup CAPTCHA, and PoW/passport modules. The browser showed an address field and `Start Mining`. No session/mining/claim started in that initial inspection. Missing Mainnet-wallet fields in client config do not establish server eligibility; issuer acceptance/payout remained untested. No Mainnet purchase was requested. Existing deployment/anchor approval remained valid.

At the user's later request, the agent **tried PoW directly twice**: entered the issuer, clicked Start Mining, then performed one normal reload/retry. Both returned `[INVALID_CAPTCHA] captcha check failed: invalid token` and `Could not start session`. Mining never started; no reward/claim or CAPTCHA bypass occurred. RPC checks confirmed **0 SepETH**, pending nonce **0**. [Attempt record](pow-agent-attempt.json) and [rejection screenshot](pow-faucet-captcha-rejection.png) retain the outcome. P2 integration remained incomplete; target/hash and prior approval remained valid.

## Approved operations

1. Claim one **0.1 test ETH** drip from [Chain Platform Sepolia Faucet](https://faucet.chainplatform.co/faucets/ethereum-sepolia) to the issuer. Browser showed Sepolia `11155111`, address field, and `Get 0.1 ETH`. After approval, the address was entered and clicked once. The faucet replied `Please complete the captcha verification first.` ([attempt](faucet-attempt.json)); no claim transaction hash existed. The user was asked to complete CAPTCHA; no anti-abuse bypass was attempted.
2. Deploy **one** EvidenceRegistry, no constructor arguments, from issuer nonce 0. Owner/initial issuer are the same account. Bytecode compiled with `solc 0.8.24`, optimizer 200, is frozen in [operation details](deployment-and-anchor-review.json).
3. After checking runtime bytecode, owner, `isIssuer`, nonce, and balance, anchor **one** audit/hash above using the API and P2 durable intent. Expected version 1; no `setIssuer`, second anchor, ETH purchase, or Mainnet operation proposed.
4. Run a separate verifier with signing disabled and `--require-chain`; test altered bundle/issuer copies. Retain receipt, deployment/anchor hashes, block/hash, target, and results before marking P2 integrated.

Approved limits: deployment **3,000,000 gas**, anchor **1,000,000 gas**, `maxFeePerGas` **1 gwei**, total network cost **0.004 Sepolia test ETH**, transfer value zero. Recheck and stop if limits, nonce, target, bytecode, or hash change. No real-money authorization. Two confirmations do not establish methane repair.

[RPC simulation](deployment-and-anchor-review.json) estimated 2,239,773 deployment gas and 355,539 anchor gas using **temporary simulation state overrides** for issuer balance and undeployed registry code/storage. Network state did not change. Estimates establish neither available funds nor successful deployment and must be repeated before broadcast. Checked issuer balance/nonce were zero and the registry was undeployed.

[Authorization](authorization.json) was received for the three operations and binds the operation-detail JSON hash; identical approval need not be requested again. Approval was required by AGENTS.md for deployment/external mutation and by the [P2 plan](../../plans/2026-10-17-six-package-completion.md#6-p2--blockchain-aktif-pemulihan-dan-verifikasi) for authorized targets/operations. Execution still required funding and target/limit rechecks; approval is not transaction success.

## Checks performed during preparation

- Actual public RPC responded as Sepolia `11155111`; head, timestamp, balance/nonce, and estimates are retained in operation JSON.
- `sha256sum --check --quiet docs/evidence/blockchain-recovery-2026-10-17/implementation-files.sha256` matched: previously tested implementation source unchanged.
- Focused store/intent/idempotency/authority/chain tests: **25 passed, 0 failed, 105 assertions**, five files. Not added to the earlier 589-test snapshot.
- Forge build/contract tests passed; contract source unchanged.
- Operational offline verification: bundle VALID, receipt ABSENT.
- Mode/`git check-ignore` checks confirmed private configuration/state protection. The evidence package contains no private key/token.

P2 remains **in progress at this historical checkpoint** pending a real Sepolia receipt and separate-process verification. P3–P6 are outside this record.
