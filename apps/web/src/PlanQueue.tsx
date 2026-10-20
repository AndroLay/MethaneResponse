import { useState } from 'react';
import { plannerStrategyLabels, plannerDisposition } from '@methane/shared/investigation-planner';
import { clearActivePlan, type ActivePlan } from './plan-session';
import { dispositionLabels } from './investigation-planner';
import './investigation-planner.css';

export default function PlanQueue({ plan, onOpen, onEdit }: { plan: ActivePlan; onOpen: (id: string, target: 'case' | 'map' | 'audit') => void; onEdit?: () => void }) {
  const [requestedPage, setPage] = useState(1);
  const portfolio = plan.report.portfolios.find(p => p.strategy === plan.strategy)!;
  const rows = new Map(plan.report.input.candidates.map(row => [row.sourceId, row]));
  const pages = Math.max(1, Math.ceil(portfolio.selectedIds.length / 10)), page = Math.min(requestedPage, pages);
  return <section className="panel plan-queue" aria-label="Active investigation plan">
    <header><div><span className="planner-kicker">PLANNED INVESTIGATIONS · NOT ASSIGNMENTS</span><h2>{portfolio.selectedIds.length} sources in your active plan</h2><p>{plannerStrategyLabels[plan.strategy]} · capacity {plan.report.input.parameters.capacity} · {plan.report.input.dataset.datasetSnapshotId}</p></div><div className="plan-actions">{onEdit && <button type="button" className="outline-btn" onClick={onEdit}>Edit capacity & strategy</button>}<button type="button" className="outline-btn" onClick={clearActivePlan}>Clear active plan</button></div></header>
    <p className="planner-note">Cyan rings locate the same sources on the map. The queue is a proposed allocation; nothing is assigned or sent. Saving a reviewer decision is a separate step in the planner.</p>
    <ol start={(page - 1) * 10 + 1} className="plan-queue-list">{portfolio.selectedIds.slice((page - 1) * 10, page * 10).map(id => {
      const row = rows.get(id)!;
      return <li key={id}><div><strong>{id}</strong><span>{row.country || 'Country not reported'} · {row.sector || 'Sector not reported'}</span><small>{row.distinctDates} observed dates · {row.medianFluxKgHr === null ? 'Flux not reported' : `median ${row.medianFluxKgHr.toLocaleString('en-US')} kg/h`}</small><small>{dispositionLabels[plannerDisposition(plan.report, id, plan.strategy)]}</small></div><div className="plan-actions"><button type="button" onClick={() => onOpen(id, 'map')} aria-label={`Locate planned source ${id}`}>Map</button><button type="button" onClick={() => onOpen(id, 'audit')} aria-label={`Investigate planned source ${id}`}>Evidence →</button></div></li>;
    })}</ol>
    {!portfolio.selectedIds.length && <p>No eligible sources fit this plan. Adjust its scope or quotas.</p>}
    {pages > 1 && <div className="planner-pagination"><span>{portfolio.selectedIds.length} planned sources</span><div><button type="button" aria-label="Previous planned sources" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>{page} / {pages}</span><button type="button" aria-label="Next planned sources" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button></div></div>}
  </section>;
}
