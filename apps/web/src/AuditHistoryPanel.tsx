import { assessmentPresentation } from '@methane/shared';
import { useState } from 'react';
import type { AuditResult } from '@methane/shared';
import { auditReviewLabel, sortAuditHistory } from './audit-history';
import AuditRevisionComparison from './AuditRevisionComparison';

type AuditHistoryPanelProps = {
  sourceId: string;
  audits: readonly AuditResult[];
  selectedAuditId?: string;
  isLoading: boolean;
  isError: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  isFetchingMoreError: boolean;
  errorMessage?: string;
  privateHistoryEnabled: boolean;
  onOpen: (audit: AuditResult) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onUnlockPrivate: (token: string) => void;
  onLockPrivate: () => void;
};

export default function AuditHistoryPanel({ sourceId, audits, selectedAuditId, isLoading, isError, isFetchingMore, hasMore, isFetchingMoreError, errorMessage, privateHistoryEnabled, onOpen, onRefresh, onLoadMore, onUnlockPrivate, onLockPrivate }: AuditHistoryPanelProps) {
  const [accessToken, setAccessToken] = useState('');
  const orderedAudits = sortAuditHistory(audits);

  return <section className="panel audit-history-panel" aria-labelledby="audit-history-title">
    <div className="panel-head">
      <div>
        <div className="panel-title" id="audit-history-title">Saved audit history</div>
        <div className="panel-subtitle">{privateHistoryEnabled ? 'Private session history' : 'Publicly readable history'} for {sourceId} · {audits.length} loaded</div>
      </div>
      <div className="panel-action">
        <button className="outline-btn" type="button" onClick={onRefresh} disabled={isLoading}>{isLoading ? 'Loading…' : 'Refresh history'}</button>
        {privateHistoryEnabled
          ? <button className="outline-btn" type="button" onClick={() => { setAccessToken(''); onLockPrivate(); }}>Lock private history</button>
          : <form className="audit-history-unlock" onSubmit={event => { event.preventDefault(); if (accessToken.trim()) { onUnlockPrivate(accessToken); setAccessToken(''); } }}><input type="password" autoComplete="off" value={accessToken} onChange={event => setAccessToken(event.target.value)} aria-label="Human reviewer token (session only)" placeholder="Reviewer token"/><button className="outline-btn" type="submit" disabled={!accessToken.trim()}>Unlock private history</button></form>}
      </div>
    </div>
    {privateHistoryEnabled
      ? <p className="audit-history-disclaimer">Private v3 drafts, quotations, and reviewer notes are visible with an authorized read token. The token remains in this page's memory only; it is not saved in the URL or browser storage. Lock the history when finished.</p>
      : <p className="audit-history-disclaimer">Public history includes legacy baseline reports and v3 reports only after human approval plus separate submitter and reviewer publication consent. Unpublished AI drafts stay hidden.</p>}
    {isLoading && <p className="audit-history-state" role="status">Loading saved audit revisions…</p>}
    {isError && orderedAudits.length === 0 && <div className="audit-history-state" role="alert"><span>{errorMessage || 'Audit history could not be loaded. Check the API connection and try again.'}</span><button className="outline-btn" type="button" onClick={onRefresh}>Retry</button></div>}
    {!isLoading && !isError && orderedAudits.length === 0 && <p className="audit-history-state">{privateHistoryEnabled ? 'No private audit revisions are saved for this source.' : 'No public audit revisions are available for this source. Private drafts may remain hidden until an authorized reviewer opens them.'}</p>}
    {orderedAudits.length > 0 && <ol className="audit-history-list">
      {orderedAudits.map(audit => {
        const snapshotId = audit.bundle.intelligence?.datasetSnapshotId || audit.bundle.provenance?.snapshotId;
        const generatedAt = new Date(audit.generatedAt);
        const timestamp = Number.isNaN(generatedAt.valueOf()) ? audit.generatedAt : `${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
        return <li key={audit.auditId}>
          <button className={`audit-history-entry${selectedAuditId === audit.auditId ? ' selected' : ''}`} type="button" aria-pressed={selectedAuditId === audit.auditId} onClick={() => onOpen(audit)}>
            <span className="audit-history-entry-top"><strong>Revision {audit.revision}</strong><span>{timestamp}</span></span>
            <span className="audit-history-entry-main"><span>Claim: {audit.claimType.replaceAll('_', ' ')}</span><span>Assessment: {assessmentPresentation(audit.bundle).resultLabel}</span></span>
            <span className="audit-history-entry-bottom"><span>{auditReviewLabel(audit)}{audit.bundle.schemaVersion === 3 ? ` · citations ${audit.bundle.intelligence?.citationPublication?.status === 'public' ? 'public' : 'private'}` : ''}</span><span>{audit.anchored ? 'Receipt anchored' : 'Not anchored'}</span></span>
            <span className="audit-history-digest" title={audit.bundleHash}>SHA-256 {audit.bundleHash.slice(0, 18)}…{snapshotId ? ` · Dataset ${snapshotId}` : ''}</span>
          </button>
        </li>;
      })}
    </ol>}
    {isFetchingMoreError && <div className="audit-history-state" role="alert">Older revisions could not be loaded. <button className="outline-btn" type="button" onClick={onLoadMore}>Retry</button></div>}
    {hasMore && <div className="case-pagination"><button className="outline-btn" type="button" onClick={onLoadMore} disabled={isFetchingMore}>{isFetchingMore ? 'Loading older revisions…' : 'Load older revisions'}</button></div>}
    {!isLoading && orderedAudits.length > 0 && <AuditRevisionComparison sourceId={sourceId} audits={orderedAudits} selectedAuditId={selectedAuditId} hasMore={hasMore}/>}
    <p className="audit-history-disclaimer">Opening a revision restores its saved report and citations. An assessment or hash does not prove physical methane mitigation; a chain receipt verifies digest integrity and chronology only.</p>
  </section>;
}
