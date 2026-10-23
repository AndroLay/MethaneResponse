# MethaneResponse Six-Package Completion Sequence

[Plan index](README.md) · [Implementation status](../release/current-implementation-status.md) · [Repository map](../repository-map.md)

**Prepared:** 17 October 2026, WITA.

**Status:** P1 locally verified; P2 implementation/recovery verified locally, public Sepolia integration pending; P3 locally verified; P4 awaiting review as directed by the user; **P5–P6 complete within agent scope**, with human/provider research still pending. [P5/P6 results](../evidence/p5-p6-agent-completion-2026-10-18/README.md) do not replace human studies or independent gold.

**Internal target:** complete all work and outcome decisions by **20 October 2026, 23:59 WITA**, before 21 October. Freeze feature changes at 16:00 on 20 October to leave time for final checks.

**Baseline:** HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` plus local changes recorded in the implementation status. HEAD alone does not identify all active code because the working tree was not clean.

## Goal and work boundaries

Complete the six agreed packages with inspectable results: team workflow, a functioning blockchain, publication governance, expert review, user benefit, and AI evaluation. UX, privacy, reliability, testing, documentation, and demo alignment improvements are acceptance criteria for each package, not additional feature packages.

This plan governs subsequent work. Writing the plan does not perform a deployment, transaction, paid-provider call, expert/participant contact, Notion publication, or submission. Local preparation may happen first; external actions must follow the authorization in effect once a concrete result is ready for review.

**Execution compatibility:** preserve the stack and user changes; one writer per file. Agent review may inspect design/code but does not replace domain experts, independent annotators, or pilot participants. This plan does not require creating a branch, commit, worktree, or service merely to execute it.

### Governing specifications

- [Active implementation status](../release/current-implementation-status.md), [user workflow](../product/user-workflow.md), and [MARS response workflow](../product/mars-response-workflow.md).
- [No-database decision](../architecture/decisions/2026-10-15-local-prototype-no-database.md), [architecture](../architecture/overview.md), and [API](../architecture/api-reference.md).
- [Pilot protocol](../evidence/target-user-pilot-protocol.md) and [AI annotation/evaluation protocol](../testing/ai-benchmark-annotation.md).
- [Public comparison dated 16 October](../research/competitive-landscape-2026-10-16.md), [event requirements](../release/event-requirements.md), and [local Notion package](../demo/notion/README.md).

## 1. How the work relates to judging

The 17 October review of the [official overview](https://ieee-climatechain-hack.devpost.com/) and [rules](https://ieee-climatechain-hack.devpost.com/rules) found the following five qualitative criteria; no numeric weights are listed. The gates in this document are internal decisions, not an official scoring formula or guarantee of winning.

| Criterion | Supporting work | Required evidence |
|---|---|---|
| Climate Impact | P4 and P5 | Expert-validated problem/task, comprehension and evidence-check results; limits on connecting results to field action |
| Innovation & Creativity | P3, P5 and P6 | Workflow comparison with existing systems and measured added value; no claim of uniqueness just because AI/blockchain is used |
| Technical Execution | P1, P2 and P3 | Cross-session work, conflict/restart/recovery, real receipt and separate verifier, correction/withdrawal without changing history |
| Practical Usefulness | P1, P4 and P5 | Target users complete tasks, suitable access, results versus manual methods, scale and operating-cost limits |
| Presentation & Communication | Closeout across all packages | One 3–5 minute flow, final-version metrics and screenshots, evidence links, and clearly explained claim limits |

**Main proposed outcome:** teams can continue investigations of historical sources, assessments have a traceable basis, publications can be corrected, and version integrity can be checked. Feedback is not proof of repair; a missing observation is not zero emissions; a receipt is not proof of physical truth. Do not claim unmeasured emissions reductions.

Eligibility and the submission window are administrative prerequisites. The Overview and Rules still contain conflicting text about participant categories and start/closing times. Record this and prepare questions for the organizers; do not assume the conflict is resolved or send messages automatically. Keep the internal target before 21 October.

## 2. Sequence and schedule

IDs P1–P6 preserve the six packages. Execution sequence numbers differ because some work has dependencies and can proceed in parallel.

| Sequence | Target time, WITA | Work | Expected result |
|---|---|---|---|
| Preparation | From the start of 17 October | Select cases/tasks and owners; prepare expert and participant materials, document rights, provider, and testnet | Learn about real availability and permissions early; do not wait for all code to be finished |
| 1 | 17–18 October | **P1 — Collaboration and shared storage** | Two authenticated sessions can continue the same investigation; conflicts and restarts are safe |
| 2 | 18 October | **P3 — Publication correction and withdrawal** | Public summaries have a current status and an inspectable history |
| 3 | 18–19 October | **P2 — Anchoring, receipts, and verification** | Durable intent and local recovery, followed by real testnet evidence after authorization |
| 4 | Start 17 October; target closing of findings before 12:00 on 20 October | **P4 — Domain expert review** | Written review of methods/cases, findings list, fixes, and re-review |
| 5 | Preparation 17–18 October; sessions 19 October through 12:00 on 20 October | **P5 — User benefit and differentiation evaluation** | Pilot with 5–8 users and manual comparison using a frozen build and tasks |
| 6 | Preparation/annotation from 17 October; results by 12:00 on 20 October | **P6 — Real AI evaluation against rules** | Licensed corpus, independent labels, paired results, and a model-suitability decision |
| Closeout | 20 October, 16:00–23:59 | Blocking fixes, final checks, evidence freeze, and docs/demo alignment | Clear status for all six packages; build, reports, Notion, and claims point to the same results |

**Technical path:** P1 → P3 and P2 recovery foundations → stable build for P5 → closure. P2 and P3 need not wait for each other once the storage interface is agreed. If worked in parallel, `store.ts`/`app.ts` still have one writer and changes are integrated in sequence.

**Human/data path:** permissions and case selection → P4 and P6 annotation; P5 requires participants and a stable build. Method review and document collection may proceed before P1 is complete. Freeze the assessment protocol before seeing participant/model results.

This four-day schedule is aggressive and depends on human availability, document rights, access, and external authorization. It is a work target, not a promise that all gates will pass. If prerequisites are unavailable, continue independent work and report the package as incomplete; do not replace real results with simulations.

## 3. Initial preparation and decision points

- [ ] Choose one main workflow: historical source → claim scope → assessment and evidence request → team handoff → revision → public summary → verification. Also select cases for insufficient evidence, revision conflict, and publication withdrawal.
- [ ] Freeze task definitions and claim boundaries. Separate illustrative/demo cases, the AI evaluation corpus, and pilot cases; do not leak gold results into model development.
- [ ] Prepare the expert review package and local pilot invitation; confirm availability through the owner/authorized channel. Keep identities and consent in private storage.
- [ ] List documents with rights by use: inspection, quotation, private storage, provider processing, and metric publication. A public URL does not automatically grant all these rights.
- [ ] Check readiness of the API target, persistent volume, reviewer identity, provider, cost limit, RPC, registry, and issuer without printing secrets. Secrets belong in the backend; none in `VITE_*`.
- [ ] On **17 October**, decide whether the P6 schedule is feasible based on document rights, two annotators/adjudicators, corpus, and provider availability. If not ready, record schedule risk and independent work that can continue; do not promise a benchmark in four days without these prerequisites. **18 October at 12:00** is a recheck of all people/permissions/access, not the first check. Do not lower evaluation thresholds to make the schedule appear feasible.

<a id="4-p1--kolaborasi-dan-penyimpanan-bersama"></a>

## 4. P1 — Collaboration and shared storage

**Owners:** API implementer for persistence/authorization; web implementer for synchronization after the API contract is agreed. A reviewer checks conflicts, recovery, and access leakage.

**Accepted design for local P1:** one small team project through **one API process**, private files on storage that survives process restart, and atomic version checks on writes. The server is the shared source of state; the browser stores drafts/cache. Keep Bun/Hono, TypeScript, and the file store; do not add PostgreSQL, Supabase, SSO, or multiple instances.

This extends the local prototype boundary in the 15 October ADR through the [accepted P1 ADR](../architecture/decisions/2026-10-17-shared-casework-single-writer.md), distinguishing the requested collaboration scope from new hosted infrastructure. A hosted target, volume, or new cost requires an owner decision before use. A local two-session test does not count as evidence for a remote service.

**Target files:** `apps/api/src/store.ts`, new module `apps/api/src/case-work.ts` and its tests, `apps/api/src/app.ts`, `packages/shared/src/index.ts`; `apps/web/src/case-work.ts`, `CaseWorkPanel.tsx`, `CasesWorkspace.tsx`, and related tests. Keep the casework interface separate from immutable audit bundles. Document the API, configuration, backups, and follow-up ADR.

### Steps and completion criteria

- [x] Define a minimal contract: investigation ID, claim scope, version, actor, owner/assignee, status, next action, due date, and change history. Actor identity comes from server authorization, not a free-form request field.
- [x] Use the existing reviewer directory and claim-type authority; document the read/write matrix. Reject expired/revoked tokens and access outside the granted authority.
- [x] Add conflict tests before implementation: two writers on the same version produce only one change; the second writer gets a conflict and can reload without losing the draft.
- [x] Serialize mutations through one writer and document/prevent a second process from using the same state. Do not confuse a single-process queue with cross-process locking.
- [x] Provide explicit migration/import with preview from old browser casework; do not overwrite server state or automatically delete user drafts.
- [x] Prove two authorized sessions read the same changes, continue the next action, and retain state after an API restart. State whether the test surface is local or the actual target origin.
- [x] Test corrupt files, failed writes/full disk, file permissions, backup, and restore on a disposable copy. Return success only after state is stored; preserve old history/bundles.

**P1 evidence:** [results, acceptance matrix, screenshots, and manifest](../evidence/shared-casework-2026-10-17/README.md); [access/backup/restore runbook](../development/shared-casework.md). All checks were run locally; no hosted target was used.

**Limit:** small team, single instance; not multi-tenant/multi-region and not a production availability guarantee. An ephemeral filesystem does not meet the target's persistence requirement.

<a id="5-p3--koreksi-dan-penarikan-publikasi"></a>

## 5. P3 — Publication correction and withdrawal

**Execution on 18 October: locally verified.** [Acceptance and final-check evidence](../evidence/publication-lifecycle-2026-10-18/README.md). Scope: schema 4 public-summary lifecycle; full bundles remain private and legacy/v3 reports retain their access rules. Append-only publication events in the same audit envelope make consented revision creation and replacement of the older public version atomic. Revisions without consent do not change or expose public state. Withdrawal requires an authorized review token, the expected publication version, and a standard reason without free text. The default list shows the latest public revision per scope/claim, with history available; direct URLs and live verification continue to show the old version's status. Offline checksums verify historical summaries only. The primary agent wrote all implementation files; an independent reviewer performed a read-only review. Verification covered lifecycle/store/auth tests, web/verifier units, typecheck/build, and local Chromium; no external deployment or publication occurred.

**Owners:** API implementer for publication log/status; web implementer for display after the contract is agreed. Depends on P1 atomic version mutation.

**Implementation files:** `apps/api/src/publication.ts`, `app.ts`, `store.ts`; `packages/shared/src/trust.ts`; `apps/web/src/TransparencyPanel.tsx`, `transparency.ts`, `HumanAssessmentPanel.tsx`, `human-history.ts`, verifier CLI, and related tests.

- [x] Add tests for publish → correction → withdrawal, stale requests, repeated withdrawal, unauthorized access, and inconsistent list/detail/verify results.
- [x] Store publication-status changes as additional records with actor, time, safe public reason, and replacement version when applicable. Assessment correction creates a new revision; do not edit old bundles/hashes.
- [x] Default views point to the current version; withdrawn versions show a withdrawal marker and history relationship. Do not leak private summaries, citations, or internal reasons through API, cache, or export.
- [x] Retain consent and allowlists for each revision; do not automatically copy publication consent to new content.
- [x] Separate historical digest verification from current publication status. An offline export checksum does not prove a publication is still active.
- [x] Test reload, pagination, and direct requests to old-version URLs; each must report status correctly without changing historical evidence.

**Limit:** withdrawal does not delete downloaded copies or data/hash already on the blockchain. Full schema 4 remains private.

<a id="6-p2--blockchain-aktif-pemulihan-dan-verifikasi"></a>

## 6. P2 — Active blockchain, recovery, and verification

**Owners:** API/chain implementer and an independent reviewer for intent, authorization, and receipts. Depends on P1 storage guarantees; does not depend on P6 AI success.

**Target files:** `apps/api/src/store.ts`, `chain.ts`, `app.ts`, `anchor-intent.test.ts`, `anchor-idempotency.test.ts`; `apps/web/src/anchor-result.ts` and receipt UI; `scripts/verify-audit.ts`; verifier tests and contracts in `contracts/` if a contract change is actually needed.

- [x] Define durable intent state before enabling `reserveAnchor`/`completeAnchor`: audit/case/claim identity, bundle hash, and operation identity. Reservation and audit completion must remain consistent after a crash, not be split across unrelated unrecoverable files.
- [x] Add tests for crash before broadcast, timeout after broadcast, restart before receipt persistence, two concurrent requests, different revisions on the same case, reverted transaction, wrong chain, and forged receipt.
- [x] Complete write durability guarantees, including required flushes; atomic rename alone does not prove intent survives a crash. Save transaction metadata as soon as it is available, before waiting for a receipt.
- [x] Keep uncertain status pending. Do not automatically resend after a timeout; first reconcile matching transactions/events. Document how to find a transaction if a crash occurs before its hash is saved; if it cannot be established, keep the operation blocked.
- [x] Verify chain ID, registry, issuer, case ID, hash, version, transaction status, and block. Serialize operations sharing an issuer/case; constrain the operational issuer so another writer cannot change ordering outside the prototype's control.
- [x] Retain the prohibition on anchoring private schema 4 and unreviewed AI. Use a baseline audit that is already public and contains no sensitive data for the first chain proof; do not fabricate mitigation results.
- [ ] After local checks pass and the target/operation is authorized, make a real Sepolia anchor. Record the transaction hash, registry address, chain ID, public issuer, bundle hash, version, block, and confirmation policy.
- [x] Run the verifier from a separate process/client against the network, then alter a report copy to demonstrate rejection. Distinguish local-network results, public testnet, receipt metadata, and on-chain verification.

**Local result, 17 October:** [P2 evidence](../evidence/blockchain-recovery-2026-10-17/README.md), [ADR](../architecture/decisions/2026-10-17-durable-anchor-intents.md), and [runbook](../development/blockchain-recovery.md). Real FileAuditStore, Anvil chain 31337, SIGKILL before/after broadcast, revert, pending/target UI, and a separate-process verifier were checked. A public `source_detected` baseline candidate was prepared; it was not anchored. The verifier checklist above passed against the local network; public Sepolia network evidence remains part of the unchecked transaction item. Default confirmations: 2; local fixture: 1. The receipt is checked again for canonicality/reorg. Independent implementation review closed findings on reviewer permission, receipt immutability, and target authorization.

**Further public preparation, 17 October:** [target, operational audit, and cost limits](../evidence/sepolia-preparation-2026-10-17/README.md) were frozen. A real public RPC was checked; the new issuer was stored privately, balance remained 0, and the registry was still a predicted address. The user approved all three operations; the initial faucet flow stopped at CAPTCHA and then, according to the user, required 0.001 ETH on Mainnet. QuickNode was later reported to reject an empty Mainnet balance, contrary to its FAQ. At the user's request, an agent then attempted PoW directly twice; both attempts were rejected with invalid CAPTCHA. RPC confirmed a 0 SepETH balance and nonce 0; funding did not succeed. No public deployment/anchor occurred.

**Functionally complete:** reservation/recovery and verifier passed regressions. **Integration complete:** a real testnet receipt is verified from the recorded target. RPC/key configuration or mock tests alone do not complete integration.

**No-faucet testing path, 17 October:** following the user's question, [local integration was rerun](../evidence/p2-local-testing-2026-10-17/README.md): 31 focused tests and one Anvil scenario using a real contract, crash/recovery, and a separate verifier passed. The local testing profile is verified and can support further development without funding. The public-integration definition in the original plan and the Sepolia checkbox above remain unmet; a local receipt does not replace them.

<a id="7-p4--review-pakar-domain-dan-penutupan-temuan"></a>

## 7. P4 — Domain expert review and finding closure

**Owners:** independent human experts for the assessment; the team prepares materials and fixes findings. Start on 17 October so this does not wait for code.

**Execution on 18 October: engineering locally verified; domain P4 remains in progress.** The user confirmed that no expert is available. The [fixed-version review package](../evidence/domain-review-remediation-2026-10-18/README.md) contains 12 cases, initial assessment materials, a separate comparison baseline, protocol, forms, and ledger. An invitation draft was prepared; no external party was contacted. Human review and finding closure remain P4 completion requirements. The five checkboxes below remain unchecked because there are no human results.

**Artifacts:** version-specific review package, expert review protocol, findings/response ledger, and a review summary authorized for publication. Keep identities/contact/consent and restricted documents outside the public repository.

- [ ] Confirm at least one expert in methane/MRV, remote sensing, or evidence auditing; state their expertise, relationship to the team, and conflicts of interest. An implementation reviewer is not automatically a domain expert.
- [ ] Request review of detection/notification/response/mitigation distinctions, time/source/claim scope, uncertainty, basis for supported/contradicted/insufficient statuses, and the next evidence request.
- [ ] Include an insufficient-evidence case and a comparison with publisher interpretation. Review must cover the method, not merely say the UI looks good.
- [ ] Record findings and impact, accept/reject decisions and reasons; fix material issues and ask the expert to recheck changed areas.
- [ ] Freeze a results summary with version, date, review limits, and finding status. Do not close issues that change conclusions or could expose data with a disclaimer alone.

**Complete:** the review has actually occurred and material findings have been closed/reviewed again; invitations, templates, or agent opinions are not expert review results. Document review also does not prove physical repair.

## 8. P5 — User benefit, manual workflow, and differentiation

**Agent execution complete, 18 October:** [48 manual/app tasks](../evidence/p5-p6-agent-completion-2026-10-18/README.md) by two agents across six repeated sessions; 40 correct/8 partly correct, with timing/assistance/deviations recorded. Median across 15 eligible pairs: manual-minus-app −33.914 seconds, showing no time savings for people. CLI export was fixed after all sessions and replayed on the same files. The [agent plan](2026-10-18-p5-p6-agent-execution.md) is complete; the following human-research checklist remains unmet.

**Owners:** study facilitator and 5–8 independent participants under the [pilot protocol](../evidence/target-user-pilot-protocol.md). The team follows up on issues found.

**Files/artifacts:** existing protocol, dated aggregate summary, newly checked public comparator if re-reviewed, and remediation ledger. Do not present the 16 October comparator note as if it were a new review.

- [ ] Recruit 5–8 independent researchers/auditors/analysts or people with relevant experience; exclude project authors. Prepare two comparable cases, answer keys, a publisher manual/source packet, and counterbalanced order.
- [ ] Freeze the build/source archive hash, snapshot, tasks, allowed assistance, and metrics before sessions. Use a safe file list for the source archive and exclude `.env`, secrets, and private state/corpus. Allow 30–40 minutes per participant; five sessions require at least 2.5–3.3 hours of facilitation, excluding preparation/analysis.
- [ ] Measure completion, time, accuracy, assistance, and misunderstandings for tasks T1–T4. Include incomplete tasks and each denominator; do not select only the best results.
- [ ] Apply the protocol gate: at least 80% of participants, rounded up, complete each of T1/T3/T4 without substantive help; no participant leaves believing that feedback/missing observations/scores/hashes prove physical mitigation.
- [ ] Compare the manual and app workflows in pairs, recording cases/order/assistance. Report weaknesses and cases where the app did not help, not only time savings.
- [ ] Check differentiation from the manual/MARS workflow and the closest public comparator from existing research. Separate features claimed by creators, code inspected, and functionality actually executed. Do not rank all submissions from a sample of public pages.
- [ ] Fix material misunderstandings/barriers; changes affecting a task require a recorded recheck. Do not combine results from different builds into one denominator without explanation.
- [ ] Finish primary sessions by **20 October at 12:00**; use 12:00–16:00 for analysis, fixes, and rechecks. If time is insufficient, record findings as unresolved. Material findings after the freeze still need handling and a freeze/recheck; do not silently use old results for a new build.

**Complete:** real sessions, aggregate analysis, and finding closure are available. A small sample supports conclusions about limited usability, not causal/population effects or emissions reduction.

## 9. P6 — Real AI evaluation against the rules baseline

**Agent execution complete, 18 October:** [72 test claims/12 sources](../evidence/p5-p6-agent-completion-2026-10-18/README.md), three classes, two agent contexts, references authored from record contents, and a rules comparator on identical inputs. Each agent scored 71/72 correct (macro-F1 0.9861); rules scored 72/72. Shared errors were retained; 216 input/raw/grounding bindings were replayed. Decision: no additional benefit was demonstrated and the result does not confer activation eligibility. This is a DEMO metadata diagnostic, not human gold or a provider benchmark. The following research checklist remains unmet.

**Owners:** two independent human annotators, a third adjudicator for disputes, document-rights owner, and benchmark operator. Begin collection/annotation on 17 October; inference waits until authorization and data are ready.

**Files used:** `scripts/freeze-ai-assessment-inputs.ts`, `scripts/run-ai-benchmark.ts`, `services/data-pipeline/annotator_agreement.py`, `evaluate_evidence_ai.py`, and the [annotation protocol](../testing/ai-benchmark-annotation.md). Change tooling only when a concrete gap is found, and include a regression for it.

- [ ] Check rights for every document and all scopes required by the runner. Store excerpts, annotations, gold, predictions, and rights notes privately; the public repository contains only authorized summaries.
- [ ] Define train/dev/test partitions separated by source and document; freeze claim wording and document inputs before annotation/inference using the existing freeze tool.
- [ ] Two people label without seeing model outputs; calculate agreement and have humans adjudicate disputes. Do not derive gold from model predictions or project-author labels.
- [ ] Prepare at least **40 held-out claims from 10 sources**, covering all three labels, as required by the protocol. Run the rules baseline and AI on the **same claims/inputs**. Freeze model, prompt, cost limit, timeout, and abstention rules.
- [ ] Run the provider only after document rights, target, and paid calls are authorized. Preparing the corpus/tooling does not authorize sending excerpts.
- [ ] Report per-label precision/recall/F1, macro-F1, citation precision, false-supported/false mitigation confirmations, abstention, provider failures, recorded latency/cost, and source-cluster interval; include paired differences against rules.
- [ ] Apply the existing internal gate: macro-F1 ≥0.80; citation precision ≥0.90; at least one correct, grounded supported result; **zero false-supported** on that set; and all corpus requirements met.
- [ ] Separate passing the absolute threshold from AI's added benefit over baseline. If results do not support an AI benefit, keep rules as the primary path and report that result.
- [ ] If it fails, fix using the dev set. Do not tune the prompt on the test set and present it as new held-out data; repeat evaluation only with a still-independent set.

**Evaluation complete:** real data/labels/results and a model decision are available, including negative results. **Model activation passed:** safety and benefit gates are satisfied. If they fail, keep the model inactive; completing the evaluation does not mean the model is suitable for use. If the corpus/provider/people are unavailable, the evaluation is still incomplete.

## 10. Cross-package closure

**20 October, 16:00:** stop adding features. After this, fix only blockers, regressions, and evidence inconsistencies; material changes require rechecking the affected parts.

- [ ] Run small checks for each change. Before closure, run `bun run check:all`, `bun run test:e2e`, `bun test scripts/evidence-transport.test.ts`, and `bun run test:case-work-operations`; the last three commands are not covered by `check:all`. See the [test matrix](../testing/README.md). Record actual results, skips, environment, and source hash; do not reuse old suite counts as new results.
- [ ] Check the two-session browser workflow, desktop/mobile, keyboard, conflict messages, pending chain, network failure, and recovery. Test from the target origin for each remote claim; localhost success does not prove deployment.
- [ ] Check that historical/DEMO data, private access, consent, reviewers, public withdrawal, export, and receipts state consistent limits. A UI change must not make private schema 4 audits public or anchorable.
- [ ] Create a new evidence folder, for example `docs/evidence/six-package-completion-2026-10-20/`, with results summary, version manifest, and finding/status list. Do not overwrite historical evidence/checksums; do not include secrets, participant identities, or private corpus.
- [ ] Align implementation status, API, architecture, configuration, product limits, and docs index. Distinguish planned status, local implementation, real integration, and human results.
- [ ] Recheck the local Notion package, script/Q&A, and screenshots against the final version. Keep one story: problem → case → evidence decision → next action → version/verification → evaluation results and limits. A 3–5 minute video is an official requirement; a local package is not the same as a published Notion page/video.
- [ ] Reserve **20:00–23:59** for artifact checks, authorized access, rehearsal, and repair contingency. Record the public revision if any; a local working tree is not automatically code judges can see.
- [ ] Freeze the list of claims that may be presented and the status of each package. Make any remaining external actions concrete; publication, deployment, and submission remain subject to authorization and clarified event rules.

<a id="11-status-dan-keputusan-selesai"></a>

## 11. Status and completion decision

| Package | Current execution status | Closure evidence / remaining work |
|---|---|---|
| P1 | **Verified — local implementation and integration, 17 October** | [P1 evidence](../evidence/shared-casework-2026-10-17/README.md): two-session access, CAS/history, import, crash/restart, backup/restore, and fail-closed recovery; remote not tested |
| P2 | **Local test profile verified, 17 October; original Sepolia target unmet** | [No-faucet rerun](../evidence/p2-local-testing-2026-10-17/README.md): 31 focused tests and one real contract integration passed; [earlier full-gate evidence](../evidence/blockchain-recovery-2026-10-17/README.md). [Public preparation](../evidence/sepolia-preparation-2026-10-17/README.md) retained; no Sepolia deployment/receipt |
| P3 | **Verified — local implementation and integration, 18 October** | [P3 evidence](../evidence/publication-lifecycle-2026-10-18/README.md): atomic correction/withdrawal, renewed consent, status/history/direct URL, pagination, private parent recovery, and SIGKILL/restart; server chronology is unsigned |
| P4 | **Awaiting human review; deferred at user's direction, 18 October** | The [P4 review package](../evidence/domain-review-remediation-2026-10-18/README.md) remains; 0 experts/0 sessions/0 human results. Resume when the owner is ready |
| P5 | **Verified — agent scope complete; human pilot pending** | [48 tasks, two agents/six repeated sessions](../evidence/p5-p6-agent-completion-2026-10-18/p5-analysis.json); 40 correct/8 partly correct, assistance/timing retained; CLI fix rechecked. No human benefit demonstrated |
| P6 | **Verified — agent scope complete; human/provider benchmark pending** | [72 authored test claims/12 sources/two agent contexts](../evidence/p5-p6-agent-completion-2026-10-18/diagnostic-analysis.json); each agent 71/72 versus rules 72/72; does not confer AI activation eligibility |

Use **pending**, **in progress**, **verified**, or **blocked** in the execution ledger, with cause, owner, and dated evidence. Do not mark something verified merely because code, templates, or a schedule exist. At the deadline, report actual results for each package; a “maximum points” target does not make unproven results complete.

This plan retains the six packages. Additions become scope changes only when there is a material need outside those six, with rationale and schedule impact; bugs and acceptance completeness remain within the relevant package.
