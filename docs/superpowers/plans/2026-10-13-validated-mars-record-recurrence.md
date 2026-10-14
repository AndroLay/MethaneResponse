# Validated MARS Record Recurrence Model Implementation Plan

**Goal:** Add a reproducible, calibrated estimate of whether a previously known source will receive another linked MARS detection record within 365 days, with an untouched temporal test and visible limits.

**Architecture:** Train a small deterministic logistic model offline from the pinned source-linked event history. Train on 2021–2023 forecast origins, calibrate only on the 2024 origin, evaluate once on the 2025 origin through 2026-09-11, and score current sources only after explicit quality gates pass. Hono serves the versioned, hash-bound model report and per-source estimates; the dashboard labels the target as future MARS-record recurrence, never as future methane emissions.

**Tech Stack:** Python standard library + uv/pytest; Bun + Hono + Zod; React + TypeScript; pinned UNEP MARS snapshot.

**Global Constraints:**

- A missing future MARS record is not evidence of zero methane or successful repair.
- Forecast target is the appearance of a linked MARS archive record for an already known source during the next 365 days.
- Source IDs, detector data, flux, uncertainty, and provenance remain unchanged; unlinked plumes are not assigned to sources.
- No prediction is served unless the frozen temporal evaluation satisfies the documented release gates.
- The probability describes archive-record recurrence only; it does not estimate physical emissions, active leakage, flux, or mitigation success.
- Historical v1/v2 intelligence snapshots remain readable by the API.
- All tests, reports, and predictions bind to the exact pinned input bytes and snapshot provenance.

---

## Files and responsibilities

- Create `services/data-pipeline/record_recurrence.py`: event-date extraction, point-in-time cohorts, logistic fit, calibration, metrics, bootstrap intervals, release gate, and current-source scoring.
- Create `services/data-pipeline/tests/test_record_recurrence.py`: point-in-time leakage, censoring/coverage, training, calibration, metric, and abstention regressions.
- Modify `services/data-pipeline/build_intelligence.py`: attach the reproducible model evaluation and scored per-source recurrence estimates to schema v3.
- Modify `services/data-pipeline/tests/test_build_intelligence.py`: assert the pinned snapshot's frozen test metrics, source counts, and score-to-snapshot binding.
- Modify `apps/api/src/intelligence-data.ts` and `apps/api/src/intelligence-data.test.ts`: validate v3 model metadata and source probabilities while retaining v1/v2 compatibility.
- Modify `apps/api/src/app.ts` and `apps/api/src/audit.test.ts`: expose model/evaluation metadata through intelligence insight and ranking responses.
- Modify `apps/web/src/IntelligencePanel.tsx`, its focused tests, and `apps/web/src/styles.css`: show the source estimate, horizon, evaluated performance, loading/unavailable states, and limitations.
- Create `data/processed/record-recurrence-evaluation.json`: machine-readable evidence containing method, frozen origins, hashes, cohort counts, calibration, final-test metrics, confidence intervals, baseline comparison, and release-gate result.
- Modify `docs/data-and-claims.md` and `docs/next-steps.md`: document the target, reproduction command, exact results, and conditions needed for a future physical-emissions forecast.

## Acceptance gates

- The 2025-09-11 to 2026-09-11 test cohort is never used to fit model weights or calibrator.
- ROC-AUC lower 95% source-bootstrap bound is at least 0.75.
- Ten-bin expected calibration error on the final test is at most 0.10.
- Final-test Brier score improves over the 2024-validation-prevalence reference.
- Precision among the highest-scored 10% has at least 1.5× the final-test prevalence.
- If an input snapshot ends before the full final horizon, the model status is unavailable and no probability is emitted.
- Every per-source estimate uses only records on or before its `asOfDate`; future records affect labels and evaluation only.

## Execution tasks

### 1. Point-in-time cohort and feature extraction

Write failing tests for UTC date deduplication, source linkage, 365-day feature windows, future-event labels, and exclusion of post-origin features. Implement event extraction and deterministic cohort creation. Run the new Python tests before continuing.

### 2. Frozen model and calibration

Write failing tests for the logistic fit, validation-only Platt calibration, bounded probabilities, insufficient cohort abstention, and deterministic coefficients. Implement the pure-Python model with explicit standardized features and fixed optimization settings. Run focused model tests.

### 3. Temporal evaluation and evidence artifact

Write failing tests for AUC ties, Brier, ECE, top-decile lift, seeded source bootstrap intervals, completeness of the test horizon, and the release gate. Implement metrics and the report artifact; evaluate against the pinned archive and compare with prevalence, recent-date-count, and existing-priority baselines. Run the full data pipeline test suite.

### 4. Snapshot/API compatibility

Write failing tests for v3 provenance, model metadata, forecast target/horizon, source-specific probability, rejection of out-of-range values, and continued v1/v2 acceptance. Add the model artifact to the intelligence snapshot and serve it through the existing Hono insights/rankings routes. Run API tests and type checks.

### 5. User-facing evidence

Write failing tests for visible estimate semantics, horizon, performance summary, and unavailable states. Add the source-selected recurrence card and clearly label it as an archive-record estimate. Inspect desktop and mobile browser views, check overflow and console output, then run web tests and build.

### 6. Reproduction and final review

Document the command that rebuilds the model and report from the pinned archive. Regenerate artifacts twice and compare hashes. Run the complete relevant checks, verify the source diff and ensure no unrelated dirty files were reverted.
