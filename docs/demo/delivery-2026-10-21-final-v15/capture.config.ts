import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
import base from '../../../playwright.config';
const servers=Array.isArray(base.webServer)?base.webServer:[];
export default defineConfig({...base,testDir:resolve(process.cwd(),'docs/demo/delivery-2026-10-21-final-v15'),testMatch:'video.spec.ts',timeout:300_000,
  use:{...base.use,viewport:{width:1920,height:1080},video:{mode:'on',size:{width:1920,height:1080}},launchOptions:{...base.use?.launchOptions,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'],slowMo:130}},
  projects:[{name:'final-video-capture',use:{browserName:'chromium'}}],webServer:servers.map(s=>({...s,cwd:process.cwd()}))});
