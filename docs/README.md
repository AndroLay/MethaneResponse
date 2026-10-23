# MethaneResponse repository guide

This documentation describes the product, code layout, architecture, and development workflow. **Architecture documents retain their original revisions; the delivery index was aligned on 23 October 2026.** Test evidence, research, and demo materials retain their original dates and revisions.

## Active submission — v18

[Current Devpost materials](release/devpost-submission/README.md) align the story,
fields, judges' guide, and ZIP with the 4:57 [v18 video](demo/delivery-2026-10-22-final-v18/README.md)
and [take8 TKM proof](evidence/video-v17-2026-10-22/README.md).
The DeepSeek KAZ example remains separate. [Access status](release/devpost-submission/access-status.json)
distinguishes public GitHub main, the limited preview, and unpublished local artifacts.
The latest agent evaluation is [r12](evidence/agent-practical-usefulness-2026-10-21-r12/findings.md):
0/48 according to the frozen scorer; passing 12 gates does not mean 48 tasks succeeded.

[The 23 October release sync](evidence/release-sync-2026-10-23/README.md)
is the entry point for the latest local checks, publication status, preview limits, and rollback.
Earlier dated results remain tied to their own revisions.

## Reading order

### New to the project

Start with the [organization walkthrough](product/organization-walkthrough.md) for a task, expected handoff artifacts, a credential-free isolated software demonstration and acceptance criteria. The root [README](../README.md) includes actual screenshots with capture provenance. These are onboarding and software checks, not a human effectiveness study.

1. [Product README](../README.md): the problem, capabilities, quick start, and limitations.
2. [User workflow](product/user-workflow.md): the path from source selection through reporting and follow-up.
3. [Repository map](repository-map.md): where to find code, data, configuration, and tools.
4. [System architecture](architecture/overview.md): how the web app, API, pipeline, storage, and optional services fit together.
5. [Data flow and audit](architecture/data-flow.md): how data becomes a traceable assessment.
6. [Implementation status](release/current-implementation-status.md): current capabilities and available evidence.

### Running or developing the code

Follow [local setup](development/local-setup.md) → [configuration](development/configuration.md) → [contribution guide](development/contributing.md) → [API reference](architecture/api-reference.md) → [testing](testing/README.md). Use the [glossary](glossary.md) for domain and technical terms.

### Reviewing project claims or decisions

Start with [data and claims](product/data-and-claims.md), [trust and transparency](product/trust-and-transparency.md), and the [no-database decision](architecture/decisions/2026-10-15-local-prototype-no-database.md). Continue to [research](research/README.md) and [dated evidence](evidence/README.md).

For the P4 expert review, use the [review checklist](testing/p4-review-checklist.md): 12 areas, case-specific focus, finding format, and recheck requirements.

P5/P6 is [complete within the agent scope](evidence/p5-p6-agent-completion-2026-10-18/README.md): 48 manual/app tasks, 72 test claims in each agent context, results analysis, verifier fixes, and 708 passing local tests. A human user study, independent gold set, and provider benchmark remain outstanding. The [initial package and runbook](evidence/p5-p6-agent-evaluation-2026-10-18/README.md) are retained as historical evidence.

[The P4 research-bundle assessment](research/p4-research-bundle-assessment-2026-10-18.md) records 30 replays matched against the code, finding triage, and an additional input bug; human results are still pending.

## Documentation contents

| Section | Contents | Entry point |
|---|---|---|
| Product | User workflow, data meaning, MARS, recurrence, and trust limits | [product](product/README.md) |
| Architecture | Components, data lifecycle, API contracts, maps, and decisions | [architecture](architecture/README.md) |
| Development | Setup, configuration, code changes, UI, and performance | [development](development/README.md) |
| Testing | Check commands, isolated browser runs, and benchmark protocols | [testing](testing/README.md) |
| Release | Local status, hosting options, and competition requirements | [release](release/README.md) |
| Research | Scientific sources, rights inventory, candidate research, and dated landscape reviews | [research](research/README.md) |
| Demo | Scripts, captions, presentations, and local app recordings | [demo](demo/README.md) |
| Evidence | Test records, screenshots, manifests, and checksums from specific runs | [evidence](evidence/README.md) |
| Plans | Implementation plans with status and result references | [plans](plans/README.md) |
| History | Earlier decisions/work, checkpoints, and superseded assumptions | [history](history/README.md) |

## Sources of truth and how to read archives

| Question | Source |
|---|---|
| What runs today? | Source code and manifests, with the [active status](release/current-implementation-status.md) as a guide |
| Why was this design chosen? | [Architecture decisions](architecture/decisions/2026-10-15-local-prototype-no-database.md) and dated plans |
| Which dataset is in use? | [Current provenance](../data/real/README.md) and the referenced manifests/hashes |
| What was actually checked? | Run records in [evidence](evidence/README.md), including their revision, date, conditions, and limitations |
| What are the current event requirements? | Official sources linked in the [event notes](release/event-requirements.md); that page records earlier checks |

**Current guides** describe the working tree; local changes may not be in a public commit. **Archives** describe conditions on their stated dates. Older architecture proposals that mention PostgreSQL/PostGIS are not current setup instructions. **Protocol/plan** notes describe planned work; results exist only when linked to execution evidence.

Evidence manifests store checksums for files checked in the original run. Documentation changes may make a current document's checksum differ from that snapshot. To validate a historical checksum, use the original source revision `9d38ad2`; never rehash an old manifest to match the translated working tree.

## Conventions

- Maintained documentation guidance and user-facing prose must be written in English. Preserve original frozen research inputs and source quotations verbatim, and provide English reading editions alongside them; see the [English reading guide](evidence/english-reading-guide.md). Preserve UI labels, identifiers, service names, and citation titles as recorded.
- Run commands from the repository root unless stated otherwise. Relative paths in guides are rooted there when they refer to code paths.
- Source data, derived data, and **DEMO** fixtures have different roles; see the [repository map](repository-map.md).
- For documentation updates, follow [documentation maintenance](development/contributing.md#documentation-maintenance).


**Latest P4:** [F01–F13 research remediation](research/p4-research-remediation-2026-10-18.md) and the [v2 review package](evidence/domain-review-remediation-2026-10-18/README.md). Engineering evidence is kept separate from the human domain review that has not yet taken place.
