# Connected investigations: from allocation to a frozen decision

[Setup](local-setup.md) · [Team investigations](shared-casework.md) · [API](../architecture/api-reference.md) · [Plan](../plans/2026-10-20-connected-investigations.md)

The prototype uses one API and a private file, without a database. Each investigation has **one source, one claim type, and one period/scope**. Work status, assessment result, document acceptance, and integrity status are separate concepts. All reviewer examples in testing are DEMO; they are not a human study or mitigation confirmation.

## User journey

1. In **Cases → Plan investigation capacity**, compare capacity and strategies on the same snapshot. A signed-token reviewer with current directory authority can accept a versioned plan. Open Evidence for the selected source.
2. Set the claim and period in **Evidence Auditor**. Open the shared workspace; if the reviewer session is already connected through the planner, reuse that session. The token stays in memory.
3. Fill in the question, next action, evidence requests, and acceptance criteria. **Attach accepted plan revision** checks the latest approval, source membership, snapshot, archive hash, and plan replay. After saving, the link continues to reference that historical approval, even if a later plan decision is made.
4. Under **Structured evidence requests**, issue a request with a recipient role and deadline. Requirements come from the request/acceptance-criteria fields when the event is created. **Add evidence event to draft** does not save; use **Save shared work**. No email or external message is sent.
5. Record an authorized response using an HTTPS reference, locator, and SHA-256 of the original file. Choose the correct date precision: day, month, year, or unknown. `2026-09` remains a month, not `2026-09-01`. The hash and authorization basis remain declarations until a reviewer checks them. References are not downloaded or automatically sent to AI.
6. The reviewer records rejection, a need for more evidence, or acceptance **for assessment**. Accepting a response does not produce a mitigation verdict. Run the available baseline or document-assessment path, then attach an assessment with matching source/claim/scope/provenance. Optional AI remains on the backend and requires human review; a model that has not been reviewed cannot be frozen as a decision.
7. Save all edits, then select **Download verified investigation dossier** to inspect history, plans, assessments, and snapshot comparison. **Inspect decision dossier and history** loads the exact digest. Read the original evidence, choose a decision and rationale, and confirm the inspection before selecting **Freeze reviewed investigation decision**. The server rechecks the work revision, decision head, dossier digest, and authority at commit. Any mismatch requires another review; the draft is not overwritten automatically.
8. **Verify and download decision** returns the same frozen decision with receipt status and a revisit reason. New responses/evidence, assessment changes, or acceptance-criteria changes may recommend a review. Ordinary notes do not invalidate the decision. A snapshot comparison already included in the decision is not reported as a new update.

Evidence events and work revisions are append-only. Each revision records the actor and server time; do not trust a sender name typed by a user. To correct a response that has already been reviewed, add a new response. Each response ID is reviewed once.

## Live dossier and frozen decision

An exported dossier summarizes the material available at export time. The plan journal may receive later revisions. Therefore, a decision stores a **complete dossier copy and its digest**, not just an ID or link to the latest state. Editing casework, adding a response, or changing a plan does not rewrite an old decision. A later decision includes `previousDigest` and a new revision.

Dossier version 1 still has `chainAnchored: false`: it is the payload frozen before the transaction. The receipt is stored in an outer wrapper. The UI/verifier derives chain status from the receipt and checked event; it does not alter the historical payload hash to display a badge.

## Independent verification

Store the digest through a trusted channel separate from the file being checked:

```bash
bun run verify:investigation dossier.json --expected-digest 0xTRUSTED_DIGEST
bun run verify:investigation-decision decision.json --expected-digest 0xTRUSTED_DIGEST
bun run verify:investigation-decision decision.json --expected-digest 0xTRUSTED_DIGEST --require-chain
```

Replace the placeholder with a 64-digit SHA-256 value. The digest uses canonical JSON, so indentation/key order is not a semantic change. String content, material relationships, and chronology must still match. The verifier rejects string normalization that could conceal a change. A checksum recalculated by an attacker does not replace a separate commitment.

Without RPC/receipt access, local checks do not claim chain verification. `--require-chain` fails if the target or receipt is unavailable. With read-only configuration, the verifier checks the network, registry, canonical block, confirmations, event, issuer, digest, version, and registry head. A historical receipt remains valid when a later version exists under the same registry key. Replay of a snapshot diff against complete input files uses the separate snapshot verifier.

## Anchoring and recovery

- No new contract is introduced. `EvidenceRegistry` and the audit v2 namespace remain compatible. Decisions use the `methane-response:investigation-decision:v1` namespace with hashed context/work identity. The chain receives only an opaque key and digest, not notes or documents.
- This requires `private_read`, `review`, and `anchor` scopes, current directory authority, `ENABLE_CHAIN_WRITES`, and a configured backend signer/target. A historical plan still requires `source_detected` authority even if its link has been removed from the latest work revision.
- The UI shows the chain/registry/issuer target and requests authorization for one transaction. Configuring a signer does not authorize an agent to use a public network or user funds.
- The signed transaction is created locally; the intent and nonce are durably stored **before broadcast**. Existing audits and decisions use one coordinator. A pending intent on either path blocks a new transaction on the other path.
- If acknowledgement is lost, the server may return `502` even when the transaction has been mined. Do not rebroadcast. Use **Reconcile decision**. If no receipt is available, the response is `202`; terminal outcomes are stored idempotently. An unresolved intent is not released automatically.
- Anvil tests use disposable accounts and funds on loopback. This is not Sepolia, and the disposable chain stops after testing. Rerun the test to create a new chain/evidence; an old receipt does not guarantee that its RPC will remain available.

## Storage, limits, and rollback

The same audit file stores decisions and their intents atomically. Audit envelopes 1/2 and legacy arrays remain readable. After the first decision, the envelope becomes **3**; the contract, audit bundles v2/v3/v4, and their old hashes are unchanged. The initialization marker and single-writer launcher remain in force. Corrupt state, state missing after initialization, or a modified frozen payload fails closed.

Back up the entire audit file with its marker and casework file under the writer lock after stopping the API. Existing casework maintenance backs up casework only, **not** decisions stored in the audit file. Rollback to older code requires a backup from before envelope 3, or code that understands envelope 3. Do not open the new file with an older writer because it may drop new fields.

| Limit | Value |
|---|---|
| Casework save body | 16 KiB |
| Revisions per work item / evidence events | 100 / 40 |
| Exported dossier or decision | 16 MiB |
| Total frozen decisions / decision intents | 100 / 200 |
| Total audit file | 64 MiB |
| Concurrent dossier/decision creation | 2 per process |
| Investigation operations | 20/minute per actor and client, process-local |

When a limit is reached, history is retained. Open a new investigation with the appropriate scope to continue. The prototype does not support multiple writers/instances or a distributed filesystem.

## Evidence scope

See the [verification package for this increment](../evidence/connected-investigations-2026-10-20/README.md) for the source manifest, test results, and actual screenshots. Test fixtures do not demonstrate AI provider quality, usefulness to real users, reduced emissions, public deployment, or Sepolia receipts. Integrity controls do not prove physical truth.
