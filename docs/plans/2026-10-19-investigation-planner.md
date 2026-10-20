# Capacity-constrained investigation planner

Implement the proposed team allocation workflow in Cases. Keep the existing source ranking and frozen evidence unchanged. Local prototype; no database, contract deployment or external publication.

## Acceptance

- [x] Use all sources in the pinned, hash-validated MARS snapshot, retaining country/sector, distinct observed dates, numeric median flux and reported median uncertainty. Sources without linked observations remain explainably excluded.
- [x] Analyst sets investigation slots, maximum slots per country and country/sector scope. A slot assumes one source investigation; no cost, effort, repair potential or emissions benefit is estimated.
- [x] Compare four portfolios under identical hard constraints: weighted historical indicators, median reported flux, observed recurrence, and greedy geographic/sector breadth. Missing flux supplies no magnitude ranking points; it is never a zero measurement.
- [x] Show selected and excluded sources, quota/capacity reasons, coverage, overlap and changes when capacity/weights/quotas vary. Label sensitivity as allocation sensitivity, not scientific uncertainty.
- [x] Export the full candidate projection, parameters, policy, hashes, attribution and results. Verify digest, deterministic replay and current browser dataset bindings. An unsigned file is not a receipt or authenticated scientific evidence.
- [x] Invalidate stale requests/results, paginate large tables and load the tool lazily. Handoff to a source case, globe or Evidence Auditor without losing source identity.
- [x] Add regressions, exercise all real sources and desktop/mobile browser workflows, then publish a new local evidence record. Earlier proof directories remain immutable.

## Method and limits

Within the filtered pool with linked observations, compute tied midrank percentiles separately for numeric median flux and distinct observation dates. Blend percentiles using the analyst's recurrence weight. Null flux receives zero **ranking points**, explicitly distinct from an observed zero. Deterministic source-ID tie breaking. Simple quota-aware greedy selection; breadth is a dynamic greedy heuristic, not a global coverage optimum. All plans use the same eligible pool and per-country cap. Unknown country is one quota bucket and does not increase known-country coverage. No sum of discrete kg/h values is presented as avoidable emissions.

Sensitivity reruns the weighted strategy for one fewer/more slot, recurrence weight ±20 points and one more slot per country. Changed selections indicate dependence on analyst assumptions. The planner does not use unvalidated future leakage probabilities or claim improved real-world outcomes. Source feedback is not a benefit/repair signal. An official UNEP Top 50 comparison, temporal window selection and cross-snapshot change radar remain separate follow-up work; current baselines are explicitly application-defined.
