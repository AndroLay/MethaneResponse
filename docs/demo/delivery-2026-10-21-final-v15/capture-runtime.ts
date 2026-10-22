import type {Page,TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {installDemoCursor} from '../../../scripts/delivery-cursor';
export async function beginCapture(page:Page,info:TestInfo){
  const started=Date.now();
  await installDemoCursor(page);
  await page.addInitScript(()=>{
    const style=document.createElement('style');style.textContent='#methane-demo-cursor .methane-demo-pointer{transition:left 150ms ease-out,top 150ms ease-out} input[type="password"]{-webkit-text-security:disc}';
    document.addEventListener('DOMContentLoaded',()=>document.head.append(style),{once:true});
  });
  // Follow actual click targets; do not draw an editorial pointer over stills.
  const prototype=Object.getPrototypeOf(page.locator('body'));
  const original=prototype.click;
  prototype.click=async function(...args:any[]){
    await this.scrollIntoViewIfNeeded();const box=await this.boundingBox();
    if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:30});await page.waitForTimeout(160);}
    return original.apply(this,args);
  };
  const shots:any[]=[];
  return {
    async mark(label:string){
      const color=[40+shots.length*13,35+shots.length*5,80+shots.length*7];
      await page.evaluate(color=>{const el=document.createElement('div');el.id='editorial-sync';Object.assign(el.style,{position:'fixed',inset:'0',background:`rgb(${color.join(',')})`,zIndex:'2147483647'});document.documentElement.append(el);},color);
      await page.waitForTimeout(600);
      await page.evaluate(()=>document.getElementById('editorial-sync')?.remove());
      shots.push({id:label,color,startWall:Date.now()-started});
    },
    async finish(){await writeFile(info.outputPath('capture.json'),JSON.stringify({sourceId:'TKM_S_021',snapshotId:'unep-mars-675417694883',width:1920,height:1080,localOnly:true,softwareDemoReviewer:true,startedAt:new Date(started).toISOString(),shots},null,2));}
  };
}
