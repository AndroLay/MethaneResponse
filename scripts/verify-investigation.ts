import { InvestigationDossier, verifyInvestigationDossier } from '../packages/shared/src/investigation-dossier';

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 3 || args[1] !== '--expected-digest' || !/^0x[a-f0-9]{64}$/.test(args[2]) || !args[0] || args[0].startsWith('-')) throw new Error('Usage: bun --no-env-file scripts/verify-investigation.ts <dossier.json> --expected-digest <separately trusted 0x SHA-256>');
    const file = Bun.file(args[0]); if (file.size > 16 * 1024 * 1024) throw new Error('Investigation exceeds 16 MiB.');
    const raw: unknown = JSON.parse(await file.text());
    if (!await verifyInvestigationDossier(raw, args[2])) throw new Error('Investigation failed trusted-digest, allocation replay or evidence relationship checks.');
    const dossier = InvestigationDossier.parse(raw);
    console.log(JSON.stringify({ valid: true, workId: dossier.workId, sourceId: dossier.context.sourceId, revisions: dossier.history.length,
      linkedPlans: dossier.plans.length, linkedAssessments: dossier.assessments.length, linkedTransitions: dossier.transitions.length, expectedDigest: args[2],
      physicalOutcomeEstablished: false, chainAnchored: false,
      limitation: 'Integrity relative to a separately trusted digest; no independent reviewer identity, physical outcome or blockchain receipt. Replay snapshot differences separately against both pinned input files.' }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Investigation verification failed.'); process.exitCode = 1; }
}
