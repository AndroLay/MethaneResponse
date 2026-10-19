# Sources, attribution and approved claims

This ledger is the source of truth for the presentation, video text, captions and operator script. Use the approved wording below; do not strengthen it in editing.

| ID | Approved statement | Evidence | Boundary |
|---|---|---|---|
| C1 | MethaneResponse reviews claims against traceable historical source and reference metadata. | Current UI/API; `docs/product/user-workflow.md`; pinned MARS casebook. | Prototype capability, not an independent authority or MARS replacement. |
| C2 | The selected KAZ casebook snapshot contains three EnMAP observations: 591 ± 335, 307 ± 66 and 496 ± 226 kg/h on 2024-06-07, 2026-06-05 and 2026-07-11. | `data/real/mars_casebook_2026-10-15.json`; [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars). | Discrete estimates and recorded uncertainty; not continuous monitoring or averaged emissions. The app treats date-only bounds as UTC by convention; upstream timestamp zone is not asserted. |
| C3 | The UNEP KAZ catalogue abstract says IMEO confirmed methane mitigation action at Uzen Field in July 2026. | [UNEP report catalogue](https://wedocs.unep.org/handle/20.500.11822/49949), abstract and metadata; accessed 2026-10-19. | The casebook retains the publisher title, abstract-level metadata and link; it does not contain the report body or an exact action day. Do not infer whether the July 11 plume preceded or followed action, or present the local rules result as a contradiction. |
| C4 | Source-level notification/feedback fields do not prove delivery to a named recipient or physical repair. | MARS casebook schema and product limitations; `docs/product/data-and-claims.md`. | Do not imply the operator failed to act. |
| C5 | For the selected KAZ_S_159 event scope, the deterministic baseline returns “insufficient evidence” because the submitted audit bundle has no eligible, date-matched mitigation citation. | Reproducible local UI/API flow and exported report; claim-specific result. | The bundle has publisher-link metadata but not the report content. This is not a finding that no public evidence exists, not a contradiction of UNEP, and not evidence that mitigation failed. |
| C6 | The browser verifier detects changes to a hashed audit bundle and validates an attached export-context checksum. | Current app verifier; local browser capture and full gate. | Local integrity only. No receipt in this preview; no signature, trusted issuer, document-authenticity or physical-truth proof. |
| C7 | The preview Blueprint uses a free single web service, temporary `/tmp` state, and no AI, DB or signing secrets. | `render.yaml`; deployment config regression; local production-mode runtime verification. | Blueprint is not deployed. Temporary state is not durable. Costs depend on Render workspace quotas/usage; not a guarantee of permanent zero cost. |
| C8 | UNEP reports that methane has accounted for roughly 30% of global warming since pre-industrial times. | [UNEP methane and climate explainer](https://www.unep.org/en/news-and-stories/story/methane-emissions-are-driving-climate-change-heres-how-reduce-them). | A global warming attribution, not a share of annual emissions and not an impact measured by MethaneResponse. |
| C9 | The IEA reports that around 12% of MARS notifications received a response in 2025. | [IEA guidance on responding to MARS notifications](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), published 4 May 2026. | Response rate only; not the share of leaks repaired or emissions mitigated. |

## Primary sources and attribution

- UNEP MARS data dictionary: https://methanedata.unep.org/dict-mars
- UNEP, “Methane emissions are driving climate change”: https://www.unep.org/en/news-and-stories/story/methane-emissions-are-driving-climate-change-heres-how-reduce-them
- IEA, “Responding to Satellite Notifications from MARS”: https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system
- UNEP, “How MARS works”: https://www.unep.org/en/what-we-do/energy/methane/how-mars-works
- UNEP KAZ catalogue item: https://wedocs.unep.org/handle/20.500.11822/49949
- UNEP MARS casebook and transformations: `data/real/README.md` in the repository.
- Method and three-case review: `docs/research/three-historical-decision-cases-2026-10-18.md` in the repository.
- Application implementation: repository `README.md`.
- Render free-plan conditions: https://render.com/docs/free

## Rights notes

The casebook attributes the MARS dataset under CC BY-NC-SA 4.0; its provenance and transformations are retained in the repository. The KAZ catalogue record lists CC BY-NC-ND 3.0 IGO for the linked report. This package uses a brief attributed paraphrase of catalogue metadata and a link; it does not redistribute report text, figures or tables. Map screenshots may include external basemap tiles and their visible provider attribution. Keep attribution visible in the exported video and do not crop away map credits.
