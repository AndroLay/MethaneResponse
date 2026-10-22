import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import IntelligencePanel from './IntelligencePanel';
import DocumentRightsSummary from './DocumentRightsSummary';

test('document assessment UI exposes a per-document rights declaration and its limits', () => {
  const html = renderToStaticMarkup(createElement(IntelligencePanel, {
    sourceId: 'KAZ_S_159',
    observations: [],
    claimType: 'mitigation_confirmed',
    synthetic: false,
    documentAssessmentAllowed: true,
    currentAudit: null,
    onAssessment: () => {},
    capability: null,
    capabilityLoading: false,
    onRetryCapability: () => {},
  }));

  expect(html).toContain('Document processing rights');
  expect(html).toContain('Exact claim to assess');
  expect(html).toContain('I own this document or excerpt');
  expect(html).toContain('I have explicit permission to process it');
  expect(html).toContain('Open license with attribution');
  expect(html).toContain('license and provider terms allow excerpt processing and private quote retention');
  expect(html).toContain('does not independently verify copyright, permission, source authenticity, or completeness');
});

test('document workflow puts claim and evidence before collapsed historical context and keeps permission gates visible', () => {
  const html = renderToStaticMarkup(createElement(IntelligencePanel, {
    sourceId: 'KAZ_S_159', observations: [], claimType: 'operator_notified', synthetic: false,
    documentAssessmentAllowed: true, currentAudit: null, onAssessment: () => {},
    capability: null, capabilityLoading: false, onRetryCapability: () => {},
  }));
  expect(html).toContain('<legend>1. Claim &amp; supporting document</legend>');
  expect(html).toContain('<legend>2. Permission &amp; assessment</legend>');
  expect(html.indexOf('Exact claim to assess')).toBeLessThan(html.indexOf('Historical source context'));
  expect(html).toContain('<details class="intel-context">');
  expect(html).toContain('<details class="intel-processing-limits">');
  expect(html).toContain('<summary>Optional public sharing permissions</summary>');
  expect(html).toContain('Human review is required before publication or anchoring.');
});

test('review rights summary distinguishes declarations from verified permissions and handles legacy reports', () => {
  const html = renderToStaticMarkup(createElement(DocumentRightsSummary, {
    documents: [
      { id: 'owned', title: 'Owned excerpt', rightsDeclared: 'owned' },
      { id: 'permitted', title: 'Permitted report', rightsDeclared: 'explicit_permission' },
      { id: 'open', title: 'Open research paper', rightsDeclared: 'open_license', licenseName: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Dowd et al. (2024), AMT, DOI 10.5194/amt-17-1599-2024.', licenseScopeConfirmed: true },
      { id: 'legacy', title: 'Historical report' },
    ],
  }));

  expect(html).toContain('Document processing-rights declarations');
  expect(html).toContain('Submitter declared ownership');
  expect(html).toContain('Submitter declared explicit permission to process');
  expect(html).toContain('Submitter declared open-license basis: CC BY 4.0');
  expect(html).toContain('Dowd et al. (2024), AMT, DOI 10.5194/amt-17-1599-2024.');
  expect(html).toContain('No rights declaration recorded in this audit');
  expect(html.match(/not independently verified/g)).toHaveLength(4);
});
