# Evidence, reviewer assurance and public transparency

[Documentation index](../README.md) · [User workflow](user-workflow.md) · [Server configuration](../development/configuration.md) · [API](../architecture/api-reference.md)

This active guide details three controls: the origin/bytes of checked references, reviewer authority according to the operator directory, and fields that may be made public. Full manual assessments remain private. Passing one control does not prove physical truth, document authenticity, or reviewer independence.

MethaneResponse records what was checked, who was authorized to assess it, and what can be disclosed. It does not certify physical mitigation. All three additions work without an AI provider or database. No new dependency is required.

## Shared casework: stricter access

P1 uses signed `private_read` for reads and an additional `review` scope for writes, always requiring current directory authority `operator_attested` for each claim type. Legacy shared tokens and audit compatibility flags do not grant access to the team workspace. Members with the same category can read that category's notes; assignment does not restrict access. Tokens are held only in memory, while tab drafts are not encrypted. The server rechecks access before writing and uses `no-store` responses. Revoking access cannot delete copies that were already downloaded. See the [runbook](../development/shared-casework.md) for limits and recovery details.

## 1. Check public reference provenance

In **Evidence Auditor → Human assessment**, register reference metadata and optionally an expected SHA-256 (64 lowercase hex characters, without `0x`). For mitigation references, a separate follow-up URL and expected follow-up digest can be recorded. Do not upload or paste entire reports.

Enable **Check public publisher references when saving** only for public URLs. The server:

- Uses an exact allowlist: `www.unep.org`, `methanedata.unep.org`, `www.iea.org`, `iea.org`.
- Allows HTTPS on the default port, without URL credentials or fragments. Other hosts are left `not_checked`; no fetch is attempted.
- Resolves DNS, rejects local/private/reserved/mixed addresses, and pins the chosen public address while preserving TLS hostname validation.
- Sends no user credentials or cookies, follows no redirects, accepts at most 2 MiB and bounds DNS/HTTPS time to four seconds each. At most three reference reads per assessment run concurrently.
- Streams a content hash without saving/reproducing report contents. A `.pdf` URL must return PDF content type. Main and follow-up URL checks are both retained privately.

Statuses:

| Status | Meaning |
|---|---|
| `publisher_retrieved` | Allowed publisher returned nonempty, bounded bytes; digest recorded |
| `digest_matched` | Retrieved bytes match the submitter's expected digest |
| `digest_mismatch` | Bytes differ; a supported/contradicted determination cannot be saved until resolved or changed to insufficient evidence |
| `not_checked` | Checking was not enabled or the URL is outside the permitted reference surface |
| `blocked` | DNS returned a restricted address |
| `unavailable` | Retrieval, certificate, redirect, size, type or timeout prevented a valid check |

A successful retrieval does not establish that a document is genuine, authored by the claimed issuer, relevant to the facility, or factually true. A declared expected digest is not an issuer signature. The reviewer still checks the source material and scope; the deterministic baseline checks metadata relationships. Unknown, blocked or failed retrievals never receive a successful-check label. References can still support a *human* determination based on manual inspection, with the missing machine checks visible.

Checks are opt-in per submission and are not recovered as consent from a draft. A slow set of references can delay saving; the request remains visibly pending. No real external report was fetched as acceptance evidence for this increment: controlled TLS fixtures and injected publisher responses exercise the implementation.

## 2. Bind reviewer authority to a server-owned directory

Reviewer tokens still identify the token subject and scopes. They cannot claim that a person is vetted. **Check reviewer approval** calls the private `/api/reviewers/me?claimType=...` endpoint and displays the current directory status for that token and category. The API derives and hashes the attestation again at save time; submitted reviewer IDs or assurance objects cannot override it.

The operator can configure `REVIEWER_DIRECTORY_PATH` on the API server. Keep this file outside publicly served web/data directories, restrict filesystem access and include only rights-cleared, minimal enrollment metadata. **No real reviewer directory or identity has been enrolled by this implementation.** Example structure, with fictional DEMO records:

```json
{
  "schemaVersion": 1,
  "reviewers": [{
    "reviewerId": "DEMO-analyst",
    "organization": "DEMO organization",
    "checkedBy": "DEMO-registrar",
    "checkedAt": "2026-10-17T00:00:00Z",
    "expiresAt": "2026-11-17T00:00:00Z",
    "verificationReference": "DEMO enrollment record; replace with a real rights-cleared verification record",
    "claimTypes": ["source_detected", "operator_notified"],
    "disabled": false
  }]
}
```

The operator must actually check identity, affiliation, expertise/mandate and the supporting enrollment record before attesting. `checkedBy` must be a different identifier from the subject; this syntactic rule does not prove two independently verified people. Authority is bounded by **claim category**, not a facility-specific delegation or legal credential. Dates have a finite validity window. Duplicate, malformed or self-approved entries are invalid. No client endpoint edits the directory.

- No configured directory or no matching entry: `unverified`.
- Current attestation for this claim: `operator_attested`.
- Past expiry: `expired`.
- `disabled: true`: `revoked`.
- Category not permitted: `outside_authority`.
- Configured directory cannot be read/validated: `directory_unavailable`.

The file is re-read on operations; restart is not required for revocation. Revoked/outside-authority/unavailable statuses deny manual assessment writes, private reads/history/digest checks and legacy AI-review decisions. Private history is filtered by permitted category *before* pagination. The directory is checked again after a slow reference retrieval. Previously delivered/downloaded copies cannot be recalled.

For backward compatibility, an unverified or expired reviewer may otherwise use valid scoped tokens with explicit missing-assurance labels. Set `REQUIRE_ATTESTED_HUMAN_REVIEWERS=true` to require a current attestation for protected human reads and decisions. The example environment file only documents these settings; no live credential or configuration was changed.

To revoke a still-valid token's directory approval, retain its entry with `disabled: true`. Deleting an entry or unsetting the directory produces an unverified status and does not revoke a token in compatibility mode. Expiry ends the attested status; strict mode is needed for expiry alone to cut access. The directory policy covers human assessment/read/review paths; administrator and chain credentials remain separate.

The reviewer separately declares `not_declared`, `none_declared` or `conflict_declared`. This is a self-report, bound to the saved revision. Operator attestation does not establish independently verified identity or independence. External vetting and conflict checks remain human responsibilities.

## 3. Publish a minimal redacted summary

Enable **I authorize a public redacted summary of this revision** when saving. This choice is unchecked by default, is never restored from drafts, and resets after saving. Consent is part of the immutable private audit. New revisions require new consent. A consented correction supersedes the prior active public revision of the same scoped case/claim; a private revision does not alter public status. Withdrawal marks a summary as withdrawn while preserving its historical redacted record. Downloaded copies cannot be recalled. See the [publication lifecycle guide](../development/publication-lifecycle.md).

Public disclosure contains only a fixed field allowlist:

- Audit ID/revision/time, source ID, synthetic flag, claim category and outcome.
- Period start/end, dataset snapshot/archive commitment when present.
- Number of registered/cited references and URL-check status counts.
- Historical reviewer assurance status and self-reported conflict status.
- Private bundle hash, versioned summary digest and fixed limitations.

**Never disclosed:** exact claim wording, recipient, event-specific private annotations, reviewer/registrar identity, organization, enrollment reference, reference title/URL/locator/digest, free-text rationale, follow-up request, excerpts or full report content. Public summary consent authorizes the listed source/category/outcome/period/status disclosure; it does not publish private evidence.

Public readers use **Reports → Public transparency summaries**, without a reviewer token, to inspect, download or locally verify a summary JSON. The paginated default list selects the latest public revision per scoped case/claim, including withdrawn records; **Show publication history** includes older revisions. `/api/transparency?sourceId=...&limit=...&cursor=...&view=history` and `/api/transparency/:auditId` expose only these summaries plus allowlisted publication status/history. Full `/api/audits` lists, detail and verify endpoints retain their existing privacy boundary for human assessments. Corrupt private bundles are excluded from public summaries.

**Reviewer publication controls** in Reports supports withdrawal with a current operator-attested reviewer for that claim, a predefined reason and version check. Actor identity stays private. The summary checksum covers historical summary bytes only; offline verification does not confirm that publication is still active. Use the UI current-status check or `/api/transparency/:auditId/verify` for server-reported status at the time of the check. There is no automatic refresh, signed publication log or removal of previously downloaded copies.

The summary SHA-256 covers canonical JSON of the `summary` object. It detects accidental/unsupported changes; anyone able to change content and recompute a checksum can create another internally consistent artifact. It is not an issuer signature or independent proof of publication time. The `privateBundleHash` is a comparison commitment for an authorized full-audit reader; a public reader cannot verify hidden evidence against it. Public statuses are historical, not proof of current reviewer approval or the latest private investigation result.

The Reports page labels a loaded human report **Private assessment summary / Private report preview**. Its JSON download contains confidential fields and carries a `PRIVATE-` filename marker. The separate redacted public-summary download is the intended public-sharing artifact. A Markdown brief continues to omit private assessment details. There is no automatic Notion publication, external messaging, deployment or blockchain transaction.

## Reproducible checks

See [the evidence record](../evidence/trust-transparency-2026-10-17/README.md). Synthetic enrollment/references are clearly DEMO. A passing checksum, test suite or publisher request never proves repaired equipment, zero emissions, independently verified identity or real-world climate impact.
