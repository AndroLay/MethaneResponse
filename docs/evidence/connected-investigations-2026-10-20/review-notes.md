# Implementation review and fixes

Scope: dossier, permission boundaries, frozen decisions, shared single-writer state, verifier, and investigation UI. This is a local software review, not methane-expert review, reviewer-identity verification, or a human pilot. User edits and earlier evidence were preserved.

| Finding | Fix | Regression |
|---|---|---|
| The latest revision removed a plan link that remained in exported history | Check plan authority across the complete history | `investigation-decision-api.test.ts`, historical plan authority |
| Authority changed while a snapshot comparison was loading | Recheck authority after the final await, before private responses/digest headers | Same test file, revocation during transition load |
| Parsing could normalize whitespace in a frozen payload and hide file changes | Compare canonical raw and parsed forms; verify every digest before caching state | `investigation-decision-store.test.ts`, normalization/payload/unknown-field tamper |
| Reconciliation of terminal reverted state inspected the chain again | Return the terminal outcome idempotently, without rebroadcast/inspection | `investigation-decision-api.test.ts`, terminal reverted reconciliation |
| Reviewing an existing response did not trigger revisit | Separate `response_review_changed` from `new_authorized_response` | `investigation-revisit.test.ts` |
| Frontend metadata validation imported a dependency not owned by web | Use the shared subpath owning Zod; no dependency/lockfile addition | `investigation-decision-ui.test.ts`, typecheck/build |
| “Due date” test selector also matched the new “Request due date” | Use the exact accessible work-item deadline label; preserve behavioral assertions | Full private/team browser phase |
| Team test assumed only one investigation existed after earlier workflows began retaining more | Check target-source presence and every row's status; distinguish directory filtering from assignment in the shared-work selector. Preserve conflict/history assertions | Full private/team browser phase |

## Compatibility checks

- EvidenceRegistry and historical audit `registryCaseId` remain unchanged. Decisions use a separate key through `registryInvestigationId`.
- Legacy file state, envelopes 1/2, and audit bundles 2/3/4 remain readable. Envelope 3 is required after the first decision; rolling back to an older writer requires a pre-migration backup.
- New intents and old audits share pending/issuer/nonce checks. Anvil tests cover blocking in both directions, lost acknowledgements, reopening, reconciliation, historical verification, and tampering with a recomputed checksum.
- Casework claim/scope remain immutable within a work ID. Evidence events are append-only; actor/time come from server revisions. A different scope or claim requires new work.
- New responses, response reviews, changed criteria/assessments, and relevant snapshot records produce separate reasons. Ordinary work notes do not change a determination. Reports already in the decision snapshot are labeled as previously included historical context.

## Remaining risks

Private files require one writer; this is neither multi-instance nor encrypted storage. Response-rights declarations and hashes do not authenticate files. Digest checks require a commitment obtained through a trusted channel: file holders can calculate new checksums. Blockchain adds commitment/chronology checks, not physical truth. DEMO software reviewers do not establish user benefit or expert assessment.

See `checks.json` for recorded commands and `artifact-manifest.json` for package integrity. The manifest is not an independent signature.
