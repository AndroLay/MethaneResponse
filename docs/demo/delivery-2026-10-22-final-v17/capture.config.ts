import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
import base from '../../../playwright.config';
const servers=Array.isArray(base.webServer)?base.webServer:[];
export default defineConfig({...base,testDir:resolve(process.cwd(),'docs/demo/delivery-2026-10-22-final-v17'),testMatch:'video.spec.ts',timeout:600_000,
  use:{...base.use,trace:'off',viewport:{width:1920,height:1080},video:{mode:'on',size:{width:1920,height:1080}},launchOptions:{...base.use?.launchOptions,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'],slowMo:0}},
  projects:[{name:'v17-action-capture',use:{browserName:'chromium'}}],webServer:servers.map(s=>({...s,cwd:process.cwd()}))});
