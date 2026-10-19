# Judge Q&A

## How is this different from UNEP MARS?

MARS provides methane detection, notification and follow-up capabilities. MethaneResponse uses available public historical MARS metadata to demonstrate a separate review workflow: bind a claim to a source and period, show which reference metadata is available, record an analyst's next evidence request, and preserve a checkable report. It is complementary and does not reproduce MARS's operational alerting authority.

## Why does this matter if MARS already exists?

Methane is a near-term climate concern: UNEP says it has accounted for roughly 30% of global warming since pre-industrial times. The IEA reports that around 12% of MARS notifications received a response in 2025. That percentage measures responses, not repairs. MethaneResponse addresses one narrow part of the evidence trail by helping someone inspect what a specific claim is supported by and what remains to be checked. This prototype has not measured faster investigations or emissions reductions.

## Does “feedback: yes” mean the leak was fixed?

No. Feedback is administrative response metadata. It does not, by itself, identify a recipient, describe the action, or confirm a measured mitigation outcome.

## Why does the app say “insufficient evidence” when UNEP's catalogue says action was confirmed?

The app's result is limited to the specific casebook metadata and scope supplied to its rules baseline. The catalogue summary is separately attributed to UNEP and is not negated by the app. The exact timing and supporting report contents are not included as validated evidence excerpts in this preview. The assessment is not an all-source adjudication of UNEP's report.

## Why not call the 11 July 2026 observation “after repair”?

The casebook says action occurred in July 2026 but does not provide the exact date or time. The ordering cannot be inferred. The observation remains a dated satellite record, not a post-action measurement unless the action timeline is independently established.

## Is the baseline AI?

No. The preview demonstrates a deterministic rules baseline. A model-assisted path is not enabled here and should only be described with its separate benchmark and evidence controls.

## What does the verifier prove?

It checks whether the audit bundle matches the digest contained in the export and whether the attached export-context checksum matches. It does not authenticate the submitting party, establish that linked documents are genuine, or prove a physical outcome. Without a trusted external commitment, someone can replace both a file and its digest.

## Is this on blockchain?

No public-chain receipt is included in the preview. Existing contract and local integration work are separate from this demo. The video must show “No blockchain receipt” and must not suggest that a digest alone is a blockchain anchor.

## Is the Render app live or durable?

Not yet. `render.yaml` describes one Singapore-region free web service with the built UI and API on one origin, automatic deploy disabled, no database, no AI key and no signer. The selected audit store is under `/tmp`. Render free services can sleep; this state can be removed on sleep, restart or redeploy. A public service still requires approval to publish the exact source and create the new service.

## What impact has been measured?

This delivery demonstrates inspectable historical data, claim scoping, a deterministic evidence-coverage result and report-integrity checks. It does not establish reduced methane emissions, time savings, adoption or operator action. No human pilot has been conducted.

## What happens when a claim is unsupported?

The system abstains with an insufficient-evidence result and supports a separate follow-up note that can request an action timestamp, attributable notice evidence, or a method-appropriate follow-up observation. That note is a work item, not an external assignment or proof that evidence was later supplied.
