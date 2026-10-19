import { useEffect, useRef, useState } from 'react';
import { TransparencyRecord, WithdrawalReason, publicationReasonLabels, type TransparencyRecord as RecordType, type WithdrawalReason as Reason } from '@methane/shared';
import { downloadTransparencyRecord, fetchTransparencyRecord, verifyTransparencyRecord } from './transparency';
import { reviewerStatusLabel } from './AssessmentTrustPanel';

const api = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const statusLabel = { published: 'Published', superseded: 'Superseded', withdrawn: 'Withdrawn' };
type Selection = { auditId: string; version: number; revision: number };

export default function TransparencyPanel({ sourceId }: { sourceId: string }) {
  const [records, setRecords] = useState<RecordType[]>([]);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState('');
  const [imported, setImported] = useState<RecordType | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [reason, setReason] = useState<Reason>('consent_withdrawn');
  const [confirmed, setConfirmed] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);

  function begin() {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setError(''); setBusy(true); return request;
  }
  const usable = (request: AbortController) => active.current && !request.signal.aborted;
  function failure(request: AbortController, message: string) {
    if (usable(request)) { setError(message); setRecords([]); setNextCursor(null); setSelected(null); setCheckedAt(''); setVerification('Current publication status is unavailable. Refresh before sharing or changing publication.'); }
  }
  async function load(cursor?: string, replace = false) {
    const request = begin(); setSelected(null); setConfirmed(false);
    try {
      const response = await fetch(`${api}/api/transparency?sourceId=${encodeURIComponent(sourceId)}&limit=10&view=${history ? 'history' : 'current'}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error('Public summaries could not be loaded. Current publication status is unavailable.');
      const body = await response.json() as { summaries: unknown[]; nextCursor: string | null };
      const parsed = await Promise.all(body.summaries.map(async value => {
        const record = TransparencyRecord.parse(value);
        if (await verifyTransparencyRecord(record) !== 'valid' || !record.publication) throw new Error('Public summary verification failed.');
        return record;
      }));
      if (usable(request)) {
        setRecords(previous => [...new Map((replace ? parsed : [...previous, ...parsed]).map(record => [record.summary.auditId, record])).values()]);
        setNextCursor(body.nextCursor); setCheckedAt(new Date().toISOString());
      }
    } catch (reason) { failure(request, reason instanceof Error ? reason.message : 'Public summaries unavailable.'); }
    finally { if (usable(request)) setBusy(false); }
  }
  useEffect(() => {
    active.current = true; setRecords([]); setNextCursor(null); setVerification(''); setImported(null); setToken(''); setCheckedAt(''); void load(undefined, true);
    return () => { active.current = false; controller.current?.abort(); };
  }, [sourceId, refresh, history]);

  async function checkRecord(record: RecordType, download = false) {
    const request = begin(); setSelected(null);
    try {
      const current = await fetchTransparencyRecord(api, record.summary.auditId, request.signal);
      if (current.summaryHash !== record.summaryHash) throw new Error('Historical summary hash changed; no file was shared.');
      if (usable(request)) {
        setRecords(previous => previous.map(item => item.summary.auditId === current.summary.auditId ? current : item));
        setCheckedAt(new Date().toISOString());
        setVerification(`Current publication status: ${statusLabel[current.publication!.status]}. Checked now on this API; checksum covers historical summary bytes only.`);
        if (download) downloadTransparencyRecord(current);
      }
    } catch (reason) { failure(request, reason instanceof Error ? reason.message : 'Publication status unavailable.'); }
    finally { if (usable(request)) setBusy(false); }
  }
  async function withdraw() {
    if (!selected || !confirmed || !token.trim()) return;
    const target = selected; const request = begin();
    try {
      const response = await fetch(`${api}/api/transparency/${target.auditId}/withdraw`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token.trim()}` },
        body: JSON.stringify({ expectedVersion: target.version, reason }), signal: request.signal,
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'Withdrawal could not be confirmed. Refresh before retrying.');
      const record = TransparencyRecord.parse(value);
      if (await verifyTransparencyRecord(record) !== 'valid' || record.summary.auditId !== target.auditId || record.publication?.status !== 'withdrawn') throw new Error('Withdrawal response could not be verified. Refresh publication status.');
      if (usable(request)) {
        setVerification('Publication withdrawn. Historical checksums remain valid; downloaded copies cannot be recalled.');
        await load(undefined, true);
      }
    } catch (reason) { failure(request, reason instanceof Error ? reason.message : 'Withdrawal status unavailable.'); }
    finally { if (usable(request)) setBusy(false); }
  }

  return <section className="panel case-tool transparency-panel" aria-label="Public transparency summaries">
    <h3>Public transparency summaries</h3>
    <p>{sourceId} · explicit publication consent only. Private claim wording, identities, recipients, URLs and reasoning are excluded.</p>
    <label className="case-tool-check"><input type="checkbox" checked={history} disabled={busy} onChange={event => setHistory(event.target.checked)} />Show publication history</label>
    <button className="outline-btn" type="button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh public summaries</button>
    {busy && <p role="status">Checking public summaries and publication status…</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {checkedAt && <p className="note-small">Server-reported publication status checked {checkedAt}. Refresh for later changes; checksums cover historical summary bytes.</p>}
    {!busy && !error && !records.length && <p>No public summaries available for this source.</p>}
    <ol>{records.map(record => <li key={record.summary.auditId} data-audit-id={record.summary.auditId}>
      <h4>Revision {record.summary.revision} · Human determination: {record.summary.result.replaceAll('_', ' ')} {record.summary.synthetic ? '· DEMO' : ''}</h4>
      <p>Physical verification: not established by this application. This summary records a human determination; source inspection and conflict declarations are self-attested.</p>
      <p><strong>{record.publication ? statusLabel[record.publication.status] : 'Publication status not checked'}</strong>{record.publication && ` · ${publicationReasonLabels[record.publication.reason]}`}</p>
      {record.publication?.replacementAuditId && <p>Replacement public summary: <a href={`${api}/api/transparency/${record.publication.replacementAuditId}`} target="_blank" rel="noreferrer">View replacement status</a></p>}
      <p>{record.summary.claimType.replaceAll('_', ' ')} · {record.summary.period.startDate} → {record.summary.period.endDate}</p>
      <p>{reviewerStatusLabel[record.summary.reviewerStatus]} at assessment time. Conflict: {record.summary.conflictDeclaration.replaceAll('_', ' ')} (self-reported).</p>
      <p>{record.summary.referenceCount} registered references · {record.summary.citedReferenceCount} cited · {record.summary.referenceChecks.retrieved} publisher retrievals · {record.summary.referenceChecks.digestMatched} digest matches · {record.summary.referenceChecks.digestMismatched} mismatches · {record.summary.referenceChecks.unchecked} unchecked URLs.</p>
      <small>Summary checksum matches · integrity only. Assessment saved {record.summary.generatedAt}.</small><code>{record.summaryHash}</code>
      <div className="report-export-actions">
        <button className="outline-btn" type="button" disabled={busy} onClick={() => void checkRecord(record, true)}>Download summary revision {record.summary.revision}</button>
        <button className="outline-btn" type="button" disabled={busy} onClick={() => void checkRecord(record)}>Check current publication status</button>
        {record.publication?.status !== 'withdrawn' && <button className="outline-btn" type="button" disabled={busy || !record.publication} onClick={() => { setSelected({ auditId: record.summary.auditId, revision: record.summary.revision, version: record.publication!.version }); setConfirmed(false); }}>Withdraw publication</button>}
      </div>
      <a href={`${api}/api/transparency/${record.summary.auditId}`} target="_blank" rel="noreferrer">Public revision URL</a>
      <details><summary>Publication history</summary><ol>{record.publication?.history.map(event => <li key={event.version}>{statusLabel[event.status]} · {event.changedAt} · {publicationReasonLabels[event.reason]}</li>)}</ol></details>
      <details><summary>Disclosure and limitations</summary><ul>{record.summary.limitations.map(item => <li key={item}>{item}</li>)}</ul></details>
    </li>)}</ol>
    {nextCursor && <button className="outline-btn" type="button" disabled={busy} onClick={() => void load(nextCursor)}>Load older public summaries</button>}
    <details><summary>Reviewer publication controls</summary>
      <label>Publication reviewer token (session only)<input type="password" autoComplete="off" value={token} disabled={busy} onChange={event => { setToken(event.target.value); setSelected(null); setConfirmed(false); }} /></label>
      <button className="outline-btn" type="button" disabled={busy} onClick={() => { setToken(''); setSelected(null); setConfirmed(false); }}>Clear publication credential</button>
      <p className="note-small">Withdrawal requires current operator-attested review authority for this claim. This credential stays in component memory.</p>
    </details>
    {selected && <fieldset disabled={busy}><legend>Withdraw public summary revision {selected.revision}</legend>
      <p>Keep the historical record and mark this publication withdrawn. Previously downloaded copies and blockchain hashes cannot be removed.</p>
      <label>Withdrawal reason<select value={reason} onChange={event => setReason(event.target.value as Reason)}>{WithdrawalReason.options.map(value => <option key={value} value={value}>{publicationReasonLabels[value]}</option>)}</select></label>
      <label className="case-tool-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm withdrawing this public summary.</label>
      {!token.trim() && <p>Open Reviewer publication controls and enter an authorized reviewer token.</p>}
      <button className="outline-btn" type="button" disabled={!confirmed || !token.trim()} onClick={() => void withdraw()}>Confirm withdrawal</button>
      <button className="outline-btn" type="button" onClick={() => { setSelected(null); setConfirmed(false); }}>Cancel withdrawal</button>
    </fieldset>}
    <label>Verify a public summary JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={async event => {
      const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; setImported(null); if (!file) return;
      if (file.size > 262_144) { setVerification('Invalid: summary file exceeds 256 KiB.'); return; }
      try {
        const record = TransparencyRecord.parse(JSON.parse(await file.text())); const status = await verifyTransparencyRecord(record);
        if (active.current) { setVerification(status === 'valid' ? 'Summary checksum matches. This does not certify factual truth or issuer identity. Current publication status has not been checked.' : `Summary verification: ${status}.`); if (status === 'valid') setImported(record); }
      } catch { if (active.current) setVerification('Invalid summary JSON.'); }
    }} /></label>
    {imported && <button className="outline-btn" type="button" disabled={busy} onClick={() => void checkRecord(imported)}>Check imported summary publication status</button>}
    {verification && <p role="status">{verification}</p>}
    <p className="note-small">These are historical redacted determinations. Later private revisions may exist. Withdrawal records a status change and cannot erase downloaded copies. A digest detects changes; it does not establish authenticity, independence or mitigation.</p>
  </section>;
}
