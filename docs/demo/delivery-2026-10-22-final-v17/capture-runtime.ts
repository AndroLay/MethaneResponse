import type {Page,TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

/** Actual pointer/action geometry only. Never records typed values or tokens. */
export async function beginCapture(page:Page,info:TestInfo){
  const started=Date.now(), shots:any[]=[], actions:any[]=[], points:any[]=[];
  await page.exposeFunction('__recordFilmPointer',(value:any)=>{
    if(['move','down','up','scroll'].includes(value.kind) && Number.isFinite(value.time)) {points.push(value);if(value.kind==='move')pointer={x:value.x,y:value.y};}
  });
  await page.addInitScript(()=>{
    const install=()=>{
      // Compact editorial sync code, excluded from the finished viewport.
      // It contains only action ID + phase, never text or credentials.
      (window as any).__filmCode=(code:number)=>{
        let el=document.getElementById('film-action-sync');
        if(!el){el=document.createElement('div');el.id='film-action-sync';Object.assign(el.style,{position:'fixed',left:'0',top:'0',width:'96px',height:'12px',zIndex:'2147483646',display:'flex',pointerEvents:'none'});document.documentElement.append(el);}
        const checksum=(code^(code>>4)^(code>>8)^(code>>12))&15;
        const bits=[...Array.from({length:16},(_,i)=>(code>>(15-i))&1),...Array.from({length:4},(_,i)=>(checksum>>(3-i))&1)];
        const colors=['#ff00ff','#00ffff',...bits.map(x=>x?'#ffffff':'#000000'),'#ff00ff','#00ffff'];
        el.replaceChildren(...colors.map(color=>{const cell=document.createElement('i');Object.assign(cell.style,{display:'block',width:'4px',height:'12px',background:color,flexShrink:'0'});return cell;}));
      };

      const style=document.createElement('style');
      style.textContent='*{cursor:none!important} #methane-demo-cursor{display:none!important} input[type="password"]{-webkit-text-security:disc}';
      document.head.append(style);
      let last=0;
      const send=(kind:string,e?:PointerEvent)=>{
        const now=Date.now();if(kind==='move' && now-last<15)return;if(kind==='move')last=now;
        (window as any).__recordFilmPointer({kind,time:now,x:e?.clientX,y:e?.clientY,scrollY:window.scrollY});
      };
      document.addEventListener('pointermove',e=>send('move',e),{capture:true,passive:true});
      document.addEventListener('pointerdown',e=>send('down',e),{capture:true,passive:true});
      document.addEventListener('pointerup',e=>send('up',e),{capture:true,passive:true});
      window.addEventListener('scroll',()=>send('scroll'),{passive:true});
    };
    if(document.head)install();else document.addEventListener('DOMContentLoaded',install,{once:true});
  });
  async function flush(status:string){
    const converted=actions.map(a=>{
      const copy={...a};for(const k of ['start','settledAt','moveStart','arrivedAt','performAt','end'])if(copy[k])copy[k]-=started;return copy;
    });
    await writeFile(info.outputPath('capture.json'),JSON.stringify({status,sourceId:'TKM_S_021',snapshotId:'unep-mars-675417694883',width:1920,height:1080,localOnly:true,softwareDemoReviewer:true,startedAt:new Date(started).toISOString(),shots,actions:converted,points:points.map(p=>({...p,time:p.time-started})),valuesRecorded:false,visualActionSync:{cells:24,width:96,height:12,bits:16,checksumBits:4,phaseCodes:{settledAt:0,arrivedAt:1,performAt:2,end:3}},cursor:'Rendered from actual pointer events at constant output size'},null,2));
  }
  const code=async(id:number,phase:number)=>page.evaluate(v=>(window as any).__filmCode(v),id*8+phase);
  let pointer={x:1000,y:500},busy=false;
  const prototype=Object.getPrototypeOf(page.locator('body'));
  const originals=new Map<string,any>();
  for(const kind of ['click','fill','selectOption','check']){
    const original=prototype[kind];originals.set(kind,original);
    prototype[kind]=async function(...args:any[]){
      if(busy)return original.apply(this,args);
      busy=true;
      const action:any={id:actions.length,kind,start:Date.now(),shot:shots.at(-1)?.id};
      actions.push(action);
      try{
        await this.waitFor({state:'visible'});
        const meta=await this.evaluate((el:HTMLElement)=>{
          const input=el as HTMLInputElement;
          const label=input.labels?.[0]?.textContent || el.getAttribute('aria-label') || (el.tagName==='BUTTON'?el.textContent:'') || el.tagName;
          const sensitive=input.type==='password' || /token|secret|credential/i.test(label);
          if(sensitive)el.style.setProperty('-webkit-text-security','disc');
          return {name:sensitive?'Credential entry omitted':label.trim().slice(0,120),sensitive};
        });
        Object.assign(action,meta);
        let box=await this.boundingBox();
        if(!box)throw Error('Visible capture target has no geometry');
        if(box.y<180 || box.y+box.height>850){
          await this.evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'}));
          await page.waitForTimeout(650);
        }
        box=await this.boundingBox();action.box=box;await code(action.id,0);action.settledAt=Date.now();
        action.scrollY=await page.evaluate(()=>window.scrollY);
        if(!box)throw Error('Capture target disappeared after scrolling');
        const position={x:kind==='click'&&args[0]?.position?args[0].position.x:Math.min(box.width/2,200),y:kind==='click'&&args[0]?.position?args[0].position.y:box.height/2};
        action.interactionPosition=position;const target={x:box.x+position.x,y:box.y+position.y};
        const origin={...pointer};action.moveStart=Date.now();
        for(let i=1;i<=12;i++){
          const t=i/12,u=t*t*(3-2*t);
          await page.mouse.move(origin.x+(target.x-origin.x)*u,origin.y+(target.y-origin.y)*u);
          await page.waitForTimeout(30);
        }
        pointer=target;await code(action.id,1);action.arrivedAt=Date.now();
        await page.waitForTimeout(meta.sensitive?60:750);
        await code(action.id,2);action.performAt=Date.now();
        if(kind==='fill'){
          await originals.get('click').apply(this,[{position}]);
          // Short numeric capacity edits visibly type; long evidence text is
          // pasted exactly, without inventing a typing path or exposing values.
          if(!meta.sensitive && /^\d{1,2}$/.test(String(args[0]))){
            await original.apply(this,['']);await this.pressSequentially(String(args[0]),{delay:100});
          }else await original.apply(this,args);
        }else if(kind==='click')await original.apply(this,[{...(args[0]||{}),position}]);
        else await original.apply(this,args);
        await page.waitForTimeout(meta.sensitive?40:600);
        await code(action.id,3);action.end=Date.now();await page.waitForTimeout(100);action.afterBox=await this.boundingBox({timeout:250}).catch(()=>null);
        action.endScrollY=await page.evaluate(()=>window.scrollY);await flush('partial');
      }catch(error){action.failed=true;action.end=Date.now();throw error;}
      finally{busy=false;}
    };
  }
  return {
    async read(locator:any,name:string){
      const start=Date.now(),id=actions.length;
      await locator.evaluate((el:HTMLElement)=>el.scrollIntoView({block:'center',behavior:'smooth'}));
      await page.waitForTimeout(700);
      const box=await locator.boundingBox();await code(id,0);const settledAt=Date.now();
      await page.waitForTimeout(750);await code(id,2);const performAt=Date.now();
      await page.waitForTimeout(2200);
      await code(id,3);const end=Date.now();await page.waitForTimeout(100);
      actions.push({id,kind:'read',name,shot:shots.at(-1)?.id,start,settledAt,performAt,end,box,afterBox:box,scrollY:await page.evaluate(()=>window.scrollY),sensitive:false});await flush('partial');
    },
    async mark(id:string){
      const color=[40+shots.length*13,35+shots.length*5,80+shots.length*7];
      await page.evaluate(color=>{
        const el=document.createElement('div');el.id='editorial-sync';Object.assign(el.style,{position:'fixed',inset:'0',background:`rgb(${color.join(',')})`,zIndex:'2147483647'});document.documentElement.append(el);
      },color);
      await page.waitForTimeout(600);
      await page.evaluate(()=>document.getElementById('editorial-sync')?.remove());
      shots.push({id,color,startWall:Date.now()-started});
    },
    async finish(){
      for(const [kind,fn]of originals)prototype[kind]=fn;
      await flush('complete');
    }
  };
}
