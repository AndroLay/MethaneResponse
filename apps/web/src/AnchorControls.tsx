import { useEffect, useRef, useState } from 'react';
import type { AuditResult } from '@methane/shared';
import { mergeAnchorResponse, type AnchorResponse } from './anchor-result';
import { anchorStateLabel, type AnchorIntentView, type AnchorTargetView, type ReconcileResponse } from './chain-client';
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export default function AnchorControls({ audit, onAnchored }: { audit: AuditResult; onAnchored: (audit: AuditResult) => void }) {
  const [token, setToken] = useState('');
  const [intent, setIntent] = useState<AnchorIntentView | null>(null);
  const [target, setTarget] = useState<AnchorTargetView | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  if (audit.bundle.schemaVersion === 4 || audit.bundle.intelligence?.reviewStatus === 'unreviewed') return null;
  async function request<T>(action: string, method = 'POST'): Promise<T> {
    const response = await fetch(`${base}/api/audits/${encodeURIComponent(audit.auditId)}/${action}`, {
      method, headers: { authorization: `Bearer ${token.trim()}`, ...(action === 'anchor' ? { 'content-type': 'application/json' } : {}) },
      ...(action === 'anchor' && target ? { body: JSON.stringify({ chainId: target.chainId, registryAddress: target.registryAddress, issuer: target.issuer }) } : {}), cache: 'no-store', signal: AbortSignal.timeout(45_000),
    });
    const payload = await response.json();
    if (!response.ok) throw Error(payload.error || 'Chain operation unavailable');
    return payload as T;
  }
  async function refresh() {
    if (alive.current) { setChecked(false); setTarget(null); }
    const value = await request<{ intent: AnchorIntentView | null; target: AnchorTargetView | null }>('anchor-status', 'GET');
    if (alive.current) { setIntent(value.intent); setTarget(value.target); setChecked(true); }
  }
  async function act(action: 'anchor' | 'reconcile' | 'status') {
    if (action === 'anchor' && (!target?.writeEnabled || !target.issuer || !checked)) return;
    if (action === 'anchor' && !window.confirm(`Submit one transaction on chain ${target!.chainId}?\nRegistry: ${target!.registryAddress}\nIssuer: ${target!.issuer}\nAudit: ${audit.auditId}\nBundle: ${audit.bundleHash}\nThis may spend test ETH.`)) return;
    setBusy(true); setError(null);
    try {
      if (action === 'status') { await refresh(); return; }
      if (action === 'anchor') {
        const payload = await request<AnchorResponse | { status: 'pending'; intent: AnchorIntentView }>('anchor');
        if (!alive.current) return;
        if ('status' in payload && payload.status === 'pending') setIntent(payload.intent);
        else onAnchored(mergeAnchorResponse(audit, payload as AnchorResponse));
      } else {
        const payload = await request<ReconcileResponse>('reconcile');
        if (!alive.current) return;
        if (payload.status === 'pending') setIntent(payload.intent);
        else if (payload.status === 'reconciled' || payload.status === 'already_reconciled') {
          onAnchored(mergeAnchorResponse(audit, { status: 'anchored', auditId: payload.auditId, bundleHash: payload.bundleHash ?? audit.bundleHash, receipt: payload.receipt }));
        }
      }
      await refresh();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Chain operation unavailable');
      // After an ambiguous response, fetch durable status only. Never repeat a write.
      if (action !== 'status') await refresh().catch(() => {});
    } finally { if (alive.current) setBusy(false); }
  }
  return <section aria-label="Authorized blockchain operations" className="anchor-operations">
    <h3>Authorized blockchain operations</h3>
    <p className="note-small">Use an operator or scoped anchor credential. It stays in this tab's memory. Reconciliation only reads the chain.</p>
    <label>Anchor access token<input type="password" autoComplete="off" value={token} disabled={busy} onChange={e => { setToken(e.target.value); setChecked(false); setTarget(null); setIntent(null); }} /></label>
    <div className="audit-actions">
      <button className="outline-btn" disabled={busy || !token.trim()} onClick={() => void act('status')}>Check saved transaction</button>
      <button className="outline-btn" disabled={busy || !token.trim() || !intent || intent.state !== 'pending'} onClick={() => void act('reconcile')}>Reconcile transaction</button>
      <button className="primary-btn" disabled={busy || !token.trim() || audit.anchored || intent?.state === 'pending' || !checked || !target?.writeEnabled || !target?.issuer} onClick={() => void act('anchor')}>Anchor current audit</button>
      <button className="text-link" disabled={busy || !token} onClick={() => { setToken(''); setIntent(null); setChecked(false); setTarget(null); setError(null); }}>Clear credential</button>
    </div>
    <p role="status">{busy ? 'Checking transaction…' : checked ? anchorStateLabel(intent?.state) : 'Saved transaction not checked'}</p>
    {checked && <p className="note-small">{target ? `Configured target: ${target.chainId === 11155111 ? 'Sepolia testnet' : 'Local development chain'} · ${target.registryAddress} · issuer ${target.issuer ?? 'not configured'} · ${target.confirmations} confirmation(s). ${target.writeEnabled ? 'Signing enabled.' : 'Signing disabled.'}` : 'Target unavailable or unconfigured. No new transaction can be submitted.'}</p>}
    {intent && <dl className="fact-list"><div><dt>Network</dt><dd>{intent.chainId === 11155111 ? 'Sepolia testnet' : 'Local development chain'}</dd></div><div><dt>Registry</dt><dd className="mono">{intent.registryAddress}</dd></div><div><dt>Transaction</dt><dd className="mono">{intent.txHash}</dd></div><div><dt>Confirmation policy</dt><dd>{intent.confirmations} block(s); check the receipt again for reorgs</dd></div></dl>}
    {error && <p role="alert" className="inline-error">{error}</p>}
  </section>;
}
