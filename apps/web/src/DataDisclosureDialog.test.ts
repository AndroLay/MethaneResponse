import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';

test('data disclosure uses native dialog semantics and includes cited research references', async () => {
  const componentPath = fileURLToPath(new URL('./DataDisclosureDialog.tsx', import.meta.url));
  const componentExists = existsSync(componentPath);
  expect(componentExists).toBe(true);
  if (!componentExists) return;

  const module = await import(pathToFileURL(componentPath).href) as {
    default: ComponentType<{ open: boolean; onClose: () => void }>;
  };
  const html = renderToStaticMarkup(createElement(module.default, { open: true, onClose: () => {} }));

  expect(html).toContain('<dialog');
  expect(html).toContain('aria-labelledby="data-disclosure-title"');
  expect(html).toContain('Research &amp; methods');
  expect(html).toContain('Close data and prototype information');
  expect(html).toContain('Case satellite tiles are coordinate-matched geographic context, not overpass imagery.');
  expect(html).toContain('hash-verified UNEP publisher geometry is shown separately');
  expect(html).not.toContain('Generated observation thumbnails');
  expect(html).not.toContain('aria-modal="true"');
});
