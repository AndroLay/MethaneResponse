import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';

test('imported report verification keeps the visible and accessible file labels aligned in English', async () => {
  const componentPath = fileURLToPath(new URL('./ImportedAuditVerifier.tsx', import.meta.url));
  expect(existsSync(componentPath)).toBe(true);
  if (!existsSync(componentPath)) return;

  const module = await import(pathToFileURL(componentPath).href) as { default: ComponentType };
  const html = renderToStaticMarkup(createElement(module.default));

  expect(html).toContain('id="imported-audit-title">Verify an exported report</div>');
  expect(html).toContain('<span>Choose a JSON audit report</span>');
  expect(html).toContain('aria-label="Choose a JSON audit report"');
  expect(html).toContain('File contents are processed locally and are not uploaded.');
  const component = readFileSync(componentPath, 'utf8');
  expect(component).toContain('Document-rights fields are structurally complete and hash-bound.');
  expect(component).toContain('The digest matches, but the document-rights metadata is malformed:');
});
