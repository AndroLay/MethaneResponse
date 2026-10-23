# UI review before video production —21 October 2026

## Initial scope and evidence

This bounded initial review made no frontend changes. AssessmentA examined design
and source; assessmentB tried a detector and browser runtime. Neither was judging,
a human pilot or accessibility certification. Public Dashboard/DocumentAI captures
used `98b25ca`; connected desktop/mobile and plan-queue captures were from 20 October.
Source inspection found subsequent changes then were documentation-only.
Historical/non-live labels, source-linked records and mitigation limits were retained.

Impeccable's context could not load because `impeccable.style` was blocked. No active
PRODUCT.md/DESIGN.md governed the application; the discovered DESIGN.md belonged
to an archived video package. A detector exited 2 without readable findings; that
was not a zero-findings result. BrowserB tried three routes at desktop/mobile sizes,
but `net::ERR_EMPTY_RESPONSE` prevented valid screenshots, overflow or page-error
checks. Its browser was closed. This did not establish a layout defect.
A separate permitted GET returned Dashboard HTTP 200 HTML; one 20-second health
request timed out. These were network observations, not new visual verification.

## Findings from available design evidence

Retain navy/teal identity, globe, workspace navigation and historical context.
Prioritize task hierarchy and readable operations before capture.

| Priority | Finding | Recommended improvement |
|---|---|---|
|P0|Auditor navigation, historical analysis, AI form, consent, results and casework compete|Lead with claim→evidence/quote→result→next action; disclose technical context progressively|
|P0|Supporting text around 9–12 px is hard to read in reduced video|Enlarge important labels/body; test actual viewport and exported video|
|P1|Mobile search dominates header and clips placeholder|Compact expandable search, prioritize navigation/source context|
|P1|Repeated queue/history metadata lengthens mobile pages|Summarize status/date/main action; expand IDs, hashes and details on demand|

Small technical notes alone do not establish an accessibility violation. Contrast,
touch targets, keyboard, screen reader and 200% zoom need dedicated checks. Progressive
disclosure must retain provenance, uncertainty, permissions and scientific context.

## Subsequent implementation after user approval

DocumentAI now leads with claim/document, processing permission, results/quotations
and human review. Historical context, retention and metadata remain expandable.
Operational labels/body increased; mobile form fields use 16 px text. Mobile search
supports open/close, Escape, Ctrl/Cmd+K and focus management after selection. Queue
items emphasize Evidence; Map/statistics remain in source details. Evidence-request
history displays ten events per page while preserving full metadata.

Local production build, regressions and desktop/mobile screenshots are recorded in
[UI polish evidence](../evidence/ui-polish-2026-10-21/README.md), separating full gates,
last-change confirmation, mock AI and limits. This increment itself did not push or
deploy; local captures did not establish a change on Render.

## References

- [Public Dashboard](../evidence/render-preview-2026-10-21/dashboard-ready-public.png)
- [Public DocumentAI](../evidence/render-preview-2026-10-21/deepseek-public.png)
- [Connected mobile](../evidence/connected-investigations-2026-10-20/connected-investigation-mobile.png)
- [Active queue mobile](../evidence/investigation-operations-2026-10-20/active-plan-queue-mobile.png)
- Local ignored diagnostics: `delivery-output/ui-review-2026-10-21-b/`.

This was a review-only initial pass; no additional design preference was needed.
