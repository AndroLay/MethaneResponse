import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';

// No inherited model credentials, public RPC, signer or reviewer configuration.
const env = buildE2ERunnerEnvironment(process.env, chooseE2ETemporaryRoot(process.env));
env.METHANE_RETAINED_CHAIN_TEST = 'disposable-loopback-only';
const args = process.argv.slice(2);
const flags = new Map<string,string>();
for(let index=0;index<args.length;index+=2) {
  const flag=args[index],value=args[index+1];
  if(!['--evidence','--decision','--trusted-digest'].includes(flag) || !value || value.startsWith('-') || flags.has(flag)) {
    process.stderr.write('Usage: bun --no-env-file scripts/run-retained-decision-proof.ts [--evidence <new-output.json>] [--decision <TKM-DEMO-export.json> --trusted-digest <separate 0x SHA-256>]\n'); process.exit(1);
  }
  flags.set(flag,value);
}
if(flags.has('--decision') !== flags.has('--trusted-digest') || flags.has('--trusted-digest') && !/^0x[a-f0-9]{64}$/.test(flags.get('--trusted-digest')!)) {
  process.stderr.write('A new export requires its separately trusted digest.\n');process.exit(1);
}
if(flags.has('--evidence')) env.METHANE_RETAINED_CHAIN_EVIDENCE = flags.get('--evidence')!;
if(flags.has('--decision')) {env.METHANE_RETAINED_EXPORT_PATH=flags.get('--decision')!;env.METHANE_RETAINED_TRUSTED_DIGEST=flags.get('--trusted-digest')!;}
const result = spawnSync(process.execPath,['--no-env-file','test','scripts/retained-decision-chain.test.ts'],{env,stdio:'inherit'});
if (result.error) process.stderr.write('Could not start isolated retained decision proof.\n');
process.exit(result.status ?? 1);
