# Presenter runbook

**Target:** 4:30 · spoken English · English operator notes

The main story uses one source, `KAZ_S_159`. The Indicators page is reserved for the appendix. The durations below are rehearsal budgets, not measured recording times. This script has not been recorded.

<a id="sebelum-mulai"></a>
## Before starting

- Use baseline checkout `a82e2eee99bb79327f859f304f2f5d5939f07041`, or repeat the checks if the code has changed.
- Start the web app and API locally as described in the repository README. Use a new `AUDIT_STORE_PATH` reserved for this demo so it does not mix with user history. Do not delete existing state files.
- Do not enable the AI provider, reviewer token, or chain writes for this flow. Do not show a terminal containing environment variables or credentials.
- Prepare the Map Explorer tab at `/dashboard/map?sourceId=KAZ_S_159`, browser font size 100%, viewport around 1600 × 1000. Confirm snapshot `unep-mars-675417694883` is visible.
- Prepare a downloads folder for a new report. Do not use a report from another case or snapshot.
- Open `01-Presentation` as the main Notion page; keep the runbook and Q&A as supporting pages. Check image rendering after import.

<a id="00000025--masalah-dan-janji"></a>
## 00:00–00:25 — The problem and the promise

**On screen:** presentation title and opening question.

**Say:**

“For this historical source, MARS records feedback as Yes. Does that confirm mitigation? A reviewer needs evidence for that stronger claim. MethaneResponse keeps the source, dated observations, claim and assessment together. We will follow one case and see where the supplied evidence stops.”

<a id="00250100--satu-kasus-nyata"></a>
## 00:25–01:00 — One real case

**Click:** Map Explorer → source `KAZ_S_159` → **Zoom to source on globe** → **View full case** → **Summary** tab. Show the snapshot, **MARS notification field: Yes**, and **MARS feedback field: Yes**. Do not spend time spinning the globe.

**Say:**

“This is KAZ_S_159, an oil and gas source in Kazakhstan, from a versioned UNEP MARS archive. The source metadata records notification and feedback. These are administrative records. We preserve their meaning instead of translating them into confirmed mitigation. This is historical source-location context, not a live satellite image.”

<a id="01000135--observasi-dan-keterbatasannya"></a>
## 01:00–01:35 — Observations and their limits

**Click:** From the same dialog, select the **Observations** tab. Highlight the three rows and the latest observation.

**Say:**

“The archive links three observations to this source. The latest is from July eleventh, twenty twenty-six: an estimated four hundred and ninety-six kilograms per hour, with a reported standard deviation of two hundred and twenty-six. These are separate historical observations, not a continuous signal. A missing later record would not establish zero emissions.”

<a id="01350235--momen-utama-bukti-yang-sama-kekuatan-klaim-berbeda"></a>
## 01:35–02:35 — The key moment: same evidence, different claim strength

**Click:** **Review evidence** → select **A methane source was detected** (`source_detected`) → **Run rules baseline**. Show **Supported**. Then select **The detected methane release has been mitigated** (`mitigation_confirmed`) → **Run rules baseline**. Show **Insufficient Evidence** and the reason.

**Say:**

“First, ask whether a methane source was detected. The deterministic baseline finds the required evidence type and returns supported for this claim and evidence bundle. Now keep the source and supplied evidence, but ask a stronger question: was mitigation confirmed? The result becomes insufficient evidence. That does not mean mitigation failed. An official report link is available, but the full report contents are not included in this assessment. The workflow shows where further evidence is needed instead of treating feedback, a report title or a missing observation as proof.”

<a id="02350315--ekspor-dan-verifikasi"></a>
## 02:35–03:15 — Export and verification

**Click:** Main navigation **Reports** → **Download JSON report** → **Blockchain**. The destination page displays Verification Center. Select the file in **Choose a JSON audit report**.

**Expected result:** `Audit bundle SHA-256 digest matches.` and `No blockchain receipt is included in this file.`

**Say:**

“We can export this assessment and open it in the local Verification Center. The canonical audit-bundle digest matches the saved record. The interface also makes the missing blockchain receipt explicit. This walkthrough uses local files. It does not submit a transaction or claim that a hash establishes methane mitigation.”

<a id="03150350--perubahan-yang-dapat-dideteksi"></a>
## 03:15–03:50 — A detectable change

**Click:** Select the report copy that changes only `latestAudit.bundle.reason`, while keeping the summary and original digest. Result: `Audit bundle verification failed.` with reason `Audit summary fields do not match the hashed bundle.` Keep the original report separate. This check stops at the summary mismatch, before digest comparison.

**Say:**

“Here is a copy with one sentence changed inside the bundle. Its summary was left unchanged, so the verifier rejects the inconsistent report before comparing digests. This is not an unforgeable signature: someone able to rewrite the record could also recompute an unsigned hash. Integrity, authorship and physical truth are different questions.”

<a id="03500420--manfaat-dan-langkah-berikut"></a>
## 03:50–04:20 — Benefit and next step

**On screen:** closing slide. No additional dashboard tour is needed.

**Say:**

“The working prototype connects historical observations, a claim-specific rules baseline and a portable review record. Its demonstrated benefit is visible reasoning and visible evidence gaps. Our next step is a task-based pilot with independent reviewers, comparing evidence interpretation and report verification against a manual workflow. Time savings, adoption and emissions reductions remain to be measured.”

<a id="04200430--kalimat-penutup-dan-buffer"></a>
## 04:20–04:30 — Closing line and buffer

**Say:** “MethaneResponse: see what supports a claim, and what still needs evidence.”

Leave a buffer for tab transitions. Aim for 4:20–4:30 in rehearsal; if UI transitions push the duration past the target, skip the modified-copy scene using the fallback below. Do not speed up the narration to add features.

<a id="menyiapkan-salinan-perubahan-dengan-aman"></a>
## Safely preparing the modified copy

The following command reads the selected report and creates a **new file** only. Run it before recording. Replace the input filename with the downloaded demo report; `x` refuses to overwrite an existing output. It makes no network requests.

```python
import json
from pathlib import Path

original = Path("kaz_s_159-audit.json")
report = json.loads(original.read_text())
report["latestAudit"]["bundle"]["reason"] += " changed for integrity demo"
with Path("modified-audit-demo.json").open("x") as output:
    json.dump(report, output, indent=2)
```

<a id="fallback-dan-reset"></a>
## Fallback and reset

| Condition | Presenter action |
|---|---|
| Basemap does not appear | Explain fallback mode; use the source geometry and metadata that remain available. Do not call it a live satellite image. |
| API/download fails | Switch to the dated screenshot on the Notion page and identify it as a local capture. Do not call the fallback scene a live demo. |
| Less than 45 seconds remain | Skip the modified-copy scene; show the original verification and closing. |
| Claim result differs from the runbook | Stop the interpretation; check the source, snapshot, claim type, and local state. Do not change data to force the result. |
| A rerun is needed | Stop the demo-owned process, choose a new state path, and start again. Do not delete user state. |

<a id="rehearsal-yang-masih-harus-dilakukan"></a>
## Rehearsal still required

- Read the script while following the clicks; measure actual duration and pauses.
- Record one complete take, watch the entire video, and check small text, pointer, audio, and caption synchronization.
- Match the video and captions to the revision and snapshot. Older captions/video do not automatically match this script.
- Test the video and repository links in a logged-out session before an authorized submission.
