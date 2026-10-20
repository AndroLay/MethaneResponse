import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../../playwright.config';

const root=process.cwd(); // Playwright loads this config through Node's CJS transform.
const servers=Array.isArray(base.webServer)?base.webServer:base.webServer?[base.webServer]:[];
export default defineConfig({
  ...base, testDir:resolve(root,'e2e'), grep:/connected investigation preserves/,
  timeout:240_000,
  outputDir:process.env.PLAYWRIGHT_OUTPUT_DIR,
  use:{...base.use,video:{mode:'on',size:{width:1440,height:1000}},launchOptions:{...base.use?.launchOptions,slowMo:100}},
  projects:[{name:'connected-capture',use:{browserName:'chromium'}}],
  webServer:servers.map(server=>({...server,cwd:root})),
});
