import { mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { spawn } from 'node:child_process';
import { buildE2ERunnerEnvironment,chooseE2ETemporaryRoot } from '../../../scripts/e2e-runner-utils';
if(process.argv.length!==4||process.argv[2]!=='--output')throw new Error('Usage: --output NEW_DIRECTORY');
const output=resolve(process.argv[3]);await mkdir(output,{mode:0o700});
const env={...buildE2ERunnerEnvironment(process.env,chooseE2ETemporaryRoot(process.env)),
  PLAYWRIGHT_OUTPUT_DIR:join(output,'raw'),PLAYWRIGHT_CHROMIUM_EXECUTABLE:'/usr/bin/chromium',
  METHANE_E2E_API_PORT:'43159',METHANE_E2E_WEB_PORT:'4199',METHANE_E2E_MOCK_AI_PORT:'43160'};
const child=spawn(process.execPath,['--no-env-file','scripts/run-e2e.ts','e2e/ai-review-workflow.spec.ts','--config','docs/demo/connected-2026-10-20/capture.config.ts'],{env,stdio:'inherit'});
child.on('error',()=>{process.stderr.write('Could not start isolated capture.\n');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
