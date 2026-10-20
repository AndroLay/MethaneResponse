import { PlanJournal, verifyPlanJournal } from '../packages/shared/src/plan-journal';
export function planVerifierArguments(args: string[]) {
  if (args.length !== 3 || args[1] !== '--expected-head' || !/^0x[a-f0-9]{64}$/.test(args[2]) || !args[0] || args[0].startsWith('-')) throw new Error('Usage: bun --no-env-file scripts/verify-plan.ts <history.json> --expected-head <trusted 0x SHA-256>');
  return { file: args[0], expected: args[2] };
}
if (import.meta.main) {
  try {
    const args = planVerifierArguments(process.argv.slice(2)), file = Bun.file(args.file);
    if (file.size > 32 * 1024 * 1024) throw new Error('Plan history exceeds 32 MB.');
    const journal = PlanJournal.parse(JSON.parse(await file.text()));
    if (!await verifyPlanJournal(journal, args.expected)) throw new Error('Plan history failed expected-head, hash-chain or policy replay verification.');
    console.log(JSON.stringify({ valid: true, planId: journal.planId, revisions: journal.revisions.length, expectedHead: args.expected,
      limitation: 'Integrity relative to supplied trusted digest; no independent reviewer authentication, current-status check, physical mitigation proof or blockchain anchor.' }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Plan verification failed.'); process.exitCode = 1; }
}
