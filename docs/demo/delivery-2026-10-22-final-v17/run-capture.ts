import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const env={...process.env,TMPDIR:'/tmp/mr17',METHANE_E2E_TEMP_ROOT:'/tmp/mr17',
  PLAYWRIGHT_BROWSERS_PATH:resolve('.playwright-cli/deepseek-browser-cache'),PLAYWRIGHT_CHROMIUM_EXECUTABLE:resolve('.playwright-cli/deepseek-browser-cache/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell'),PLAYWRIGHT_OUTPUT_DIR:resolve('delivery-output/final-v17/raw-take10'),METHANE_E2E_AI_MOCK:'1',
  METHANE_E2E_API_PORT:'43239',METHANE_E2E_WEB_PORT:'4189',METHANE_E2E_MOCK_AI_PORT:'43240',
  METHANE_E2E_AI_ACCESS_TOKEN:randomBytes(32).toString('base64url'),METHANE_E2E_REVIEWER_SECRET:randomBytes(32).toString('base64url')};
const result=spawnSync('bun',['--no-env-file','run','playwright','test','--config','docs/demo/delivery-2026-10-22-final-v17/capture.config.ts'],{env,stdio:'inherit'});
process.exit(result.status??1);
