import { expect, test } from 'bun:test';
import { chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createDeliveryTempRuntime } from './delivery-runtime';

test('the demo cursor follows the pointer, marks clicks, and leaves app controls clickable', async () => {
  const { installDemoCursor } = await import('./delivery-cursor.ts');
  const runtime = await createDeliveryTempRuntime(process.cwd());
  const browserHome = await mkdtemp(join(runtime.tempAlias, 'browser-'));
  const context = await chromium.launchPersistentContext(browserHome, {
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    chromiumSandbox: true,
    viewport: { width: 800, height: 600 },
    env: { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin', HOME: browserHome, TMPDIR: browserHome, LANG: 'C.UTF-8', TZ: 'UTC' },
  });

  try {
    const page = await context.newPage();
    await page.setContent('<button id="target" onclick="this.dataset.clicked = \'true\'" style="position:fixed;left:100px;top:120px;width:80px;height:40px">Target</button>');
    await installDemoCursor(page);
    await page.mouse.move(120, 140);

    const pointer = page.locator('#methane-demo-cursor .methane-demo-pointer');
    await page.waitForFunction(() => {
      const root = document.getElementById('methane-demo-cursor');
      return root?.dataset.visible === 'true' && getComputedStyle(root).opacity === '1';
    }, undefined, { timeout: 3_000 });
    const position = await pointer.evaluate(element => ({
      left: (element as SVGElement).style.left,
      top: (element as SVGElement).style.top,
    }));
    expect(position).toEqual({ left: '120px', top: '140px' });

    await page.mouse.down();
    await page.waitForFunction(() => document.getElementById('methane-demo-cursor')?.dataset.pressed === 'true');
    expect(await page.locator('#methane-demo-cursor').getAttribute('data-pressed')).toBe('true');
    await page.mouse.up();
    await page.locator('#target').click();
    expect(await page.locator('#target').getAttribute('data-clicked')).toBe('true');

    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('data:text/html,<main>Route change</main>');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(50);
    expect(pageErrors).toEqual([]);
    expect(await page.locator('#methane-demo-cursor').count()).toBe(1);
  } finally {
    await context.close();
    await rm(browserHome, { recursive: true, force: true });
    await runtime.cleanup();
  }
}, 30_000);
