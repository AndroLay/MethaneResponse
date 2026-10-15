import type { AuditResult } from '@methane/shared';
import type { WorkspaceRoute } from './workspace-preferences';

const stages: { route: WorkspaceRoute; label: string }[] = [
  { route: 'cases', label: 'Cases' },
  { route: 'audit', label: 'Evidence Auditor' },
  { route: 'reports', label: 'Reports' },
  { route: 'blockchain', label: 'Blockchain' },
];

type Props = {
  activeRoute: WorkspaceRoute;
  sourceId: string;
  audit: AuditResult | null;
  verification: string | null;
  onNavigate: (route: WorkspaceRoute) => void;
};

function stageStatus(route: WorkspaceRoute, audit: AuditResult | null, verification: string | null) {
  if (route === 'cases') return 'Source selected';
  if (route === 'audit') return audit ? 'Assessment available' : 'Assessment pending';
  if (route === 'reports') return audit ? 'Report can be exported' : 'Waiting for assessment';
  if (route === 'blockchain') return verification ? 'Check result available' : audit ? 'Digest ready · not checked' : 'Waiting for report';
  return '';
}

export default function InvestigationJourney({ activeRoute, sourceId, audit, verification, onNavigate }: Props) {
  const activeIndex = stages.findIndex(stage => stage.route === activeRoute);
  if (activeIndex < 0) return null;

  const next = stages[activeIndex + 1];
  const actionLabel = activeRoute === 'cases'
    ? 'Review selected source'
    : activeRoute === 'audit'
      ? 'Open report workspace'
      : activeRoute === 'reports'
        ? 'Check report integrity'
        : null;

  return <nav className="investigation-journey" aria-label="Investigation workflow">
    <div className="investigation-journey-heading"><div><strong>Investigation workflow</strong><small>Current case · {sourceId}</small></div>
      {next && actionLabel && <button type="button" className="journey-next" onClick={() => onNavigate(next.route)}>{actionLabel}<span aria-hidden="true"> →</span></button>}
    </div>
    <ol>{stages.map((stage, index) => <li key={stage.route}>
      <button type="button" aria-current={activeRoute === stage.route ? 'step' : undefined} onClick={() => onNavigate(stage.route)}>
        <span className="journey-step-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="journey-step-copy"><strong>{stage.label}</strong><small>{stageStatus(stage.route, audit, verification)}</small></span>
      </button>
    </li>)}</ol>
  </nav>;
}
