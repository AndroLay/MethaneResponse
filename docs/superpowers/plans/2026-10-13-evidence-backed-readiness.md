# Evidence-Backed ClimateChain Readiness Plan

> **Execution:** Inline implementation requested by the user; no external deployment or submission is authorized by this plan.

**Goal:** Close reproducible local product and verification gaps for MethaneResponse, then report criterion evidence and blockers without claiming an official score.

**Architecture:** Preserve the current React/Vite/MapLibre, Bun/Hono, PostgreSQL/PostGIS, Python/uv, Solidity/Foundry, and viem stack. Prefer existing data, deterministic baselines, and disposable local services; keep provider keys, remote accounts, and chain signing outside the repository.

**Tech Stack:** Existing repository stack; no new production dependency unless a verified gap requires it.

**Spec:** Current repository instructions, `docs/history/next-steps.md`, and the organizer's official [Devpost event page](https://ieee-climatechain-hack.devpost.com/) checked 2026-10-13.

## Global Constraints

- The organizer publishes five qualitative judging criteria, not numeric weights; 18/20 remains an internal target only.
- MARS data is historical and must retain source identifiers, timestamps, uncertainty, archive hash, attribution, and license.
- Notifications, feedback, missing observations, and blockchain receipts cannot be presented as proof of physical mitigation.
- Synthetic examples must remain visibly marked and must not enter real-data or impact metrics.
- Do not expose credentials in frontend files, reports, ZIPs, or logs.
- Do not deploy, change repository visibility, make billable provider calls, or submit funded chain transactions without explicit authorization.
- Every new user-facing behavior requires a regression test and documented limitations.

---

### Task 1: Refresh the event/evidence contract

**Files:**
- Modify: `docs/release/event-requirements.md`
- Create: `docs/release/judge-evidence-matrix.md`
- Test: official Devpost page inspection and repository evidence links

- [x] Record current official criteria, deliverables, deadline/timezone, and qualitative-only scoring.
- [x] Map each of the four requested criteria to an observable product behavior, local artifact, external proof requirement, and current pass/block status.
- [x] Do not assign a numeric score unless an explicit scoring rubric is later published.

### Task 2: Close the PostgreSQL persistence verification gap

**Files:**
- Existing test: `apps/api/src/postgres-store.test.ts`
- Existing migration: `platform/database/migrations/0004_anchor_intents.sql`
- Documentation: `docs/history/next-steps.md`

- [x] Check whether an isolated, disposable local PostGIS service can run without mounting or modifying user data.
- [x] If available, run the full PostgreSQL integration suite against a uniquely named test database and remove only the disposable service after verifying cleanup.
- [x] If unavailable, keep the skipped status and document the exact blocker; never substitute mocks for migration evidence.

### Task 3: Reproduce the score-relevant evidence

**Files:**
- Existing checks: `package.json`, `services/data-pipeline/`, `contracts/`
- Browser flow: current dashboard, Evidence Auditor, report, and verifier routes

- [x] Run typecheck, API, web, verifier, Python, Foundry, and production build checks.
- [x] Verify the live local dashboard and API use the same pinned MARS snapshot; inspect a real source history and its abstaining evidence state.
- [x] Keep provider-backed AI, cloud PostGIS, Sepolia, user-study, and event submission evidence explicitly separate from local checks.

### Task 4: Publish an evidence-based readiness report

**Files:**
- Create/update: `docs/release/judge-evidence-matrix.md`
- Update: `docs/history/next-steps.md`

- [x] Record commands, counts, skipped checks, browser/runtime evidence, data coverage, and each criterion's remaining external proof.
- [x] Define gates that can raise confidence; do not convert test pass counts directly into judge points or promise 18/20.
