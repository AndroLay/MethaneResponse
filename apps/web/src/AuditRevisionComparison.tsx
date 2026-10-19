import { useState } from 'react';
import type { AuditResult, ClaimType } from '@methane/shared';
import { compareAuditRevisions } from './audit-comparison';
import { sortAuditHistory } from './audit-history';
import { claimRequirements } from './investigation-plan';

type Props = { sourceId: string; audits: readonly AuditResult[]; selectedAuditId?: string; hasMore: boolean };

function revisionLabel(audit: AuditResult) {
  const timestamp = Date.parse(audit.generatedAt);
  const date = Number.isFinite(timestamp) ? `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'Date unavailable';
  return `Revision ${audit.revision} · ${date} · ${audit.auditId.slice(0, 8)}`;
}

export default function AuditRevisionComparison({ sourceId, audits, selectedAuditId, hasMore }: Props) {
  const [selection, setSelection] = useState<{ sourceId: string; claim?: ClaimType; beforeId?: string; afterId?: string }>({ sourceId });
  const ordered = sortAuditHistory(audits.filter(item => item.sourceId === sourceId));
  const selected = ordered.find(item => item.auditId === selectedAuditId);
  const availableClaims = (Object.keys(claimRequirements) as ClaimType[]).filter(claim => ordered.some(item => item.claimType === claim));
  const requestedClaim = selection.sourceId === sourceId ? selection.claim : undefined;
  const claim = requestedClaim && availableClaims.includes(requestedClaim) ? requestedClaim : selected?.claimType || availableClaims[0];
  const revisions = ordered.filter(item => item.claimType === claim);
  const after = revisions.find(item => selection.sourceId === sourceId && item.auditId === selection.afterId)
    || revisions.find(item => item.auditId === selectedAuditId) || revisions[0];
  const before = revisions.find(item => selection.sourceId === sourceId && item.auditId === selection.beforeId && item.auditId !== after?.auditId)
    || revisions.find(item => item.auditId !== after?.auditId);
  const comparison = before && after ? compareAuditRevisions(before, after) : null;

  return <section className="audit-comparison" aria-labelledby="audit-comparison-title">
    <div className="comparison-heading"><h3 id="audit-comparison-title">Compare saved assessments</h3><p>See what changed in the decision and its cited evidence. These selections are independent of the report currently open.</p></div>
    {availableClaims.length > 0 && <div className="comparison-selectors">
      <label>Claim<select aria-label="Comparison claim" value={claim} onChange={event => setSelection({ sourceId, claim: event.target.value as ClaimType })}>{availableClaims.map(value => <option key={value} value={value}>{claimRequirements[value].title}</option>)}</select></label>
      {after && <label>Compare from<select aria-label="Compare from" value={before?.auditId || ''} onChange={event => setSelection({ sourceId, claim, afterId: after.auditId, beforeId: event.target.value })} disabled={!before}>
        {!before && <option value="">A second assessment is needed</option>}
        {revisions.filter(item => item.auditId !== after.auditId).map(item => <option key={item.auditId} value={item.auditId}>{revisionLabel(item)}</option>)}
      </select></label>}
      {after && <label>Compare to<select aria-label="Compare to" value={after.auditId} onChange={event => setSelection({ sourceId, claim, afterId: event.target.value, beforeId: before?.auditId })}>{revisions.map(item => <option key={item.auditId} value={item.auditId}>{revisionLabel(item)}</option>)}</select></label>}
    </div>}
    {!comparison && <p className="comparison-empty">Save or load two assessments of the same claim to compare their contents.{hasMore ? ' Older assessments may be available under Load older revisions.' : ''}</p>}
    {comparison && !comparison.comparable && <p className="comparison-empty" role="status">{comparison.notice}</p>}
    {comparison?.comparable && <div className="comparison-result" aria-live="polite">
      {comparison.snapshotChanged && <p className="comparison-caution">The dataset binding changed. Differences may reflect a new source-data release; they do not establish a change in physical emissions.</p>}
      {before?.bundle.intelligence?.claimText !== after?.bundle.intelligence?.claimText && <p className="comparison-caution">The exact claim wording changed. These assessments may concern different events or scopes.</p>}
      {comparison.differences.length > 0 ? <dl className="comparison-differences">{comparison.differences.map(item => <div key={item.field}><dt>{item.field}</dt><dd><span>From</span><p>{item.before}</p></dd><dd><span>To</span><p>{item.after}</p></dd></div>)}</dl>
        : <p className="comparison-empty">The compared decision fields are unchanged. The assessment identity, timestamps or other bundle fields may still differ.</p>}
      <div className="comparison-citations"><strong>Cited reference changes</strong><p>{comparison.added.length} added · {comparison.removed.length} removed · {comparison.changed.length} changed</p>
        {(comparison.added.length > 0 || comparison.removed.length > 0 || comparison.changed.length > 0) && <ul>{([
          ['Added', comparison.added], ['Removed', comparison.removed], ['Changed', comparison.changed],
        ] as const).flatMap(([label, items]) => items.map(item => <li key={`${label}-${item.kind}-${item.id}`}><span>{label}</span><div><strong>{item.title}</strong><small>{item.id} · {item.kind.replaceAll('_', ' ')} · {item.date || 'Undated'}</small></div></li>))}</ul>}
      </div>
      <p className="comparison-lineage">{comparison.recordedParent ? 'The target review records the selected earlier bundle as its parent.' : 'No direct review parent link is recorded between this pair.'} Comparing contents does not verify hashes, reviewer identity or physical mitigation.</p>
    </div>}
    {hasMore && <p className="comparison-limit">Comparison uses the assessments loaded on this page. Load older revisions to extend the selection.</p>}
  </section>;
}
