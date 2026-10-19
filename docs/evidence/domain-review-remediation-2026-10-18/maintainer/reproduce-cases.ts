// Local preparation tool. Reads only public repository sources; no API, provider or state writes.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assessmentPresentation, assessmentSemantics, AuditScope, Evidence, MarsCasebook, type ClaimType } from '../../../../packages/shared/src';
import { assess } from '../../../../apps/api/src/audit';
import { sourceFromCase } from '../../../../apps/api/src/casebook';

const packet = resolve(import.meta.dir, '..');
const root = resolve(import.meta.dir, '../../../..');
const book = MarsCasebook.parse(JSON.parse(await readFile(resolve(root, 'data/real/mars_casebook_2026-10-15.json'), 'utf8')));
const realSpecs: Array<[string, string, ClaimType, string, string, string, string?]> = [
  ['R01', 'KAZ_S_159', 'source_detected', '2024-06-07', '2024-06-07', 'Apakah record yang diberikan mendukung deteksi pada kejadian ini? Jelaskan batas atribusi dan uncertainty.', '82758651-76f4-4e06-b4ab-c247ce765192'],
  ['R02', 'KAZ_S_159', 'operator_notified', '2024-06-07', '2024-06-07', 'Apakah flag source-level cukup untuk menyatakan operator tertentu menerima notifikasi kejadian ini? Sebutkan informasi yang perlu ditambahkan.', '82758651-76f4-4e06-b4ab-c247ce765192'],
  ['R03', 'KAZ_S_159', 'mitigation_confirmed', '2024-06-01', '2026-09-30', 'Bandingkan penilaian atas metadata yang disertakan dengan klaim pada judul item publisher. Apa yang dapat dinilai tanpa membaca bukti tindakan/follow-up?'],
  ['R04', 'CAN_S_002', 'mitigation_confirmed', '2026-04-01', '2026-07-31', 'Bandingkan waktu observasi April dan tanggal item publisher Juli. Bukti apa yang diperlukan untuk menilai perubahan setelah tindakan?'],
  ['R05', 'LBY_S_143', 'mitigation_confirmed', '2025-12-01', '2026-04-30', 'Apa arti keterbatasan satu observasi terkait dan item publisher yang hanya ditautkan bagi klaim ini?'],
  ['R06', 'ARG_S_055', 'mitigation_confirmed', '2023-01-01', '2023-11-30', 'Bagaimana Anda membatasi kesimpulan ketika konten laporan tidak disertakan dan hak penggunaan dokumen belum dikonfirmasi?'],
];
const cases = realSpecs.map(([id, sourceId, claimType, startDate, endDate, question, observationId]) => {
  const item = book.cases.find(item => item.sourceId === sourceId)!;
  const source = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
  const scope = AuditScope.parse({ startDate, endDate, ...(observationId ? { observationId } : {}), ...(claimType === 'operator_notified' ? { recipient: 'Operator yang dimaksud belum diidentifikasi dalam paket' } : {}) });
  const claimTextForReview = claimType === 'source_detected' ? `MARS mencatat observasi methane pada ${sourceId} dalam periode ${startDate} sampai ${endDate}.`
    : claimType === 'operator_notified' ? `Operator fasilitas ${sourceId} telah menerima notifikasi kejadian ${observationId} pada ${startDate}.`
    : `Tindakan mitigasi pada ${sourceId} telah dikonfirmasi dalam periode ${startDate} sampai ${endDate}.`;
  return { id, kind: 'REAL_HISTORICAL_METADATA', sourceId, claimType, claimTextForReview, scope, question,
    flags: { notified: source.notified, feedback: source.feedback, feedbackScope: 'source' },
    observations: source.observations, evidence: source.evidence, publisherItems: item.externalEvidence };
});
const demoScope = AuditScope.parse({ startDate: '2026-09-01', endDate: '2026-09-30', observationId: 'DEMO-P4-OBS', recipient: 'DEMO recipient A' });
const notice = Evidence.parse({ id: 'DEMO-P4-notice', kind: 'notification', claimType: 'operator_notified', title: 'DEMO invented notification receipt', reference: 'https://example.org/DEMO-notice', date: '2026-09-04', synthetic: true, observationId: demoScope.observationId, recipient: demoScope.recipient });
const contrary = Evidence.parse({ ...notice, id: 'DEMO-P4-contrary', kind: 'contradiction', title: 'DEMO invented explicit contrary record' });
const action = Evidence.parse({ id: 'DEMO-P4-action', kind: 'mitigation_confirmation', claimType: 'mitigation_confirmed', title: 'DEMO invented action and follow-up declaration', reference: 'https://example.org/DEMO-action', date: '2026-09-10', synthetic: true, observationId: demoScope.observationId, action: 'DEMO component replacement declared by a reviewer', followUpDate: '2026-09-20', followUpReference: 'https://example.org/DEMO-follow-up' });
const demos: Array<[string, ClaimType, typeof notice[], string]> = [
  ['D01', 'operator_notified', [notice], 'Apakah metadata ini memenuhi hubungan tanggal, event dan penerima? Apakah keaslian tanda terima telah diuji?'],
  ['D02', 'operator_notified', [contrary], 'Apakah referensi bertentangan secara eksplisit dan relevan dengan klaim ini? Apa batas inferensinya?'],
  ['D03', 'operator_notified', [notice, contrary], 'Bagaimana Anda menangani dua referensi relevan yang saling bertentangan?'],
  ['D04', 'mitigation_confirmed', [{ ...action, followUpDate: '2026-10-01' }], 'Bagaimana batas periode memengaruhi kelayakan follow-up ini?'],
  ['D05', 'mitigation_confirmed', [action], 'Apakah field metadata lengkap memadai untuk status ini? Usulkan label atau bukti tambahan bila diperlukan. Seluruh referensi tetap rekaan.'],
  ['D06', 'mitigation_confirmed', [], 'Jika tidak ada pengukuran lanjutan dalam paket, kesimpulan apa yang dapat atau tidak dapat dibuat tentang emisi setelah tindakan?'],
];
for (const [id, claimType, evidence, question] of demos) cases.push({ id, kind: 'DEMO_SYNTHETIC_ONLY', sourceId: 'DEMO-P4', claimType, claimTextForReview: claimType === 'operator_notified' ? 'DEMO recipient A telah menerima notifikasi event DEMO-P4-OBS pada September 2026.' : 'Tindakan mitigasi pada DEMO-P4 telah dikonfirmasi untuk event DEMO-P4-OBS pada September 2026.', scope: demoScope, question, flags: { notified: 'DEMO only', feedback: 'DEMO only', feedbackScope: 'source' }, observations: [], evidence: evidence.map(item => Evidence.parse(item)), publisherItems: [] });
const inputs = { packetVersion: 'P4-2026-10-18-v2', dataset: book.provenance, limitations: ['Selected historical metadata, not a live feed or independent physical verification.', 'DEMO cases and example.org URLs are invented; no document was retrieved.', 'Publisher reports remain link-only; no report text or new rights clearance is included.', 'These are domain review prompts, not gold labels or an independent benchmark.'], cases };
const baselines = { packetVersion: inputs.packetVersion, classification: 'IMPLEMENTATION_OBSERVATIONS_NOT_EXPERT_LABELS', results: cases.map(item => ((() => { const result = assess({ evidence: item.evidence }, item.claimType, item.scope); return { id: item.id, ...result, meaning: assessmentPresentation({ schemaVersion: 2, result: result.result, assessmentSemantics: assessmentSemantics('metadata_coverage') }), physicalVerification: 'not_established_by_application' }; })())) };
const mode = process.argv[2] || '--check';
if (mode === '--cases') process.stdout.write(JSON.stringify(inputs, null, 2) + '\n');
else if (mode === '--baseline') process.stdout.write(JSON.stringify(baselines, null, 2) + '\n');
else if (mode === '--check') {
  const storedInputs = JSON.parse(await readFile(resolve(packet, 'reviewer/cases.json'), 'utf8'));
  const storedBaseline = JSON.parse(await readFile(resolve(packet, 'maintainer/baseline-observations.json'), 'utf8'));
  if (JSON.stringify(inputs) !== JSON.stringify(storedInputs) || JSON.stringify(baselines) !== JSON.stringify(storedBaseline)) throw new Error('Frozen domain review packet differs from current inputs or baseline. Create a new packet version; do not silently overwrite the freeze.');
  process.stdout.write(`Verified ${cases.length} frozen cases (6 real metadata / 6 DEMO) and current deterministic baseline. No expert labels exist.\n`);
} else throw new Error('Use --check, --cases or --baseline.');
