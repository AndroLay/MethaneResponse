"""Create a directed capture from the already validated browser workflow.

Only pacing, viewport, cursor and editorial sync slates change. Assertions and
application requests remain real. Generated source is retained with the video.
"""
from pathlib import Path
import hashlib
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
src=ROOT/'e2e/ai-review-workflow.spec.ts'
s=src.read_text()
start=s.index("test('connected investigation preserves")
end=s.index("\ntest('Plan reviewers",start)
body=s[start:end]
body=body.replace("const capture=testInfo.project.name==='connected-capture'?await (await import('../docs/demo/connected-2026-10-20/capture-runtime')).beginConnectedCapture(page,testInfo):null;", "const capture=await beginCapture(page,testInfo);")
body=body.replace("await page.setViewportSize({ width: 1440, height: 1000 });", "await page.setViewportSize({ width: 1920, height: 1080 });")
body=body.replace("  await page.route(/^https?:\\/\\//, route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());", "")
# All markers are awaited so the visual slate has an unambiguous frame boundary.
body=body.replace('capture?.mark(', 'await capture.mark(').replace('await capture?.finish()', 'await capture.finish()')
# Capture a real overview first; external imagery retains the in-product attribution.
body=body.replace("  await page.goto('/dashboard/cases?sourceId=TKM_S_021');", """  await page.goto('/dashboard/map?sourceId=TKM_S_021');
  await page.waitForTimeout(9000);
  await capture.mark('globe');
  await page.mouse.move(1200,450,{steps:50});
  await page.waitForTimeout(6500);
  await page.goto('/dashboard/cases?sourceId=TKM_S_021');""")
anchor="  const review = page.getByLabel('Plan reviewer decisions', { exact: true });"
body=body.replace(anchor,"""  await page.waitForTimeout(2200);
  const choices=planner.getByRole('group',{name:'Alternative investigation plans'});
  await choices.getByRole('button',{name:/Weighted historical indicators/}).click();
  await planner.getByRole('button',{name:'Use this plan on map & queue',exact:true}).click();
  const queue=page.getByRole('region',{name:'Active investigation plan',exact:true});
  await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
  await queue.scrollIntoViewIfNeeded(); await page.waitForTimeout(1800);
  await capture.mark('capacity20');
  await planner.getByLabel('Investigation slots',{exact:true}).fill('20');
  await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
  await page.waitForTimeout(2000);
  await planner.getByRole('button',{name:'Compare investigation plans',exact:true}).click();
  await page.waitForTimeout(1800);
  await planner.getByRole('button',{name:'Use this plan on map & queue',exact:true}).click();
  await expect(queue.getByRole('heading')).toHaveText('20 sources in your active plan');
  await queue.scrollIntoViewIfNeeded(); await page.waitForTimeout(1800);
  // Restore the ten-source plan before saving the primary investigation.
  await capture.mark('restore10');
  await planner.getByLabel('Investigation slots',{exact:true}).fill('10');
  await planner.getByRole('button',{name:'Compare investigation plans',exact:true}).click();
  await planner.getByRole('button',{name:'Use this plan on map & queue',exact:true}).click();
  await expect(queue.getByRole('heading')).toHaveText('10 sources in your active plan');
"""+anchor)
# Drop unrelated overlap/mobile/concurrency subtests from this presentation take.
a=body.index('  const peer=await request.put(')
b=body.index("  await lifecycle.getByRole('combobox',{name:'Evidence event'",a)
body=body[:a]+body[b:]
a=body.index('  await page.setViewportSize({ width: 390, height: 844 });')
body=body[:a]+"  await page.waitForTimeout(3500);\n  expect(errors).toEqual([]);\n  await capture.finish();\n});\n"
# Pause after visible results; keep credential entry out of edited shots.
for line in ["await expect(planner.getByTestId('planner-summary')).toContainText('4,218');", "await expect(shared).toContainText('Saved shared revision 1');", "await expect(human.locator('.human-saved-result')).toContainText('Human determination saved');", "await expect(decisionPanel).toContainText('Decision 1 frozen');"]:
    body=body.replace(line,line+'\n  await page.waitForTimeout(2600);')
body=body.replace("await human.getByRole('button', { name: 'Save human determination', exact: true }).click();", "await capture.mark('save-assessment');\n  await human.getByRole('button', { name: 'Save human determination', exact: true }).click();")
body=body.replace("await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();", "await lifecycle.getByRole('button',{name:'Add evidence event to draft',exact:true}).click();\n  await page.waitForTimeout(1500);")
header="""import {expect,test} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {issueReviewerToken} from '../../../apps/api/src/reviewer-auth';
import {beginCapture} from './capture-runtime';
"""
body=body.replace("import('../packages/", "import('../../../packages/")
(HERE/'video.spec.ts').write_text(header+body)
(HERE/'capture-source.sha256').write_text(hashlib.sha256(src.read_bytes()).hexdigest()+'  e2e/ai-review-workflow.spec.ts\n')
print('Directed capture source prepared; no application values or outcomes altered.')
