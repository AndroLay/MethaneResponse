import {chromium} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {beginCapture} from './capture-runtime';
const output=resolve('.playwright-cli/v17-cursor-probe');await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:resolve('.playwright-cli/deepseek-browser-cache/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell'),chromiumSandbox:true,env:{PATH:process.env.PATH!,HOME:process.env.HOME!,TMPDIR:'/tmp/mr17'}});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 const capture=await beginCapture(page,{outputPath:(name:string)=>join(output,name)}as any);
 await page.goto('data:text/html,'+encodeURIComponent('<style>body{margin:180px 150px;font:20px sans-serif}input[type=text]{display:block;width:1450px;height:48px;margin-bottom:60px}button{width:700px;height:54px}</style><label>Evidence field<input type="text"></label><button>Save draft</button>'));
 await page.getByLabel('Evidence field').fill('20');
 await page.getByLabel('Evidence field').fill('DEMO follow-up evidence');
 await page.getByRole('button',{name:'Save draft'}).click();
 await capture.finish();
 const meta=JSON.parse(await readFile(join(output,'capture.json'),'utf8'));
 for(const a of meta.actions){
  const down=meta.points.find((p:any)=>p.kind==='down'&&p.time>=a.performAt&&p.time<=a.end);
  if(!down||Math.hypot(down.x-a.box.x-a.interactionPosition.x,down.y-a.box.y-a.interactionPosition.y)>3)throw Error('Cursor target mismatch');
  const before=meta.points.filter((p:any)=>p.kind==='move'&&p.time>=a.moveStart&&p.time<=a.arrivedAt).at(-1);
  if(!before||Math.hypot(before.x-down.x,before.y-down.y)>3)throw Error('Pointer jumped at click');
 }
 console.log(JSON.stringify({browser:'bundled Chromium156, sandbox enabled',realBrowserActions:meta.actions.length,wideInputAndButtonCursor:'PASS',jumpAtClick:false,applicationEffectivenessClaim:false}));
}finally{await browser.close();}
