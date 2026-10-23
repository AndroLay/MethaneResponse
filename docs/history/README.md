# Engineering History

[Documentation home](../README.md) · [Current status](../release/current-implementation-status.md)

> Translation note: The original prose is available at Git revision `9d38ad2`; frozen manifests and run-bound artifacts are unchanged.

The documents below preserve the state of work when it was performed. Snapshots, test counts, paths, PRs/commits, estimates, and service assumptions may differ from the active implementation. Cite results with their original date/revision.

| Record | Date/scope |
|---|---|
| [15 October checkpoint](execution-checkpoint-2026-10-15.md) | CI, browser, data, performance, and service status at that checkpoint |
| [14 October checkpoint](execution-checkpoint-2026-10-14.md) | Full local gates, experimental database, browser, and UI |
| [Master execution plan](master-execution-plan-2026-10-14.md) | Historical tasks, dependencies, acceptance criteria, and estimates |
| [Next steps](next-steps.md) | Earlier MVP follow-up; not the active backlog |
| [Delivery notes](delivery-notes.md) | Earlier handoff and source-package checks |
| [Workflow verification, 13 October](workflow-verification-2026-10-13.md) | Browser and integration checks on the checkout at that time |
| [Premium UI redesign](premium-ui-redesign-2026-10-13.md) | Earlier visual/interaction decisions |
| [Implementation plan index](../plans/README.md) | 17 October increment and archived plans from 12–15 October |
| [Judge evidence matrix](../release/judge-evidence-matrix.md) · [score roadmap](../release/score-readiness-roadmap.md) | Internal targets and judging evidence at the source revision, not judge scores |

Other design archives: [early AI/blockchain](../architecture/ai-blockchain-implementation.md), [Postgres anchor recovery](../architecture/grounded-evidence-and-anchor-recovery.md), and [performance optimization](../development/performance-optimization.md). Candidate selection research is in the [research index](../research/README.md). Evidence from newer and older runs is in the [evidence index](../evidence/README.md).

The [local-file ADR](../architecture/decisions/2026-10-15-local-prototype-no-database.md) superseded the database requirement in the initial plan. Archive contents are not rewritten to resemble newer results; navigation cleanup does not update original checksums/test revisions.

## Temporary artifacts in the archive

Some checkpoints link session results in `/tmp`, which is outside the repository and may no longer exist. In the 14 October checkpoint, three image links point to `methane-final-ui-smoke-20261014.png` and `landing-desktop-1280x800.png` / `landing-mobile-390x844.png` in a temporary visual-review directory. Those links are retained as source notes, not included files. Tracked screenshots are available through the [evidence index](../evidence/README.md); images from other versions do not replace missing evidence.
