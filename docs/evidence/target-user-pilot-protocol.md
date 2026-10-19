# MethaneResponse target-user pilot protocol

**Status:** ready-to-run protocol; no participants have been recruited and no pilot results have been collected.
**Purpose:** collect small, auditable usability evidence for the ClimateChain prototype. This formative pilot cannot establish population-wide usefulness, time savings, AI quality, or climate impact.

**18 October preparation:** a [two-case task/answer-key/manual packet](p5-p6-agent-evaluation-2026-10-18/p5-task-pack.md), private paired-task analyzer (`services/data-pipeline/pilot_study.py`), and separately labeled agent walkthrough are available. They do not count as human sessions. The packet's manual condition uses an archived publisher/source packet, not the live official portal; report that scope explicitly. Agent and human results, changed builds, and workflows with different materials stay separate. For T4, that packet compares verification time on supplied exports and records app export creation separately.

## Research question

Can a researcher, auditor, or public-interest analyst use MethaneResponse to inspect a historical MARS source, distinguish observations from response metadata, assess whether a mitigation claim has adequate documentary support, and verify the integrity of an exported report?

Compare the same tasks using (A) the official MARS publisher interface and a supplied source packet and (B) the frozen MethaneResponse build. The comparison is about task performance and comprehension, not which product is authoritative. MARS remains the publisher of its observation and response records.

## Participants and minimum sample

- Recruit **5–8** people who have used environmental data, scientific evidence, investigative reporting, audit, or climate policy in their work or study.
- Exclude project authors from the participant count. Record only an anonymous participant code (`P01`, `P02`, …) and broad relevant experience category; do not collect names, employer, contact details, or sensitive personal data in the results sheet.
- Five participants are a formative usability sample only. Report the sample size and do not present the findings as statistically representative.
- Obtain informed consent before starting. Participation is voluntary and may stop at any time. Record screen/audio only with separate consent; prefer no recording.

## Freeze and preparation checklist

Before the first session, save the following in the session folder:

- Git commit or source archive SHA-256 and build date.
- Dataset snapshot ID and source archive hash shown by the app.
- Browser, OS, display size, network state, and whether the map used imagery or degraded fallback.
- The exact case IDs, task prompts, authorized document excerpts, and answer key used in every session.
- The same publisher source packet and workflow instructions for the manual condition.

Do not send participant documents or response notes to an AI provider. Use only public historical source metadata and pre-cleared excerpts. Keep the AI provider disabled unless a separate rights-cleared, consented study protocol explicitly covers provider processing.

## Session format

Target 30–40 minutes per participant. Use a counterbalanced order to reduce learning effects: half complete the publisher workflow first and half MethaneResponse first. Use two pre-matched source cases (A and B) and swap which case is used in each workflow. Do not change prompts or help rules between participants.

1. Explain that the application is a research prototype and MARS records are historical observations, not continuous monitoring.
2. Give the participant the assigned source ID and start a timer when they begin each task.
3. Ask them to think aloud. The facilitator may repeat the prompt but must not explain product controls or supply the answer.
4. Stop the timer when the participant gives a final answer or asks to stop. Record any assistance verbatim in the assistance category, without identifying details.
5. After each workflow, ask the participant to rate confidence from 1 (not confident) to 5 (very confident) and explain one point of confusion.
6. End by asking what evidence would change their conclusion. Do not coach them toward a preferred score.

## Standard tasks

| ID | Prompt | Expected observable result | Critical misunderstanding |
|---|---|---|---|
| T1 — Find a source | “Open source `{case_id}` and tell me the dataset snapshot, observation dates, latest reported flux and its uncertainty, and whether these records are live.” | Correct source ID and snapshot; values copied with units and dates; identifies historical coverage. | Calling the feed live or treating reported flux as continuous/current. |
| T2 — Prioritize review | “Explain what in this source history would make you investigate it sooner, and what the priority indicator cannot tell you.” | Names the visible historical signals and uncertainty/data limits; distinguishes a heuristic priority from a calibrated probability. | Describing the score as a forecast or probability of a future physical leak. |
| T3 — Check a claim | “Given this exact claim and the supplied authorized evidence excerpt, decide whether the excerpt supports it, contradicts it, or is insufficient. Show the exact passage you relied on.” | Cites a verifiable passage and keeps detection, notification, feedback, documented action, and confirmed mitigation separate. Abstention is acceptable. | Treating feedback, a company statement, or missing later observations as proof of repair/reduction. |
| T4 — Verify a report | “Export the report, check its digest, then explain what a successful digest check proves and what it does not prove.” | Detects a changed export after tampering; explains that the digest supports byte integrity/version consistency, not source authenticity or physical mitigation. | Saying a hash or blockchain receipt proves a leak was repaired. |

For T3, use only documents whose exact excerpting, storage, model-processing (if any), and publication permissions have been checked. If no excerpt is cleared, run the rules-baseline/insufficient-evidence task and do not simulate a company response.

## Pre-registered measures

For every task record elapsed seconds, completed (`yes/no`), assistance (`none / repeat prompt / navigation hint / substantive hint`), answer correctness (`correct / partly correct / incorrect / abstained`), and critical misunderstanding (`yes/no`, with a short factual note). Do not count an abstention as an error when the evidence is insufficient.

Report, for each workflow and task:

- participant count and completion count;
- median completion time and range, including incomplete tasks as incomplete rather than dropping them silently;
- number of participants requiring each assistance level;
- correctness and critical-misunderstanding counts with the denominator;
- confidence median and range;
- recurring confusion points, with anonymous participant codes only.

Do not combine the two workflows into a single “accuracy” or “time saved” number unless the cases, order, incomplete tasks, and assistance are shown. Do not claim causal impact or generalize beyond this small sample.

## Formative pass criterion

The internal usability gate passes if at least **80% of the enrolled sample** (rounded up; at least 4 of 5) complete each of T1, T3, and T4 in the MethaneResponse workflow without substantive facilitator help, and no participant leaves with the belief that feedback, missing observations, a risk score, or a hash proves physical mitigation. This is a project decision threshold, not a competition score or a validated scientific standard. Any critical misunderstanding triggers a product/copy review even if the threshold is met.

## Blank anonymized session record

Copy one row per participant/task. Leave empty until a real session is consented and run.

```csv
participant_code,workflow_order,case_id,task_id,elapsed_seconds,completed,assistance,correctness,critical_misunderstanding,confidence_1_to_5,anonymous_note
```

Store consent separately from task results. Do not commit identifiable consent records, audio/video, raw personal comments, or unredacted participant materials. The repository may contain only aggregated anonymous counts and the approved research summary.

## Reporting template

```text
Build SHA / commit:
Dataset snapshot and hash:
Session dates (date range only):
Participants (n) and relevant experience categories:
Workflow order counterbalanced: yes/no
Cases and cleared evidence sources:
Device/browser/network conditions:
T1 completion/time/errors:
T2 completion/time/errors:
T3 completion/time/errors:
T4 completion/time/errors:
Substantive help count:
Critical misunderstandings:
Confidence summary:
Limitations and protocol deviations:
```

## Result boundary

Until anonymized participant data and a dated analysis are added, the pilot status remains **not run**. A completed pilot can support a narrow usability statement only; it cannot establish that MethaneResponse improved emissions, verified repairs, improved AI accuracy, or caused policy action.
