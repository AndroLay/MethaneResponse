import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import PublisherReferenceNotice from './PublisherReferenceNotice';

test('linked publisher report metadata is explicitly labeled as reference-only', () => {
  const html = renderToStaticMarkup(createElement(PublisherReferenceNotice, { documentCount: 1 }));

  expect(html).toContain('Publisher references only');
  expect(html).toContain('not embedded or independently reviewed in MethaneResponse');
  expect(html).toContain('not an independent audit result');
});

test('does not show the publisher-reference notice when a case has no linked documents', () => {
  expect(renderToStaticMarkup(createElement(PublisherReferenceNotice, { documentCount: 0 }))).toBe('');
});
