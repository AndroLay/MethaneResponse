# Architecture decision — 2026-10-11

**Selected:** TypeScript/Bun monorepo with React SPA, Hono API and an offline Python data pipeline. Separate project from Evidrilo (used only as an organizational reference).

### Primary vertical slice

1. Parse a licensed local CSV snapshot with manifest and explicit source ID column.
2. Show source cards and spatial locations; distinguish synthetic data from real.
3. Evaluate a narrow typed claim against enumerated evidence references using transparent rules.
4. Serialize a stable claim/evidence bundle and SHA-256 digest.
5. Optionally anchor its digest on Sepolia using a controlled issuer; never expose signer keys.
6. Verify the stored hash against the on-chain receipt independently.

### Boundaries

- The initial API serves fixtures from memory, **not PostgreSQL**; migrations are provided for the next implementation step.
- No actual MARS observation download, PDF document extraction, OCR, ML model, LLM, or identity-provider integration has been built.
- The `contradicted` status may be assigned only with **explicit contradictory evidence**. Missing support is `insufficient_evidence`.
- Fictitious source coordinates are for interface testing only.
- Blockchain cannot verify whether physical mitigation happened, only who wrote a receipt and whether its content changed.

### Evolution gate

Do not add a model before producing a human-labeled, source-disjoint evaluation set, baseline results and adversarial test cases. If data lacks enough labels for physical mitigation, evaluate *document claim support*, not repair prediction.

