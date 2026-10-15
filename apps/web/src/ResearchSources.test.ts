import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';

test('the data disclosure exposes traceable research sources without presenting them as app results', async () => {
  const componentPath = fileURLToPath(new URL('./ResearchSources.tsx', import.meta.url));
  const componentExists = existsSync(componentPath);
  expect(componentExists).toBe(true);
  if (!componentExists) return;

  const module = await import(pathToFileURL(componentPath).href) as { default: ComponentType };
  const html = renderToStaticMarkup(createElement(module.default));

  expect(html).toContain('Research &amp; methods');
  expect(html).toContain('MARS plumes &amp; sources data dictionary');
  expect(html).toContain('Technical Documentation for Methane Satellite Detection and Quantification');
  expect(html).toContain('href="https://wedocs.unep.org/handle/20.500.11822/46241"');
  expect(html).toContain('Single-blind validation of space-based point-source detection');
  expect(html).toContain('Enabling Large Language Models to Generate Text with Citations');
  expect(html).toContain('These references inform product safeguards; they are not MethaneResponse performance results.');
  expect((html.match(/target="_blank" rel="noreferrer"/g) || []).length).toBe(4);
});
