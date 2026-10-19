import { useEffect, useRef, useState } from 'react';
import { evidenceUtcDay, AuditScope, type Evidence } from '@methane/shared';
import type { MarsObservation } from './mars';
import { observationPeriod, scopeDraftChanged, scopeDraftSchema } from './assessment-scope';
import { readSessionDraft, writeSessionDraft, clearSessionDraft } from './session-draft';

export default function AssessmentScopeEditor({ draftContext, scope, observations, evidence = [], historyUnavailable = false, onDraftChange, onChange }: { draftContext?: string; scope?: AuditScope; observations: Pick<MarsObservation, 'id' | 'date'>[]; evidence?: Evidence[]; historyUnavailable?: boolean; onDraftChange?: (pending: boolean) => void; onChange: (scope?: AuditScope) => boolean | void }) {
  const events = observations.length ? observations : evidence.filter(item => item.kind === 'detection' && item.date).map(item => ({ id: item.id, date: item.date! }));
  const recovered = useRef(draftContext ? readSessionDraft('scope', draftContext, scopeDraftSchema) : null);
  const [startDate, setStartDate] = useState(recovered.current?.startDate ?? scope?.startDate ?? '');
  const [endDate, setEndDate] = useState(recovered.current?.endDate ?? scope?.endDate ?? '');
  const [observationId, setObservationId] = useState(recovered.current?.observationId ?? scope?.observationId ?? '');
  const [recipient, setRecipient] = useState(recovered.current?.recipient ?? scope?.recipient ?? '');
  const [error, setError] = useState('');
  const [storageReady, setStorageReady] = useState(true);
  const period = observationPeriod(events);
  const dirty = scopeDraftChanged(scope, { startDate, endDate, observationId, recipient });
  useEffect(() => { onDraftChange?.(dirty); }, [dirty, onDraftChange]);
  useEffect(() => {
    if (!draftContext) return;
    if (dirty) setStorageReady(writeSessionDraft('scope', draftContext, scopeDraftSchema, { startDate, endDate, observationId, recipient }));
    else clearSessionDraft('scope', draftContext);
  }, [draftContext, dirty, startDate, endDate, observationId, recipient]);
  function reset() {
    if (onChange(undefined) === false) return;
    if (draftContext) clearSessionDraft('scope', draftContext);
    setStartDate(''); setEndDate(''); setObservationId(''); setRecipient(''); setError('');
  }
  function apply() {
    const parsed = AuditScope.safeParse({ startDate, endDate, ...(observationId ? { observationId } : {}), ...(recipient.trim() ? { recipient: recipient.trim() } : {}) });
    if (!parsed.success) { setError('Enter valid dates with the start on or before the end.'); return; }
    const observation = events.find(item => item.id === observationId);
    const day = evidenceUtcDay(observation?.date);
    if (observationId && (!day || day < startDate || day > endDate)) { setError('Choose an observation inside this period.'); return; }
    setError('');
    if (onChange(parsed.data) !== false && draftContext) clearSessionDraft('scope', draftContext);
  }
  return <section className="case-tool scope-editor" aria-label="Assessment scope">
    <h3>Event and assessment period</h3>
    <p>{scope ? `${scope.startDate} → ${scope.endDate}${scope.observationId ? ` · observation ${scope.observationId}` : ' · whole period'}` : 'Source-level baseline · no event or period bound. Apply a scope before recording a human determination.'}</p>
    <div className="case-tool-actions">
      <button type="button" className="outline-btn" disabled={!period || historyUnavailable} onClick={() => { if (!period) return; setStartDate(period.startDate); setEndDate(period.endDate); setObservationId(''); setError(''); }}>Use loaded observation period</button>
      <button type="button" className="outline-btn" disabled={!observationId || historyUnavailable} onClick={() => { const day = evidenceUtcDay(events.find(item => item.id === observationId)?.date); if (day) { setStartDate(day); setEndDate(day); setError(''); } }}>Use selected observation day</button>
    </div>
    <p>{historyUnavailable ? 'Load the complete source history before using a date preset.' : period ? `Loaded observation period: ${period.startDate} → ${period.endDate} UTC · ${period.count} dated records. This is not a repair or follow-up period.` : 'No valid dated observations are available for a preset.'}</p>
    <div className="case-tool-grid">
      <label>Period start<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
      <label>Period end<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
      <label>Observation event<select value={observationId} onChange={event => {
        const id = event.target.value; setObservationId(id);
        const observation = events.find(item => item.id === id);
        if (observation && !startDate && !endDate) { const day = evidenceUtcDay(observation.date); if (day) { setStartDate(day); setEndDate(day); } }
      }}><option value="">Whole period · no single observation</option>{events.map(item => <option key={item.id} value={item.id}>{evidenceUtcDay(item.date) || 'Invalid observation date'} · {item.id}</option>)}</select></label>
      <label>Intended notification recipient<input maxLength={160} value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Required for a notification determination" /></label>
    </div>
    <div className="case-tool-actions"><button type="button" className="outline-btn" onClick={apply}>Apply assessment scope</button><button type="button" className="outline-btn" disabled={!scope && !dirty} onClick={reset}>Use source-level baseline</button></div>
    {dirty && <p role="status" className="scope-draft-notice">Scope changes are not applied. Check the dates, then apply the scope before running the baseline.</p>}
    {dirty && draftContext && <small>{storageReady ? 'Unapplied scope drafts are kept in this tab for this investigation. Apply the scope to use it in an assessment.' : 'Tab storage is unavailable. Unapplied dates will be lost when you leave this page.'}</small>}
    {error && <p role="alert" className="inline-error">{error}</p>}
    <small>Dates are inclusive UTC calendar days. Timestamps without an offset are treated as UTC. Dates bound the evidence being assessed. Missing records remain unknown. A selected observation does not establish delivery or mitigation.</small>
  </section>;
}
