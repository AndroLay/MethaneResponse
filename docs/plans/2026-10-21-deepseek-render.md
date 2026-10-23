# DeepSeek and Render Preview — 21 October 2026

## User decisions

- Replace the Luna model with `deepseek-v4.1-flash-1017` through ExperientialLabs.
- Read the API key from the private file provided by the user; its value was not
  published, printed, or included in the frontend.
- A Render deployment was requested again, in Andro's workspace, Singapore, Free.
  Prior approval required a verified Rp0 spending limit; it was not spending authorization.
- No database change, Sepolia transaction, or Evidrilo service change.

## Sequence and acceptance

1. Match the slug to the API catalog and provider documentation. Store the private
   configuration with mode 0600 in `data/state/experiential.env`, outside Git and ZIP files.
2. Limit output per call (default 2048, maximum 4096 tokens), select reasoning
   explicitly, and retain timeouts, exact citations, and the second-pass check.
3. Run regressions and a real API smoke test against three project-owned DEMO documents,
   with at most six calls. Record version, usage, verdict, and bundle integrity.
   Do not describe a smoke test as an independent benchmark or field result.
4. Verify workspace costs before creating `methaneresponse-preview`.
   The Render connector does not expose billing/spend limits; the dashboard
   did not render content during the inspection session. A request for user
   verification was sent before service creation.
   The user then replied, "Yes, please create that service."
   The Free service was created with this explicit approval; billing controls
   were not claimed to have been inspected, and no guarantee of a total Rp0 cost was made.
5. After approval to create the Free service: publish the tested revision to main, create one
   Free web/API service, disable auto-deploy, and use no disk/database/signer. Check the commit,
   health, snapshot, application route, and authenticated AI access at the public URL.
6. Record the deployment ID/status and preview limitations. Roll back by suspending
   the MethaneResponse-only service or redeploying the previous revision; do not
   change billing/workspace settings or other project services.

## Integration and test results

The catalog was accessed using the user's credential. The real-provider smoke test passed 3/3,
using five calls and returning exactly model `deepseek-v4.1-flash-1017`;
[summary and evidence limits](../evidence/deepseek-live-2026-10-21/README.md).
Typecheck, 301 API tests, 66 tooling tests, and 12 browser/schema checks passed.
This replaces Luna's
pending transport status; an independent benchmark remains unavailable.

## Actual deployment result

The user approved creating the Free service after the cost-control explanation. Service
`srv-dbbumltg1s2s73e8cct0` was created in Singapore; the latest deployment
`dep-dbbunbv4695c73eb958g` is live on source `98b25ca`.
The DeepSeek backend is active. One public browser journey produced a DEMO assessment
The DEMO request returned HTTP 201 with exact citations and a valid hash in about 3.2 seconds. Token/privacy behavior and the final rollout configuration were also checked.
[Full evidence and cost/state limits](../evidence/render-preview-2026-10-21/README.md).

## Interpretation limits

Local backend configuration, real provider transport, quality benchmark, public
runtime, and submission are distinct statuses. Render `/tmp` state is temporary;
the model cannot certify a repair or authorize anchoring.
