import type { Page, TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { installDemoCursor } from '../../../scripts/delivery-cursor';

/** Editorial capture hooks only. Never changes application values or outcomes. */
export async function beginConnectedCapture(page:Page,info:TestInfo){
  const startedAt=Date.now();
  await installDemoCursor(page);
  const markers:{seconds:number;label:string}[]=[];
  return {
    mark(label:string){markers.push({seconds:(Date.now()-startedAt)/1000,label});},
    async finish(){await writeFile(info.outputPath('capture-markers.json'),JSON.stringify({schemaVersion:1,startedAt:new Date(startedAt).toISOString(),durationSeconds:(Date.now()-startedAt)/1000,markers,kind:'Actual production-build browser interaction; software DEMO reviewer on real historical MARS records',limitations:['No live model request, public chain transaction, operator contact or physical repair.','Video start may precede first marker by browser setup latency.','Includes intentional mobile viewport and stale-response checks.']},null,2)+'\n');}
  };
}
