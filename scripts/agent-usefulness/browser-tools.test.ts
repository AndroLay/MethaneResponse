import { afterEach, describe, expect, test } from 'bun:test';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createBrowserTaskTools } from './browser-tools';

let browser: Browser | undefined;
let server: ReturnType<typeof Bun.serve> | undefined;
afterEach(async () => {
  await browser?.close();
  browser = undefined;
  server?.stop(true);
  server = undefined;
});

describe('Playwright agent tools', () => {
  test('reads visible controls without token values, operates the local page and blocks external navigation', async () => {
    server = Bun.serve({
      port: 0,
      fetch: () => new Response('<main><h1>DEMO case</h1><label for="claim">Claim</label><input id="claim" value="old"><label for="reviewer">Reviewer token (session only)</label><input id="reviewer" value="mrv1.DEMO-secret-token-value"><button onclick="document.querySelector(\'h1\').textContent=\'Saved\'">Save draft</button><a href="https://reports.example/uncleared">External report</a></main>', { headers: { 'content-type': 'text/html' } }),
    });
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox'] });
    const baseUrl = `http://127.0.0.1:${server.port}`;
    const page: Page = await browser.newPage();
    await page.goto(baseUrl);
    const tools = createBrowserTaskTools(page, baseUrl, { externalEvidenceMetadata: [{ url: 'https://reports.example/uncleared', title: 'Uncleared report title' }] });
    const byName = new Map(tools.map(tool => [tool.definition.function.name, tool]));

    const observation = await byName.get('read_page')!.execute({}) as { text: string };
    expect(observation.text).toContain('DEMO case');
    expect(observation.text).toContain('Claim');
    expect(observation.text).not.toContain('mrv1.DEMO-secret-token-value');
    expect(observation.text).not.toContain('https://reports.example/uncleared');

    await byName.get('fill')!.execute({ label: 'Claim', value: 'new claim text' });
    expect(await page.getByLabel('Claim').inputValue()).toBe('new claim text');
    // React-controlled wrapping labels can acquire textarea text as a child.
    await page.locator('main').evaluate(main => {
      const label = document.createElement('label'); label.textContent = 'Document title';
      const textarea = document.createElement('textarea'); textarea.setAttribute('aria-label', 'Document title');
      textarea.addEventListener('input', () => { textarea.textContent = textarea.value; });
      label.append(textarea); main.append(label);
    });
    await byName.get('fill')!.execute({ label:'Document title', value:'first title' });
    await byName.get('fill')!.execute({ label:'Document title', value:'edited title' });
    expect(await page.getByRole('textbox', {name:'Document title',exact:true}).inputValue()).toBe('edited title');
    await page.locator('main').evaluate(main => {
      const details = document.createElement('details');
      details.innerHTML = '<summary>Method & limits</summary><label>Hidden context<input aria-label="Hidden context" value="preserved"></label>';
      main.append(details);
    });
    expect((await byName.get('read_page')!.execute({}) as {text:string}).text).not.toContain('input Hidden context');
    await byName.get('set_details')!.execute({summary:'Method & limits',open:true});
    expect((await byName.get('read_page')!.execute({}) as {text:string}).text).toContain('input Hidden context');
    await byName.get('set_details')!.execute({summary:'Method & limits',open:false});
    await byName.get('click')!.execute({ role: 'button', name: 'Save draft' });
    expect(await page.locator('h1').textContent()).toBe('Saved');
    await expect(byName.get('navigate')!.execute({ path: 'https://example.org' })).rejects.toThrow('only local application routes are allowed');
    await expect(byName.get('click')!.execute({ role: 'link', name: 'External report' })).rejects.toThrow('external links are blocked');
  });
});
