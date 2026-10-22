import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const env={...process.env,METHANE_E2E_AI_MOCK:'1',METHANE_E2E_AI_ACCESS_TOKEN:randomBytes(32).toString('base64url'),METHANE_E2E_REVIEWER_SECRET:randomBytes(32).toString('base64url')};
const result=spawnSync('bun',['--no-env-file','run','playwright','test','--config','docs/demo/delivery-2026-10-21-final-v15/capture.config.ts'],{env,stdio:'inherit'});
process.exit(result.status??1);
