import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assessmentPresentation, DEMO_SOURCES, InvestigationSelection, isAuditPublic } from '@methane/shared';
import type { AuditResult, AuditScope, ClaimType, ReviewSource } from '@methane/shared';
import type { MapDataLayer, MapProjection, MapTheme } from './MapPanel';
import { MapPanelErrorBoundary } from './MapPanelErrorBoundary';
import type { IntelligenceCapability } from './reviewer-capability';
import { auditHistoryQueryKey, isPrivateAuditHistoryQuery } from './audit-history';
import { addExportIntegrity, buildReportExportPayload } from './report-export';
import { loadVerifiedMarsSnapshot } from './mars-snapshot-loader';
import { DEFAULT_MAP_DATA_LAYER } from './map-layer-preferences';
import { getInitialMapFocusRequest, getSourceMapFocusView, type MapFocusRequest } from './map-focus';
import { formatCaseLocation } from './case-table';
import { getDataStatusIndicatorKind, getMapArchiveLabel, getMapBasemapDescription, getMapInteractionHint } from './map-surface-copy';
import { shouldActivateMapPanel, shouldLoadCompleteObservationHistory, shouldLoadSelectedSourceHistory } from './map-panel-load';
import { DEFAULT_WORKSPACE_PREFERENCES, getInitialWorkspace, readWorkspacePreferences, writeWorkspacePreferences, type WorkspacePreferences, type WorkspaceRoute } from './workspace-preferences';
import { filterObservationsToArchiveWindow, getMarsDashboardSummary, loadMarsFile, mergeCuratedCasebookEvidence, parseMarsGeoJSON, type MarsObservation, type MarsSnapshot, type MarsSource, type ObservationArchiveWindow } from './mars';
import { loadVerifiedObservationBucket, loadVerifiedProgressiveCatalog, type ProgressiveMarsManifest } from './progressive-mars-loader';
import type { MarsSnapshotManifest } from './mars-snapshot-integrity';
import DataDisclosureDialog from './DataDisclosureDialog';
const EvidenceAuditorWorkflow = lazy(() => import('./EvidenceAuditorWorkflow'));
import InvestigationJourney from './InvestigationJourney';
import AssessmentMeaning from './AssessmentMeaning';
import CaseWorkPanel from './CaseWorkPanel';
import { readCaseWork } from './case-work';
import { clearHumanDrafts, readSessionDraft, writeSessionDraft } from './session-draft';
import { confirmDraftNavigation } from './use-session-draft';
import { getActivePlan, matchingActivePlan, subscribeActivePlan } from './plan-session';
const PlanQueue = lazy(() => import('./PlanQueue'));

const MapPanel = lazy(() => import('./MapPanel'));
const AuditHistoryPanel = lazy(() => import('./AuditHistoryPanel'));
const ImportedAuditVerifier = lazy(() => import('./ImportedAuditVerifier'));
const CasesWorkspace = lazy(() => import('./CasesWorkspace'));
const AnchorControls = lazy(() => import('./AnchorControls'));
const TransparencyPanel = lazy(() => import('./TransparencyPanel'));
const CaseDetailsDialog = lazy(() => import('./CaseDetailsDialog'));
const OperatorsWorkspace = lazy(() => import('./OperatorsWorkspace'));
const SettingsWorkspace = lazy(() => import('./SettingsWorkspace'));
const MarsPublisherInsights = lazy(() => import('./MarsPublisherInsights'));

function WorkspaceLoading({ label }: { label: string }) {
  return <div className="map-loading lazy-workspace-loading" role="status" aria-live="polite">Loading {label}…</div>;
}

/*
 * The dashboard loads a versioned public MARS snapshot. Curated audit cases
 * remain separate from global source/plume metadata; synthetic fixtures are
 * available only as an explicitly labelled preview.
 */

type IconName = 'dashboard' | 'map' | 'briefcase' | 'sparkles' | 'file' | 'cube' | 'reports' | 'people' | 'settings' | 'search' | 'bell' | 'chevron' | 'arrow' | 'activity' | 'flame' | 'shield' | 'check' | 'clock' | 'info' | 'external' | 'download' | 'copy' | 'close' | 'filter' | 'calendar' | 'zoom' | 'pin' | 'layers' | 'play' | 'refresh' | 'target' | 'database' | 'eye' | 'link' | 'menu' | 'arrowRight' | 'minus' | 'plus' | 'warning';
const iconNodes: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.6"/><rect x="13" y="3" width="8" height="5" rx="1.6"/><rect x="13" y="10" width="8" height="11" rx="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.6"/></>,
  map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><path d="M9 3v15M15 6v15"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12c5 4 13 4 18 0"/></>,
  sparkles: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17z"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  cube: <><path d="m12 2 9 5-9 5-9-5 9-5zM3 7v10l9 5 9-5V7M12 12v10"/></>,
  reports: <><path d="M4 20V4h16v16H4zM8 15l3-3 3 2 3-5M8 8h4"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-3 3-5 6-5s6 2 6 5v2H3zM17 5a3 3 0 0 1 0 6M18 14c2 .5 3 2 3 5v1h-4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a2 2 0 0 0 .3 2.3l-2.4 2.4a2 2 0 0 0-2.3-.3 2 2 0 0 0-1.4 1.9h-3.3a2 2 0 0 0-1.4-1.9 2 2 0 0 0-2.3.3l-2.4-2.4a2 2 0 0 0 .3-2.3A2 2 0 0 0 2.6 13v-3a2 2 0 0 0 1.9-1.4 2 2 0 0 0-.3-2.3l2.4-2.4a2 2 0 0 0 2.3.3A2 2 0 0 0 10.3 2h3.3A2 2 0 0 0 15 3.9a2 2 0 0 0 2.3-.3l2.4 2.4a2 2 0 0 0-.3 2.3A2 2 0 0 0 21.3 10v3a2 2 0 0 0-1.9 2z"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>, arrow: <path d="m12 19 7-7-7-7M5 12h14"/>,
  activity: <><path d="M3 18V6M3 18h18M6 14l4-4 3 3 6-7"/></>,
  flame: <path d="M12 22c-4.5 0-7.5-3.3-7.5-7.5 0-3.4 2.4-6 4.3-8 .4 2.6 1.8 3.7 2.5 4.1 2.7-2 3.1-5.7 3.1-8.6 4.2 4.1 6.9 7.3 6.9 11.9 0 4.3-3 7.1-7.3 7.1z"/>,
  shield: <><path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="m8 12 2.5 2.5L16 9"/></>,
  check: <path d="m4 12 5 5L20 6"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  external: <><path d="M13 4h7v7M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  close: <path d="M5 5 19 19M19 5 5 19"/>,
  filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  zoom: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  play: <path d="m8 4 12 8-12 8V4z"/>, refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 10a8 8 0 0 1 14-3l1 5M4 12l1 5a8 8 0 0 0 14-3"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  plus: <path d="M12 4v16M4 12h16"/>, minus: <path d="M4 12h16"/>,
  warning: <><path d="M10.5 3.5a2 2 0 0 1 3 0L22 19a1.5 1.5 0 0 1-1.3 2H3.3A1.5 1.5 0 0 1 2 19L10.5 3.5z"/><path d="M12 9v5m0 3h.01"/></>,
};
function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconNodes[name]}</svg>;
}

const nav: { key: WorkspaceRoute; label: string; icon: IconName; target: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', target: 'top' },
  { key: 'map', label: 'Explore Map', icon: 'map', target: 'explorer' },
  { key: 'indicators', label: 'MARS Indicators', icon: 'reports', target: 'indicators' },
  { key: 'cases', label: 'Cases', icon: 'briefcase', target: 'case' },
  { key: 'audit', label: 'Evidence Auditor', icon: 'sparkles', target: 'auditor' },
  { key: 'documents', label: 'Documents', icon: 'file', target: 'documents' },
  { key: 'blockchain', label: 'Blockchain', icon: 'cube', target: 'blockchain' },
  { key: 'reports', label: 'Reports', icon: 'reports', target: 'reports' },
  { key: 'operators', label: 'Operators', icon: 'people', target: 'operators' },
  { key: 'settings', label: 'Settings', icon: 'settings', target: 'settings' },
];
const dateSeries = [2870, 2910, 2760, 2510, 2310, 2070, 1900, 1770, 1760, 1590, 1510, 1390];
const caseIds = ['DEMO-001', 'DEMO-002'];
const claimLabels: Record<ClaimType, string> = { source_detected: 'A methane source was detected', operator_notified: 'The source operator was notified', mitigation_confirmed: 'Mitigation confirmation claim' };
const claimDescriptions: Record<ClaimType, string> = { source_detected: 'Requires an identifiable observation record.', operator_notified: 'Requires actual evidence of notification, not an inference.', mitigation_confirmed: 'Requires explicit, attributable mitigation confirmation.' };

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const response = await fetch(`${base}/api${path}`, init);
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function fetchAuditHistory(sourceId: string, accessToken?: string, cursor?: string | null, signal?: AbortSignal): Promise<{ audits: AuditResult[]; nextCursor: string | null; hasMore: boolean }> {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const privateRead = Boolean(accessToken);
  const route = privateRead ? '/audits/history' : '/audits';
  const params = new URLSearchParams({ sourceId, limit: '50' });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${base}/api${route}?${params.toString()}`, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
    cache: privateRead ? 'no-store' : 'default',
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(response.status === 401
      ? 'Token akses riwayat privat tidak valid atau API belum mengonfigurasi token tersebut.'
      : payload.error || `Riwayat audit gagal dimuat (${response.status}).`);
  }
  return response.json() as Promise<{ audits: AuditResult[]; nextCursor: string | null; hasMore: boolean }>;
}

function rememberSelectedSource(sourceId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('sourceId', sourceId);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function Metric({ icon, label, value, change, variant }: { icon: IconName; label: string; value: string; change: string; variant: string }) {
  return <div className={`metric-card metric-${variant}`}><div className="metric-icon"><Icon name={icon} size={24}/></div><div className="metric-copy"><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-change">{change}</div></div></div>;
}

function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: IconName }) {
  return <div className="panel-head"><div><div className="panel-title">{icon && <Icon name={icon} size={15}/>} {title}</div>{subtitle && <div className="panel-subtitle">{subtitle}</div>}</div>{action && <div className="panel-action">{action}</div>}</div>;
}
function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'teal' | 'orange' | 'red' | 'blue' | 'violet' }) { return <span className={`chip chip-${tone}`}>{children}</span>; }

function PreviewModeNotice() {
  const { data } = useQuery({
    queryKey: ['preview-mode-notice'],
    queryFn: () => fetchApi<{ preview?: { enabled: boolean; auditState: string } }>('/health'),
    staleTime: Infinity,
    retry: false,
  });
  if (!data?.preview?.enabled) return null;
  return <div className="preview-banner" role="note">
    <Icon name="info" size={15}/>
    <span><strong>Free preview · historical data, temporary state.</strong> Audit records may disappear after idle sleep, restart or redeploy. Do not enter confidential material.</span>
  </div>;
}

function TrendChart({ range }: { range: string }) {
  const points = (range === '30 days' ? dateSeries.slice(6) : dateSeries).map((value, index, arr) => ({ x: 34 + index * 534 / Math.max(1, arr.length - 1), y: 22 + (3100 - value) * .061, value }));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${d} L568 232 L34 232 Z`;
  const [hover, setHover] = useState<number | null>(null);
  return <div className="chart-wrap"><svg className="trend-chart" viewBox="0 0 600 270" role="img" aria-label="Illustrative synthetic methane emission trend, not an actual observation">
    <defs><linearGradient id="chartfill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#1fe4d1" stopOpacity=".20"/><stop offset="1" stopColor="#1fe4d1" stopOpacity="0"/></linearGradient></defs>
    {[20,73,126,179,232].map((y,i) => <g key={y}><line x1="34" x2="572" y1={y} y2={y} stroke="#1c3744" strokeWidth="1"/><text x="0" y={y+4} fill="#637e91" fontSize="13">{4000 - i*1000}</text></g>)}
    {[34,140,246,352,458,568].map((x) => <line key={x} x1={x} x2={x} y1="20" y2="232" stroke="#17303f" strokeWidth="1"/>)}
    <path d={area} fill="url(#chartfill)"/><path d={d} fill="none" stroke="#29e5d1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={hover === i ? 6 : 4} fill="#25ead5" stroke="#05292d" strokeWidth="2"/><circle cx={p.x} cy={p.y} r="15" fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} /></g>)}
    {hover !== null && points[hover] && <g transform={`translate(${Math.max(40, Math.min(490, points[hover].x-40))},${Math.max(0, points[hover].y-55)})`}><rect width="99" height="33" rx="7" fill="#09232e" stroke="#20a79d"/><text fill="#ddfffc" fontSize="13" x="11" y="21">{points[hover].value.toLocaleString()} kg/h</text></g>}
    {['Nov','Dec','Jan','Feb','Mar','Apr'].map((m,i) => <text key={m} x={35+i*106} y="258" fill="#8193a9" fontSize="13">{m}</text>)}
  </svg><div className="chart-caption">SYNTHETIC SERIES · kg/h · for layout demonstration only</div></div>;
}

function ObservationChart({ source, historyLoading = false, historyError, onRetry }: { source: MarsSource; historyLoading?: boolean; historyError?: string; onRetry?: () => void }) {
  if (historyLoading) return <div className="empty-observations" role="status"><Icon name="database" size={22}/><strong>Verifying source history…</strong><span>Observation records are being loaded from the selected, versioned MARS snapshot.</span></div>;
  if (historyError) return <div className="empty-observations" role="alert"><Icon name="warning" size={22}/><strong>Source history could not be verified</strong><span>{historyError}</span>{onRetry && <button className="outline-btn" onClick={onRetry}>Retry history</button>}</div>;
  if (source.plumeCount && source.plumeCount > 0 && !source.observations) return <div className="empty-observations" role="status"><Icon name="database" size={22}/><strong>Source history is not loaded</strong><span>Open the case history to load its dated records from this snapshot.</span>{onRetry && <button className="outline-btn" onClick={onRetry}>Load source history</button>}</div>;
  const observations = [...(source.observations || [])].filter(o => o.fluxKgHr !== null && Number.isFinite(o.fluxKgHr)).sort((a,b) => a.date.localeCompare(b.date));
  if (!observations.length) return <div className="empty-observations"><Icon name="activity" size={22}/><strong>No quantified plume series</strong><span>No linked plume row has a usable flux value in the loaded snapshot. Missing values are not zero.</span></div>;
  const max = Math.max(...observations.map(o=>o.fluxKgHr!), 1);
  const minTime = Date.parse(observations[0].date) || 0;
  const maxTime = Date.parse(observations[observations.length-1].date) || minTime + 1;
  const xFor = (date:string, index:number) => 40 + (((Date.parse(date) - minTime) / (maxTime-minTime || 1)) || index/(observations.length || 1)) * 518;
  const yFor = (n:number) => 220 - n / max * 182;
  return <div className="chart-wrap"><svg className="trend-chart" viewBox="0 0 600 270" role="img" aria-label="Actual individual UNEP methane plume flux observations in kilograms per hour, not continuous emissions">
    {[0,1,2,3,4].map(i=><g key={i}><line x1="40" x2="565" y1={38+i*45.5} y2={38+i*45.5} stroke="#274555" strokeWidth="1"/><text x="1" y={43+i*45.5} fill="#7599a8" fontSize="12">{Math.round(max*(1-i/4)).toLocaleString()}</text></g>)}
    {observations.map((o,i)=><g key={o.id}><circle cx={xFor(o.date,i)} cy={yFor(o.fluxKgHr!)} r="4.3" fill="#20e9cb" stroke="#062c37" strokeWidth="1.4"><title>{`${o.date.slice(0,10)} — ${o.fluxKgHr?.toLocaleString()} kg/h${o.uncertaintyKgHr != null ? ` ±${o.uncertaintyKgHr}` : ''}`}</title></circle></g>)}
    <text x="40" y="257" fill="#89a7b5" fontSize="12">{observations[0].date.slice(0,10)}</text><text x="455" y="257" fill="#89a7b5" fontSize="12">{observations[observations.length-1].date.slice(0,10)}</text>
  </svg><div className="chart-caption">RECORDED MARS PLUME OBSERVATIONS · {observations.length} quantified of {source.observations?.length || 0} plume records · kg/h, not continuous monitoring</div></div>;
}

function AppLogo() { return <div className="brand"><div className="brand-symbol"><svg viewBox="0 0 38 38" fill="none"><circle cx="19" cy="19" r="14" stroke="#E9FFFA" strokeWidth="2.3" strokeDasharray="70 24" transform="rotate(-35 19 19)"/><path d="M8 26c6-12 16-17 25-19C28 17 20 29 8 26z" fill="#19E5C4"/><path d="M8 26c9-5 13-9 20-15" stroke="#062b34" strokeWidth="1.8" strokeLinecap="round"/></svg></div><span>Methane<span>Response</span></span></div>; }

export default function App() {
  const activePlanSelection = useSyncExternalStore(subscribeActivePlan, getActivePlan);
  const [workspacePreferences, setWorkspacePreferences] = useState<WorkspacePreferences>(() => readWorkspacePreferences());
  const [activeNav, setActiveNav] = useState(() => getInitialWorkspace(window.location.pathname, readWorkspacePreferences()));
  const [documentQuery, setDocumentQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('sourceId') || '');
  const [range, setRange] = useState<ObservationArchiveWindow>('All observations');
  const [mapRecordMode, setMapRecordMode] = useState<'sources' | 'plumes'>('sources');
  const [mapDataLayer, setMapDataLayer] = useState<MapDataLayer>(DEFAULT_MAP_DATA_LAYER);
  const [selectedUnlinked, setSelectedUnlinked] = useState<MarsObservation | null>(null);
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => workspacePreferences.mapTheme);
  const [mapGrayPercent, setMapGrayPercent] = useState(100);
  const [mapProjection, setMapProjection] = useState<MapProjection>('globe');
  const [mapRecoveryVersion, setMapRecoveryVersion] = useState(0);
  const [mapFocusRequest, setMapFocusRequest] = useState<MapFocusRequest | null>(() => getInitialMapFocusRequest(window.location.pathname, window.location.search));
  const mapFocusSequence = useRef(mapFocusRequest?.requestId ?? 0);
  const [mapPanelActivated, setMapPanelActivated] = useState(false);
  const mapPanelViewportRef = useRef<HTMLDivElement>(null);
  const [projectionNotice, setProjectionNotice] = useState<string | null>(null);
  const [globeSupported, setGlobeSupported] = useState(false);
  const [globeRuntimeFailed, setGlobeRuntimeFailed] = useState(false);
  const [expandedMap, setExpandedMap] = useState(false);
  const [snapshot, setSnapshot] = useState<MarsSnapshot | null>(null);
  const [progressiveManifest, setProgressiveManifest] = useState<ProgressiveMarsManifest | null>(null);
  const [snapshotManifest, setSnapshotManifest] = useState<MarsSnapshotManifest | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotHistory, setSnapshotHistory] = useState<Array<{snapshotId:string;retrievedAt:string;archiveSha256:string;sources:number;plumes:number;linkedPlumes:number;sourceIdMissingPlumes:number;unquantifiedPlumes?:number;observationDateRange:{start:string;end:string}}>>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlySelected, setOnlySelected] = useState(false);
  const [countryFilter, setCountryFilter] = useState('All regions');
  const [sectorFilter, setSectorFilter] = useState('All sectors');
  const [recoveredSelection] = useState(() => readSessionDraft('selection', new URLSearchParams(window.location.search).get('sourceId') || '', InvestigationSelection));
  const [claim, setClaim] = useState<ClaimType>('mitigation_confirmed');
  const [workSelection, setWorkSelection] = useState<{ context: string; workId: string } | null>(recoveredSelection ? { context: recoveredSelection.context, workId: recoveredSelection.workId } : null);
  const [scopeSelection, setScopeSelection] = useState<{ context: string; value?: AuditScope } | null>(recoveredSelection ? { context: recoveredSelection.context, value: recoveredSelection.scope } : null);
  const [savedAudit, setAudit] = useState<AuditResult | null>(null);
  const [auditSelectionGeneration, setAuditSelectionGeneration] = useState(0);
  const [auditHistoryAccessToken, setAuditHistoryAccessToken] = useState('');
  const [privateHistoryEnabled, setPrivateHistoryEnabled] = useState(false);
  const [privateHistorySession, setPrivateHistorySession] = useState(0);
  const [verificationRecord, setVerification] = useState<{ auditId: string; bundleHash: string; message: string } | null>(null);
  const [reportExportError, setReportExportError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const [showReport, setShowReport] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => workspacePreferences.sidebarCollapsed);
  const [preferencesSaveSucceeded, setPreferencesSaveSucceeded] = useState<boolean | null>(null);
  const [caseDialogSourceId, setCaseDialogSourceId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (mobileSearchOpen) ref.current?.querySelector('input')?.focus(); }, [mobileSearchOpen]);
  const manualDatasetChoice = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileNav]);

  useEffect(() => {
    const focusRequested = activeNav === 'map' && Boolean(mapFocusRequest);
    if (focusRequested) {
      mapPanelViewportRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
    if (mapPanelActivated) return;
    const element = mapPanelViewportRef.current;
    if (!element) return;

    const observerSupported = typeof IntersectionObserver !== 'undefined';
    if (shouldActivateMapPanel(false, observerSupported, focusRequested)) {
      setMapPanelActivated(true);
      return;
    }

    try {
      const observer = new IntersectionObserver(([entry]) => {
        if (shouldActivateMapPanel(Boolean(entry?.isIntersecting), observerSupported)) {
          setMapPanelActivated(true);
          observer.disconnect();
        }
      }, { rootMargin: '96px 0px' });
      observer.observe(element);
      return () => observer.disconnect();
    } catch {
      setMapPanelActivated(true);
    }
  }, [activeNav, mapPanelActivated, mapFocusRequest]);
  const { data, isError } = useQuery({ queryKey: ['review-sources', demoMode], queryFn: () => fetchApi<{ synthetic: boolean; sources: ReviewSource[] }>(`/sources${demoMode ? '?mode=demo' : ''}`), retry: 0 });
  const realMode = snapshot !== null || (!demoMode && data?.synthetic === false);
  const realDatasetLabel = snapshot ? 'UNEP MARS snapshot' : 'pinned UNEP MARS casebook';
  const caseSourceBadge = snapshot ? 'IMPORTED MARS SNAPSHOT' : realMode ? 'PINNED MARS CASE' : 'SYNTHETIC CASE';
  const catalogSources: MarsSource[] = useMemo(() => snapshot?.sources || data?.sources as MarsSource[] || DEMO_SOURCES, [snapshot, data?.sources]);
  const selectedCatalogSource = catalogSources.find(item => item.sourceId === selectedId) || catalogSources[0];
  const mapVisible = activeNav === 'dashboard' || activeNav === 'map';
  const needsCompleteMapHistory = shouldLoadCompleteObservationHistory(mapVisible, mapPanelActivated, mapRecordMode, mapDataLayer);
  const needsSelectedHistory = shouldLoadSelectedSourceHistory(activeNav, caseDialogSourceId !== null);
  const selectedBucketEntry = progressiveManifest?.buckets.find(item => item.id === selectedCatalogSource?.historyBucketId);
  const selectedHistoryQuery = useQuery({
    queryKey: ['mars-observation-bucket', snapshot?.snapshotId, selectedBucketEntry?.id, selectedBucketEntry?.decodedSha256],
    enabled: Boolean(progressiveManifest && snapshotManifest && selectedBucketEntry
      && selectedCatalogSource && Number(selectedCatalogSource.plumeCount) > 0
      && needsSelectedHistory && !needsCompleteMapHistory),
    queryFn: ({ signal }) => loadVerifiedObservationBucket(
      fetch, '/data', snapshotManifest!, progressiveManifest!, snapshot as unknown as import('./progressive-mars-loader').ProgressiveMarsCatalog,
      selectedBucketEntry!.id, signal,
    ),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  const completeHistoryQuery = useQuery({
    queryKey: ['mars-complete-history', snapshot?.snapshotId, progressiveManifest?.decodedContentSha256],
    enabled: Boolean(progressiveManifest && snapshotManifest && needsCompleteMapHistory),
    queryFn: async ({ signal }) => {
      const manifest = progressiveManifest!;
      const catalog = snapshot as unknown as import('./progressive-mars-loader').ProgressiveMarsCatalog;
      const buckets = manifest.buckets;
      const loaded = new Array<Awaited<ReturnType<typeof loadVerifiedObservationBucket>>>(buckets.length);
      const controller = new AbortController();
      const abortWithQuery = () => controller.abort(signal.reason);
      signal.addEventListener('abort', abortWithQuery, { once: true });
      if (signal.aborted) abortWithQuery();
      let nextIndex = 0;
      let failureFound = false;
      let firstFailure: unknown;
      const worker = async () => {
        while (!failureFound) {
          if (controller.signal.aborted) return;
          const index = nextIndex++;
          if (index >= buckets.length) return;
          const entry = buckets[index]!;
          try {
            loaded[index] = await queryClient.fetchQuery({
              queryKey: ['mars-observation-bucket', snapshot?.snapshotId, entry.id, entry.decodedSha256],
              queryFn: () => loadVerifiedObservationBucket(fetch, '/data', snapshotManifest!, manifest, catalog, entry.id, controller.signal),
              staleTime: Infinity,
              gcTime: 30 * 60 * 1000,
            });
          } catch (error) {
            failureFound = true;
            firstFailure = error;
            controller.abort(error);
            return;
          }
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(4, buckets.length) }, () => worker()));
      } finally {
        signal.removeEventListener('abort', abortWithQuery);
      }
      if (failureFound) throw firstFailure;
      if (signal.aborted || loaded.some(bucket => !bucket)) throw new DOMException('MARS history load was cancelled.', 'AbortError');
      const sourceHistories = new Map<string, MarsObservation[]>();
      const unlinkedObservations: MarsObservation[] = [];
      let linkedObservationCount = 0;
      for (const bucket of loaded) {
        for (const [sourceId, observations] of bucket!.sources) {
          if (sourceHistories.has(sourceId)) throw new Error(`MARS progressive data: duplicate source history ${sourceId}.`);
          sourceHistories.set(sourceId, observations);
          linkedObservationCount += observations.length;
        }
        unlinkedObservations.push(...bucket!.unlinkedObservations);
      }
      if (linkedObservationCount !== manifest.linkedObservationCount
        || unlinkedObservations.length !== manifest.unlinkedObservationCount
        || linkedObservationCount + unlinkedObservations.length !== manifest.plumeCount) {
        throw new Error('MARS progressive data: complete history totals do not match the pinned snapshot.');
      }
      return { sources: sourceHistories, unlinkedObservations, linkedObservationCount };
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  const sources: MarsSource[] = useMemo(() => {
    const hydrated = catalogSources.map(item => {
      const observations = completeHistoryQuery.data?.sources.get(item.sourceId)
        || selectedHistoryQuery.data?.sources.get(item.sourceId);
      if (observations) return { ...item, observations };
      if (progressiveManifest && Number(item.plumeCount) === 0) return { ...item, observations: [] };
      return item;
    });
    if (snapshot) return mergeCuratedCasebookEvidence(hydrated, data?.synthetic === false ? data.sources as MarsSource[] : []);
    return hydrated;
  }, [catalogSources, completeHistoryQuery.data, selectedHistoryQuery.data, progressiveManifest, snapshot, data?.sources, data?.synthetic]);
  const source: MarsSource = sources.find(s => s.sourceId === selectedId) || sources[0];
  const caseDialogSource = caseDialogSourceId ? sources.find(item => item.sourceId === caseDialogSourceId) || null : null;
  const selectedSourceHistoryAvailable = Boolean(source && (source.observations !== undefined
    || (progressiveManifest && Number(source.plumeCount) === 0)));
  const sourceHistoryLoading = Boolean(progressiveManifest && source && Number(source.plumeCount) > 0
    && !selectedSourceHistoryAvailable && (selectedHistoryQuery.isPending || completeHistoryQuery.isFetching));
  const sourceHistoryError = !selectedSourceHistoryAvailable
    ? (selectedHistoryQuery.error instanceof Error ? selectedHistoryQuery.error.message
      : completeHistoryQuery.error instanceof Error ? completeHistoryQuery.error.message : undefined)
    : undefined;
  const retrySourceHistory = () => {
    if (needsCompleteMapHistory) void completeHistoryQuery.refetch();
    else void selectedHistoryQuery.refetch();
  };
  const sourceLocation = formatCaseLocation(source);
  const sourceArchiveHash = (snapshot?.provenance?.archiveSha256 as string | undefined) || source.provenance?.archiveSha256;
  const sourceRetrievedAt = snapshot?.importedAt || source.provenance?.retrievedAt;
  const sourceLicense = snapshot?.license || source.provenance?.license;
  const sourceSnapshotId = snapshot?.snapshotId || source.provenance?.snapshotId;
  const sourceInputHash = typeof snapshot?.provenance?.webSnapshotInputSha256 === 'string' ? snapshot.provenance.webSnapshotInputSha256 : undefined;
  const activePlan = matchingActivePlan(activePlanSelection, sourceSnapshotId, sourceArchiveHash, sourceInputHash);
  const plannedSources = useMemo(() => {
    const byId = new Map(sources.map(s => [s.sourceId, s]));
    return activePlan?.report.portfolios.find(p => p.strategy === activePlan.strategy)?.selectedIds.flatMap(id => byId.get(id) ? [byId.get(id)!] : []) || [];
  }, [activePlan, sources]);
  const caseWorkContext = { sourceId: source.sourceId, datasetSnapshotId: source.synthetic ? 'DEMO' : sourceSnapshotId, archiveSha256: sourceArchiveHash, synthetic: source.synthetic };
  const caseWorkKey = JSON.stringify(caseWorkContext);
  const activeWorkId = workSelection?.context === caseWorkKey ? workSelection.workId : readCaseWork(caseWorkContext)?.workId || 'default';
  const workPanelContext = { ...caseWorkContext, workId: activeWorkId };
  // Do not accept edits against the temporary DEMO fallback while a real dataset loads.
  const investigationReady = demoMode ? source.synthetic : !snapshotLoading && !source.synthetic && Boolean(snapshot || data?.synthetic === false);
  const assessmentScope = scopeSelection?.context === caseWorkKey ? scopeSelection.value : undefined;
  const selectionRestored = useRef(false);
  useLayoutEffect(() => {
    if (!investigationReady || selectionRestored.current) return;
    selectionRestored.current = true;
    if (recoveredSelection?.context === caseWorkKey) setClaim(recoveredSelection.claimType);
  }, [investigationReady, caseWorkKey, recoveredSelection]);
  useEffect(() => {
    if (investigationReady) writeSessionDraft('selection', source.sourceId, InvestigationSelection, { context: caseWorkKey, sourceId: source.sourceId, claimType: claim, scope: assessmentScope, workId: activeWorkId });
  }, [investigationReady, caseWorkKey, claim, JSON.stringify(assessmentScope), activeWorkId]);
  const audit = savedAudit?.sourceId === source.sourceId && savedAudit.claimType === claim && savedAudit.synthetic === source.synthetic
    && JSON.stringify(savedAudit.bundle.scope) === JSON.stringify(assessmentScope) ? savedAudit : null;
  const verification = audit && verificationRecord?.auditId === audit.auditId && verificationRecord.bundleHash === audit.bundleHash ? verificationRecord.message : null;
  // A new context object also rejects A → B → A responses from the earlier visit.
  const contextKey = JSON.stringify([source.sourceId, activeWorkId, claim, assessmentScope, source.synthetic, sourceSnapshotId, sourceArchiveHash, snapshot?.provenance?.webSnapshotInputSha256, privateHistorySession, privateHistoryEnabled, auditSelectionGeneration]);
  const currentAssessmentContext = useMemo(() => ({ key: contextKey }), [contextKey]);
  const assessmentContext = useRef(currentAssessmentContext);
  const verificationTarget = useRef({ context: currentAssessmentContext, auditId: audit?.auditId, bundleHash: audit?.bundleHash });
  useLayoutEffect(() => {
    assessmentContext.current = currentAssessmentContext;
    verificationTarget.current = { context: currentAssessmentContext, auditId: audit?.auditId, bundleHash: audit?.bundleHash };
  }, [currentAssessmentContext, audit?.auditId, audit?.bundleHash]);
  const sourceCanBeAudited = Boolean(source && (source.synthetic || source.caseId || (snapshot && !source.synthetic)));
  const documentAssessmentAllowed = Boolean(source && !source.synthetic && source.caseId);
  const mapObservations = useMemo(() => {
    if (progressiveManifest && needsCompleteMapHistory && !completeHistoryQuery.data) return [];
    return [
    ...sources.flatMap(item => (item.observations || []).map(observation => ({
      ...observation,
      sourceId: observation.sourceId || item.sourceId,
      linkStatus: 'linked' as const,
      country: observation.country || item.country || item.region,
      sector: observation.sector || item.sector || null,
    }))),
    ...(completeHistoryQuery.data?.unlinkedObservations || snapshot?.unlinkedObservations || []),
  ];
  }, [sources, snapshot, progressiveManifest, needsCompleteMapHistory, completeHistoryQuery.data]);
  const latestObservationDate = useMemo(() => snapshot?.plumeObservationDateRange?.end
    || snapshot?.lastObserved?.slice(0, 10)
    || mapObservations.map(item => item.date.slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(-1)
    || null, [snapshot, mapObservations, progressiveManifest]);
  const filteredSources = useMemo(() => sources.filter(item => {
    if (countryFilter !== 'All regions' && (item.country || item.region) !== countryFilter) return false;
    if (sectorFilter !== 'All sectors' && item.sector !== sectorFilter) return false;
    if (range === 'All observations') return true;
    const dates = item.observationDates || item.observations?.map(observation => observation.date.slice(0, 10)) || [];
    return filterObservationsToArchiveWindow(dates.map(date => ({ date })), range, latestObservationDate).length > 0;
  }), [sources, countryFilter, sectorFilter, range, latestObservationDate]);
  const datasetSummary = useMemo(() => {
    if (!progressiveManifest || !snapshot) return getMarsDashboardSummary(sources, snapshot?.unlinkedObservations || []);
    const base = getMarsDashboardSummary(sources, []);
    return {
      ...base,
      sourceCount: progressiveManifest.sourceCount,
      linkedObservationCount: progressiveManifest.linkedObservationCount,
      unlinkedObservationCount: progressiveManifest.unlinkedObservationCount,
      observationCount: progressiveManifest.plumeCount,
      observationsByYear: progressiveManifest.observationsByYear,
    };
  }, [sources, snapshot, progressiveManifest]);
  const filteredMapObservations = useMemo(() => {
    const sourceById = new Map(sources.map(item => [item.sourceId, item]));
    const periodObservations = filterObservationsToArchiveWindow(mapObservations, range, latestObservationDate);
    return periodObservations.filter(item => {
      const sourceRecord = item.sourceId ? sourceById.get(item.sourceId) : undefined;
      const country = item.country || sourceRecord?.country || sourceRecord?.region;
      const sector = item.sector || sourceRecord?.sector;
      if (countryFilter !== 'All regions' && country !== countryFilter) return false;
      if (sectorFilter !== 'All sectors' && sector !== sectorFilter) return false;
      if (onlySelected && item.sourceId !== selectedId) return false;
      return true;
    });
  }, [mapObservations, sources, countryFilter, sectorFilter, range, latestObservationDate, onlySelected, selectedId]);
  const regions = [...new Set(sources.map(item => item.country || item.region).filter(Boolean))].sort();
  const sectors = [...new Set(sources.map(item => item.sector).filter((item): item is string => Boolean(item)))].sort();
  const intelligenceStatusQuery = useQuery({
    queryKey: ['intelligence-capability'],
    queryFn: () => fetchApi<IntelligenceCapability>('/intelligence/status'),
    staleTime: 30_000,
    retry: false,
  });
  const auditHistoryQuery = useInfiniteQuery({
    queryKey: auditHistoryQueryKey(source?.sourceId || '', privateHistoryEnabled, privateHistorySession),
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => fetchAuditHistory(source.sourceId, privateHistoryEnabled ? auditHistoryAccessToken : undefined, pageParam, signal),
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: Boolean(source?.sourceId && (activeNav === 'reports' || activeNav === 'blockchain')),
    retry: false,
    gcTime: 0,
  });
  const auditHistory = useMemo(() => auditHistoryQuery.data?.pages.flatMap(page => page.audits) || [], [auditHistoryQuery.data]);
  function unlockPrivateAuditHistory(token: string) {
    const cleaned = token.trim();
    if (!cleaned) return;
    void queryClient.cancelQueries({ predicate: isPrivateAuditHistoryQuery });
    queryClient.removeQueries({ predicate: isPrivateAuditHistoryQuery });
    setAuditHistoryAccessToken(cleaned);
    setPrivateHistorySession(previous => previous + 1);
    setPrivateHistoryEnabled(true);
  }
  function lockPrivateAuditHistory() {
    clearHumanDrafts();
    void queryClient.cancelQueries({ predicate: isPrivateAuditHistoryQuery });
    queryClient.removeQueries({ predicate: isPrivateAuditHistoryQuery });
    setPrivateHistoryEnabled(false);
    setAuditHistoryAccessToken('');
    const selectedIsPublic = savedAudit && isAuditPublic(savedAudit);
    setAuditSelectionGeneration(previous => previous + 1);
    if (savedAudit && !selectedIsPublic) {
      setAudit(null);
      setVerification(null);
    }
  }
  function setCurrentAudit(result: AuditResult, context: typeof currentAssessmentContext) {
    void queryClient.invalidateQueries({ queryKey: ['audit-history', result.sourceId] });
    if (context !== assessmentContext.current) return;
    if (result.sourceId !== source.sourceId || result.claimType !== claim || result.synthetic !== source.synthetic) return;
    setAudit(result);
    setVerification(null);
  }
  const auditMutation = useMutation({
    mutationFn: ({ sourceId, claimType, scope, datasetSnapshotId }: { sourceId: string; claimType: ClaimType; scope?: AuditScope; datasetSnapshotId?: string; context: typeof currentAssessmentContext }) => fetchApi<AuditResult>('/audits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, claimType, ...(scope ? { scope, datasetSnapshotId } : {}) }) }),
    onSuccess: (result, variables) => setCurrentAudit(result, variables.context),
  });
  const verifyMutation = useMutation({
    mutationFn: ({ auditId }: { auditId: string; bundleHash: string; context: typeof currentAssessmentContext }) => fetchApi<{ status: string; integrityVerified: boolean; localDigestValid: boolean }>('/audits/' + encodeURIComponent(auditId) + '/verify', auditHistoryAccessToken ? { headers: { authorization: `Bearer ${auditHistoryAccessToken}` } } : undefined),
    onSuccess: (response, request) => {
      const current = verificationTarget.current;
      if (request.context !== current.context || request.auditId !== current.auditId || request.bundleHash !== current.bundleHash) return;
      setVerification({ auditId: request.auditId, bundleHash: request.bundleHash, message: response.integrityVerified ? `On-chain receipt verified (${response.status})` : response.localDigestValid ? `Local SHA-256 valid · no on-chain verification (${response.status})` : `Local SHA-256 mismatch (${response.status})` });
    },
  });
  const currentVerificationPending = verifyMutation.isPending && verifyMutation.variables?.context === currentAssessmentContext
    && verifyMutation.variables.auditId === audit?.auditId && verifyMutation.variables.bundleHash === audit?.bundleHash;
  const sourceEvidence = source?.evidence || [];
  const displayedResults = useMemo(() => sources.filter(s => `${s.sourceId} ${s.name} ${s.region}`.toLowerCase().includes(search.toLowerCase())), [search, sources]);
  const warning = audit ? assessmentPresentation(audit.bundle).resultLabel : 'Insufficient reference coverage';
  const alertText = audit ? audit.reason : realMode ? 'Satellite detections alone cannot establish whether emissions have stopped. Run the deterministic coverage baseline to inspect the selected claim.' : 'No independent mitigation confirmation is present for this selected synthetic fixture. Run a baseline audit to check the evidence.';
  const verdictTone = audit?.result === 'supported' && audit.bundle.schemaVersion === 4 ? 'positive' : 'caution';
  const totalEvidence = sources.reduce((n,s) => n+s.evidence.length,0);
  const insights = sourceEvidence.filter(s => s.kind === 'mitigation_confirmation').length;
  const maxRecordedDate = snapshot?.lastObserved || sources.map(item => item.lastObserved || '').sort().at(-1) || undefined;
  useEffect(() => {
    if (!sources.length || snapshotLoading || sources.some(item => item.sourceId === selectedId)) return;
    const requestedSourceId = new URLSearchParams(window.location.search).get('sourceId');
    const nextSourceId = sources.find(item => item.sourceId === requestedSourceId)?.sourceId || sources[0].sourceId;
    setSelectedId(nextSourceId);
    rememberSelectedSource(nextSourceId);
  }, [sources, selectedId, snapshotLoading]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch('/data/mars-snapshot-history.json', { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('Snapshot history unavailable.');
      const history = await response.json() as {snapshots?: typeof snapshotHistory};
      if (!cancelled && Array.isArray(history.snapshots)) setSnapshotHistory(history.snapshots);
    }).catch(() => { if (!cancelled) setSnapshotHistory([]); });
    void (async () => {
      const manifestResponse = await fetch('/data/mars-snapshot-manifest.json', { cache: 'no-cache', signal: controller.signal });
      if (!manifestResponse.ok) throw new Error(`Snapshot manifest request failed (${manifestResponse.status}).`);
      const fullManifest = await manifestResponse.json() as MarsSnapshotManifest;
      if (!cancelled) setSnapshotManifest(fullManifest);
      let parsed: MarsSnapshot;
      try {
        const progressive = await loadVerifiedProgressiveCatalog(fetch, '/data', fullManifest, controller.signal);
        parsed = progressive.catalog;
        if (!cancelled) setProgressiveManifest(progressive.manifest);
      } catch (progressiveError) {
        if (controller.signal.aborted) throw progressiveError;
        const snapshotResponse = await fetch('/data/mars-snapshot.json.gz', { cache: 'no-cache', signal: controller.signal });
        if (!snapshotResponse.ok) throw new Error(`Progressive assets unavailable (${progressiveError instanceof Error ? progressiveError.message : 'verification failed'}); full snapshot request failed (${snapshotResponse.status}).`);
        parsed = await loadVerifiedMarsSnapshot(await snapshotResponse.arrayBuffer(), fullManifest, { signal: controller.signal });
        if (!cancelled) {
          setProgressiveManifest(null);
          setDatasetError(`Progressive history assets could not be verified; using the full, hash-verified snapshot fallback. ${progressiveError instanceof Error ? progressiveError.message : ''}`);
        }
      }
      return parsed;
    })().then(parsed => {
      if (cancelled || manualDatasetChoice.current) return;
      if (parsed.sources.length) {
        setSnapshot(parsed);
        const requestedSourceId = new URLSearchParams(window.location.search).get('sourceId');
        const preferredSourceId = parsed.sources.find(item => item.sourceId === requestedSourceId)?.sourceId
          || parsed.sources.find(item => item.sourceId === 'KAZ_S_159')?.sourceId
          || parsed.sources[0].sourceId;
        setSelectedId(preferredSourceId);
        rememberSelectedSource(preferredSourceId);
      }
    }).catch(error => {
      if (!cancelled && !manualDatasetChoice.current) setDatasetError(`Full MARS snapshot unavailable; the curated casebook remains available. ${error instanceof Error ? error.message : ''}`);
    }).finally(() => { if (!cancelled) setSnapshotLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, []);
  async function importDataset(file?: File) {
    if (!file) return;
    manualDatasetChoice.current = true;
    if (!confirmDraftNavigation()) return;
    setDatasetError(null);setImporting(true);
    try { const parsed = await loadMarsFile(file); setAuditSelectionGeneration(previous => previous + 1);setDemoMode(false);setProgressiveManifest(null);setSnapshotManifest(null);setSnapshot(parsed);setSelectedId(parsed.sources[0].sourceId);rememberSelectedSource(parsed.sources[0].sourceId);setAudit(null);setVerification(null);setSearch(''); }
    catch (error) { setDatasetError(error instanceof Error ? error.message : 'Unable to import dataset.'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function useDemo() { if (!confirmDraftNavigation()) return; manualDatasetChoice.current = true;setAuditSelectionGeneration(previous => previous + 1);setDemoMode(true);setProgressiveManifest(null);setSnapshotManifest(null);setSnapshot(null);setSelectedId('DEMO-001');rememberSelectedSource('DEMO-001');setAudit(null);setVerification(null);setSearch(''); }
  function useCasebook() { if (!confirmDraftNavigation()) return; manualDatasetChoice.current = true;setAuditSelectionGeneration(previous => previous + 1);setDemoMode(false);setProgressiveManifest(null);setSnapshotManifest(null);setSnapshot(null);setSelectedId('KAZ_S_159');rememberSelectedSource('KAZ_S_159');setAudit(null);setVerification(null);setSearch(''); }

  function updateWorkspacePreferences(next: WorkspacePreferences) {
    setWorkspacePreferences(next);
    setMapTheme(next.mapTheme);
    setSidebarCollapsed(next.sidebarCollapsed);
    setPreferencesSaveSucceeded(writeWorkspacePreferences(next));
  }

  function navigate(item: typeof nav[number], alreadyConfirmed = false) {
    if (!alreadyConfirmed && item.key !== activeNav && !confirmDraftNavigation()) return;
    setActiveNav(item.key); setMobileNav(false); setSearchFocused(false); setCaseDialogSourceId(null);
    const sourceId = new URLSearchParams(window.location.search).get('sourceId') || selectedId;
    const pathname = item.key === 'dashboard' ? '/dashboard' : `/dashboard/${item.key}`;
    const path = `${pathname}${sourceId ? `?sourceId=${encodeURIComponent(sourceId)}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, '', path);
    window.scrollTo({top:0,behavior:'auto'});
  }
  useEffect(() => {
    const onPop = () => {
      if (!confirmDraftNavigation()) { const path = activeNav === 'dashboard' ? '/dashboard' : `/dashboard/${activeNav}`; window.history.pushState({}, '', `${path}?sourceId=${encodeURIComponent(selectedId)}`); return; }
      const sourceId = new URLSearchParams(window.location.search).get('sourceId');
      if (sourceId) {
        setSelectedId(sourceId);
        const recovered = readSessionDraft('selection', sourceId, InvestigationSelection);
        const target = JSON.stringify({ ...caseWorkContext, sourceId });
        if (recovered?.context === target) { setClaim(recovered.claimType); setScopeSelection({ context: target, value: recovered.scope }); setWorkSelection({ context: target, workId: recovered.workId }); } else { setScopeSelection(null); setWorkSelection(null); }
      }
      setActiveNav(getInitialWorkspace(window.location.pathname, workspacePreferences));
    };
    window.addEventListener('popstate',onPop); return () => window.removeEventListener('popstate',onPop);
  }, [workspacePreferences, activeNav, selectedId, caseWorkKey]);

  function pickSource(id: string, preserveFilters = false) {
    if (!confirmDraftNavigation()) return false;
    setAuditSelectionGeneration(previous => previous + 1);
    setSelectedUnlinked(null);
    const targetKey = JSON.stringify({ ...caseWorkContext, sourceId: id });
    const recovered = readSessionDraft('selection', id, InvestigationSelection);
    if (recovered?.context === targetKey) { setClaim(recovered.claimType); setScopeSelection({ context: targetKey, value: recovered.scope }); setWorkSelection({ context: targetKey, workId: recovered.workId }); } else { setScopeSelection(null); setWorkSelection(null); }
    if (!preserveFilters) { setCountryFilter('All regions'); setSectorFilter('All sectors'); setRange('All observations'); }
    setSelectedId(id);rememberSelectedSource(id);setAudit(null); setVerification(null);  setSearchFocused(false); setSearch('');
    const url = new URL(window.location.href);
    if (url.searchParams.get('sourceId') !== id) {
      url.searchParams.set('sourceId', id);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    return true;
  }
  function openHistoricalAudit(item: AuditResult) { if (!confirmDraftNavigation()) return; setAuditSelectionGeneration(previous => previous + 1);setScopeSelection({ context: caseWorkKey, value: item.bundle.scope });setAudit(item);setClaim(item.claimType);setVerification(null); }
  function changeAssessmentScope(value?: AuditScope) { if (JSON.stringify(value) !== JSON.stringify(assessmentScope) && !confirmDraftNavigation()) return false; setScopeSelection({ context: caseWorkKey, value }); setAudit(null); setVerification(null); return true; }
  function resumeCaseWork(nextClaim: ClaimType, scope?: AuditScope, sourceId = source.sourceId, workId = 'default') {
    if (!confirmDraftNavigation()) return;
    setAuditSelectionGeneration(previous => previous + 1);
    setSelectedId(sourceId); rememberSelectedSource(sourceId);
    const context = JSON.stringify({ ...caseWorkContext, sourceId });
    setWorkSelection({ context, workId }); setClaim(nextClaim); setScopeSelection({ context, value: scope }); setAudit(null); setVerification(null);
    const url = new URL(window.location.href); url.searchParams.set('sourceId', sourceId); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    navigate(nav.find(item => item.key === 'audit')!, true);
  }

  async function exportReport(format: 'json' | 'markdown' = 'json') {
    setReportExportError(null);
    if (progressiveManifest && Number(source.plumeCount) > 0 && source.observations === undefined) {
      setReportExportError('Report export is paused until this source history has been verified from its pinned snapshot. Retry loading the case history first.');
      return;
    }
    try {
      const payload = buildReportExportPayload({ audit, claim, source, snapshot, sourceArchiveHash, realMode, generatedAt: new Date().toISOString() });
      const report = await addExportIntegrity(payload);
      const markdown = format === 'markdown';
      const contents = markdown ? (await import('./investigation-brief')).buildInvestigationBrief(report) : JSON.stringify(report, null, 2);
      const url = URL.createObjectURL(new Blob([contents], { type: markdown ? 'text/markdown;charset=utf-8' : 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `methane-response-${report.selectedSourceId.toLowerCase()}-${audit?.bundle.schemaVersion === 4 && !markdown ? 'PRIVATE-' : ''}${markdown ? 'investigation.md' : 'audit.json'}`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setReportExportError('Browser SHA-256 tidak tersedia; ekspor belum dibuat. Coba dari browser modern melalui HTTPS atau localhost.');
    }
  }
  async function copyHash() { if (!audit) return; try { await navigator.clipboard.writeText(audit.bundleHash); setCopied(true); setTimeout(()=>setCopied(false),1600); } catch { setCopied(false); } }
  useEffect(() => { const k = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (window.matchMedia('(max-width: 620px)').matches) setMobileSearchOpen(true); ref.current?.querySelector('input')?.focus(); } if(event.key==='Escape') { setShowReport(false); setSearchFocused(false); setMobileSearchOpen(false); if (window.matchMedia('(max-width: 620px)').matches && ref.current?.contains(document.activeElement)) requestAnimationFrame(()=>searchToggleRef.current?.focus()); setExpandedMap(false); } }; window.addEventListener('keydown',k);return () => window.removeEventListener('keydown',k); }, []);
  const local = (s: ReviewSource) => s.region.replace('Synthetic ', '');
  const sourcePlumes = filteredSources.reduce((count, item) => count + (item.plumeCount ?? item.observations?.length ?? 0), 0);
  const allLoadedPlumes = snapshot?.plumeCount ?? sourcePlumes;
  const unlinkedPlumes = progressiveManifest?.unlinkedObservationCount ?? snapshot?.unlinkedObservationCount ?? snapshot?.unlinkedObservations?.length ?? 0;
  const sourcesWithFeedback = filteredSources.filter(item => item.feedback?.toLowerCase() === 'yes').length;
  const observations = source.observations || [];
  const documentSources = useMemo(() => {
    const byId = new Map<string, MarsSource>();
    for (const item of [...(data?.sources || []), ...sources]) if (!byId.has(item.sourceId)) byId.set(item.sourceId, item);
    return Array.from(byId.values());
  }, [data?.sources, sources]);
  const allDocuments = useMemo(() => {
    // The full map snapshot has no report text. Pull link-only references from the curated API casebook too.
    return documentSources.flatMap(item => [
      ...(item.externalEvidence || []).map(e => ({ key: `${item.sourceId}-${e.url}`, title: e.title, kind: 'External report', date: e.reportDate || '', url: e.url, issuer: e.publisher || 'Publisher not specified', sourceId: item.sourceId, region: item.region, license: e.license })),
      ...item.evidence.slice(0, 4).map(e => ({ key: `${item.sourceId}-${e.id}`, title: e.title, kind: e.kind.replaceAll('_',' '), date: e.date || '', url: e.reference, issuer: realMode ? 'UNEP MARS observation metadata' : 'Synthetic demonstration', sourceId: item.sourceId, region: item.region, license: realMode ? (snapshot?.license || item.provenance?.license || 'Check source license') : 'Synthetic' })),
    ]);
  }, [documentSources, realMode, snapshot?.license]);
  const documentResults = allDocuments.filter(doc => `${doc.title} ${doc.sourceId} ${doc.kind} ${doc.issuer} ${doc.region}`.toLowerCase().includes(documentQuery.toLowerCase())).slice(0, 45);
  const currentDocument = documentResults.find(doc => doc.key === selectedDocument) || documentResults[0];
  const recentSources = [...filteredSources].filter(item => item.lastObserved).sort((a,b) => (b.lastObserved||'').localeCompare(a.lastObserved||'')).slice(0, 5);
  const pageInfo: Record<string, {eyebrow:string;title:string;description:string}> = {
    dashboard: {eyebrow:'CLIMATE INTELLIGENCE PLATFORM',title:'Global Methane Intelligence',description:'Explore satellite observations, investigate sources, and build traceable climate evidence.'},
    map: {eyebrow:'CLIMATE INTELLIGENCE / GEOSPATIAL',title:'Map Explorer',description:'Explore observed methane sources around the world with scientific context and provenance.'},
    indicators: {eyebrow:'CLIMATE INTELLIGENCE / UNEP MARS RELEASES',title:'Publisher Indicators',description:'Compare dated official MARS Top 50 releases and country response history with full source provenance.'},
    cases: {eyebrow:'CASE MANAGEMENT',title:'Cases & Investigations',description:'Explore source histories, inspect observations and organize evidence reviews.'},
    audit: {eyebrow:'CLIMATE INTELLIGENCE / EVIDENCE AUDITOR',title:'Evidence Auditor',description:'Examine a specific claim against source-linked evidence with human oversight.'},
    documents: {eyebrow:'CLIMATE INTELLIGENCE / DOCUMENTS',title:'Evidence Library',description:'Browse attributable environmental records and links without misrepresenting source material.'},
    blockchain: {eyebrow:'CLIMATE INTELLIGENCE / BLOCKCHAIN',title:'Verification Center',description:'Check bundle integrity, receipt history and the distinction between evidence and proof.'},
    reports: {eyebrow:'CLIMATE INTELLIGENCE / REPORTING',title:'Investigation Reports',description:'Prepare transparent source reports and export their supporting observations.'},
    operators: {eyebrow:'SOURCE RESPONSE RECORDS',title:'Operators',description:'Review the notification and feedback fields published with each MARS source record.'},
    settings: {eyebrow:'WORKSPACE CONFIGURATION',title:'Settings',description:'Choose how this browser opens and renders MethaneResponse workspaces.'},
  };
  const currentInfo = pageInfo[activeNav] || pageInfo.dashboard;
  const switchPage = (name: string, alreadyConfirmed = false) => navigate(nav.find(item => item.key === name) || nav[0], alreadyConfirmed);
  const openSourceInMap = (selectedSource: MarsSource) => {
    if (!getSourceMapFocusView(selectedSource)) return;
    if (!pickSource(selectedSource.sourceId)) return;
    setMapFocusRequest({ sourceId: selectedSource.sourceId, requestId: ++mapFocusSequence.current });
    switchPage('map', true);
  };
  const openCaseDialog = (selectedSource: MarsSource) => {
    if (!pickSource(selectedSource.sourceId)) return;
    setCaseDialogSourceId(selectedSource.sourceId);
  };
  const renderMap = () => <section id="explorer" className={`panel map-panel ${expandedMap ? 'expanded-map' : ''}`}>
    <CardHeader title="Global Methane Activity" icon="map" subtitle={realMode ? `UNEP MARS · ${realDatasetLabel} · historical snapshot` : 'Synthetic sample data · not live'} action={<div className="map-controls">
      <select className="map-style-selector" aria-label="Map records" value={mapRecordMode} onChange={e=>{setMapRecordMode(e.target.value as 'sources' | 'plumes');setSelectedUnlinked(null);}}><option value="sources">Source locations</option><option value="plumes">Historical plume records</option></select><select className="map-style-selector map-data-selector" aria-label="Methane data layer" value={mapDataLayer} onChange={e=>{const layer=e.target.value as MapDataLayer;setMapDataLayer(layer);if(layer==='plume-footprints')setMapRecordMode('plumes');}}><option value="source-density">Source location density</option><option value="observed-flux">Reported flux overlay</option><option value="plume-footprints">MARS plume geometry · selected month</option><option value="investigation-priority">Investigation priority</option></select><select className="map-style-selector" aria-label="Basemap" value={mapTheme} onChange={e => updateWorkspacePreferences({ ...workspacePreferences, mapTheme: e.target.value as MapTheme })}><option value="satellite">Satellite · natural color</option><option value="grayscale">Satellite · grayscale</option><option value="street">Streets</option><option value="dark">Dark map</option></select>
      <button className={`mini-btn projection-toggle ${mapProjection==='globe'?'projection-active':''}`} disabled={!globeSupported} onClick={()=>setMapProjection(p=>p==='globe'?'flat':'globe')} title="Switch 2D / 3D globe">{mapProjection === 'globe' ? '3D Globe' : 'Flat Map'}</button>
      <button className={`mini-btn ${filtersOpen?'mini-active':''}`} onClick={()=>setFiltersOpen(!filtersOpen)}><Icon name="layers" size={14}/> Layers & filters</button>
      <button className="mini-btn square" aria-label={expandedMap ? 'Exit enlarged map' : 'Enlarge map'} onClick={()=>setExpandedMap(!expandedMap)}><Icon name={expandedMap?'close':'zoom'} size={16}/></button>
    </div>}/>
    {projectionNotice && <div className="map-render-notice" role="status">{projectionNotice}<button onClick={()=>setProjectionNotice(null)}>Dismiss</button></div>}{selectedUnlinked && <div className="map-render-notice" role="status"><strong>{selectedUnlinked.id}</strong> · {selectedUnlinked.date} · {selectedUnlinked.fluxKgHr == null ? 'flux not provided' : `${selectedUnlinked.fluxKgHr.toLocaleString()} kg/h`} · source ID is missing in the MARS row; no source assignment was inferred.<button onClick={()=>setSelectedUnlinked(null)}>Dismiss</button></div>}
    <div ref={mapPanelViewportRef} className="real-world-map">{mapPanelActivated ? <MapPanelErrorBoundary><Suspense fallback={<div className="map-loading" role="status">Loading interactive globe…</div>}>
    <MapPanel key={mapRecoveryVersion} sources={filteredSources} plannedSources={plannedSources} sourcesReady={Boolean(snapshot || demoMode || (!snapshotLoading && (data || isError)))} observations={filteredMapObservations} recordMode={mapRecordMode} dataLayer={mapDataLayer} latestObservationDate={latestObservationDate} datasetSnapshotId={realMode && !demoMode ? sourceSnapshotId : null} sourceArchiveSha256={realMode && !demoMode ? sourceArchiveHash : null} selectedId={selectedId} focusRequest={mapFocusRequest} onFocusRequestHandled={requestId=>setMapFocusRequest(current=>current?.requestId===requestId?null:current)} onSelect={pickSource} onSelectUnlinked={plumeId=>setSelectedUnlinked(mapObservations.find(item=>item.id===plumeId)||null)} onProjectionFallback={()=>{setGlobeRuntimeFailed(true);setMapProjection('flat');setGlobeSupported(false);setProjectionNotice('Globe unavailable on this device; switched to 2D map.');setMapRecoveryVersion(v=>v+1);}} onGlobeSupportChange={supported=>{if(globeRuntimeFailed)return;setGlobeSupported(supported);}} theme={mapTheme} grayPercent={mapGrayPercent} projection={mapProjection} focusOnly={onlySelected} expanded={expandedMap} initialRenderPreference={workspacePreferences.earthQuality} onRenderPreferenceChange={earthQuality=>updateWorkspacePreferences({ ...workspacePreferences, earthQuality })}/>
    </Suspense></MapPanelErrorBoundary> : <div className="map-loading" role="status">Interactive globe loads when this map is in view…</div>}
    {progressiveManifest && needsCompleteMapHistory && completeHistoryQuery.isFetching && <div className="map-history-state" role="status" aria-live="polite"><Icon name="database" size={18}/><span><strong>Verifying complete historical layer</strong><small>Loading {progressiveManifest.plumeCount.toLocaleString()} dated records from {progressiveManifest.bucketCount} snapshot shards. No partial overlay is shown.</small></span></div>}
    {progressiveManifest && needsCompleteMapHistory && completeHistoryQuery.isError && !completeHistoryQuery.data && <div className="map-history-state map-history-error" role="alert"><Icon name="warning" size={18}/><span><strong>Historical map layer could not be verified</strong><small>{completeHistoryQuery.error instanceof Error ? completeHistoryQuery.error.message : 'A snapshot shard was unavailable or failed integrity checks.'}</small></span><button type="button" className="outline-btn" onClick={()=>void completeHistoryQuery.refetch()}>Retry complete history</button></div>}
    {filtersOpen && <div className="real-map-filter"><strong>Map filters</strong><label>Region<select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Sector<select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}><option>All sectors</option>{sectors.map(s=><option key={s}>{s}</option>)}</select></label><label><input type="checkbox" checked={onlySelected} onChange={e=>setOnlySelected(e.target.checked)}/> Only selected source</label><label>Observation period<select value={range} onChange={e=>setRange(e.target.value as ObservationArchiveWindow)}><option>All observations</option><option>1 year</option><option>30 days</option></select></label><small>Relative to archive end {latestObservationDate || 'unavailable'} UTC, not today.</small>{mapTheme==='grayscale' && <label>Grayscale {mapGrayPercent}%<input type="range" min="0" max="100" value={mapGrayPercent} onChange={e=>setMapGrayPercent(Number(e.target.value))}/></label>}<button className="text-link" onClick={()=>{setCountryFilter('All regions');setSectorFilter('All sectors');setRange('All observations');setOnlySelected(false);}}>Clear filters</button></div>}
    </div>
    <div className="map-data-footer" role="group" aria-label="Map data and controls">
      <span className="map-data-archive">{getMapArchiveLabel(!realMode, latestObservationDate)}</span>
      <span className="map-data-basemap">{getMapBasemapDescription(mapTheme)}</span>
      <span className="map-data-limits">{getMapInteractionHint(mapRecordMode)} · Glow represents record density, not methane concentration; observations are not continuous.</span>
    </div>
  </section>;
  return <div id="top" className={`app workspace-app current-${activeNav}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <a className="skip-to-main" href="#dashboard-main">Skip to main content</a>
    {mobileNav && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>}
    <aside id="workspace-sidebar" className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><a href="/" aria-label="MethaneResponse homepage"><AppLogo/></a><button className="sidebar-collapse icon-button" aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={()=>updateWorkspacePreferences({ ...workspacePreferences, sidebarCollapsed: !sidebarCollapsed })}><Icon name="chevron"/></button><button className="sidebar-close icon-button" aria-label="Close navigation" onClick={()=>setMobileNav(false)}><Icon name="close"/></button></div>
      <nav className="side-nav" aria-label="Main navigation">
        {nav.slice(0, 8).map(item=><button key={item.key} className={`nav-item ${activeNav===item.key?'active':''}`} aria-label={item.key === 'map' ? 'Map Explorer' : item.label} data-tooltip={item.key === 'map' ? 'Map Explorer' : item.label} aria-current={activeNav===item.key ? 'page' : undefined} title={item.key === 'map' ? 'Map Explorer' : item.label} onClick={()=>navigate(item)}><Icon name={item.icon} size={19}/><span>{item.key === 'map' ? 'Map Explorer' : item.label}</span>{activeNav===item.key && <span className="nav-active-mark"/>}</button>)}
        <div className="nav-separator"/>
        {nav.slice(8).map(item=><button key={item.key} className={`nav-item ${activeNav===item.key?'active':''}`} aria-label={item.label} data-tooltip={item.label} aria-current={activeNav===item.key ? 'page' : undefined} title={item.label} onClick={()=>navigate(item)}><Icon name={item.icon} size={19}/><span>{item.label}</span>{activeNav===item.key && <span className="nav-active-mark"/>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-data-status" title={realMode ? `Historical MARS archive · through ${latestObservationDate || 'date unavailable'} UTC` : 'Synthetic demonstration · not live'}><span className="sidebar-status-dot"/><span><strong>{realMode ? 'Historical MARS archive' : 'Synthetic demo data'}</strong><small>{realMode ? `Through ${latestObservationDate || 'date unavailable'} UTC` : 'DEMO · not live'}</small></span></div><div className="sidebar-credit"><span>RESEARCH PROTOTYPE</span><small>v0.3</small></div></div>
    </aside>
    <div className="app-main">
      <header className={`topbar${mobileSearchOpen ? ' mobile-search-open' : ''}`}><button className="mobile-menu icon-button" aria-label="Open navigation" aria-expanded={mobileNav} aria-controls="workspace-sidebar" onClick={()=>setMobileNav(true)}><Icon name="menu"/></button>
        <button type="button" ref={searchToggleRef} className="mobile-search-toggle icon-button" aria-label="Open source search" aria-expanded={mobileSearchOpen} aria-controls="header-source-search" onClick={()=>setMobileSearchOpen(true)}><Icon name="search" size={19}/></button>
        <div className="top-search" id="header-source-search" ref={ref}><Icon name="search" size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setSearchFocused(true);}} onFocus={()=>setSearchFocused(true)} placeholder="Search locations, cases, satellites, or evidence…" aria-label="Search methane sources"/><kbd>⌘ K</kbd><button type="button" className="mobile-search-close icon-button" aria-label="Close source search" onClick={()=>{setMobileSearchOpen(false);setSearchFocused(false);requestAnimationFrame(()=>searchToggleRef.current?.focus());}}><Icon name="close" size={18}/></button>{searchFocused && search.trim() && <div className="search-results">{displayedResults.slice(0,12).map(item=><button key={item.sourceId} onClick={()=>{if (!pickSource(item.sourceId)) return;setSearchFocused(false);setMobileSearchOpen(false);switchPage('cases', true);requestAnimationFrame(()=>document.getElementById('dashboard-main')?.focus({preventScroll:true}));}}><Icon name="pin" size={15}/><span><strong>{item.sourceId}</strong><small>{item.region} · {item.sector || 'Source'}</small></span></button>)}{!displayedResults.length && <div className="search-empty">No matching sources</div>}</div>}</div>
        <div className="top-actions"><span className="environment-status"><span className={`data-status-indicator ${getDataStatusIndicatorKind(realMode)}`} aria-hidden="true"/> {realMode?'UNEP SNAPSHOT · NOT LIVE':'SYNTHETIC PREVIEW'}</span><button className="icon-button notification" aria-label="Data and prototype information" onClick={()=>setShowNotice(true)}><Icon name="bell" size={19}/><i/></button><div className="top-sep"/><button className="account" onClick={()=>setShowNotice(true)}><span className="avatar">MR</span><span className="account-copy"><strong>Research Workspace</strong><small>Prototype · no sign-in</small></span><Icon name="chevron" size={13}/></button></div>
      </header>
      <main id="dashboard-main" tabIndex={-1} className="dashboard-content workspace-content">
        <PreviewModeNotice/>
        <section className="workspace-hero"><div className="hero-content"><div className="eyebrow"><span/> {currentInfo.eyebrow}</div><h1>{currentInfo.title}<span className="headline-accent">.</span></h1><p>{currentInfo.description}</p></div><div className="hero-actions">{activeNav==='dashboard' || activeNav==='reports'?<button className="outline-btn" disabled={activeNav==='reports'&&!audit} onClick={()=>void exportReport()}><Icon name="download" size={15}/> Export current report</button>:activeNav==='cases'||activeNav==='audit'?<button className="outline-btn" onClick={()=>switchPage('map')}><Icon name="map" size={15}/> Explore on map</button>:null}</div></section>
        {(['cases', 'audit', 'reports', 'blockchain'] as WorkspaceRoute[]).includes(activeNav) && <InvestigationJourney activeRoute={activeNav} sourceId={source.sourceId} audit={audit} verification={verification} onNavigate={route => { const item = nav.find(entry => entry.key === route); if (item) navigate(item); }}/>}
        {datasetError && <div role="alert" className="dataset-error">{datasetError}<button onClick={()=>setDatasetError(null)}>Dismiss</button></div>}
        {(activeNav==='dashboard'||activeNav==='map') && <div className="snapshot-bar"><span><Icon name="info" size={15}/><strong>{realMode?'Historical UNEP MARS data':'Synthetic demonstration'}</strong> · {datasetSummary.sourceCount.toLocaleString()} sources · {datasetSummary.observationCount.toLocaleString()} plume records ({datasetSummary.unlinkedObservationCount.toLocaleString()} without source ID) · {snapshot?.plumeObservationDateRange?.start||'date range unavailable'} to {snapshot?.plumeObservationDateRange?.end||maxRecordedDate?.slice(0,10)||'not reported'} · not live {snapshotLoading?'· loading pinned snapshot':''} · {sourceSnapshotId||'version not available'}</span><div className="dataset-actions"><input ref={fileRef} type="file" accept=".geojson,.json,application/json" hidden onChange={e=>void importDataset(e.target.files?.[0])}/><button className="dataset-btn" onClick={()=>fileRef.current?.click()} disabled={importing}><Icon name="database" size={14}/>{importing?'Importing…':'Import MARS GeoJSON'}</button><button className="dataset-demo-btn" onClick={realMode?useDemo:useCasebook}>{realMode?'Synthetic demo':'UNEP casebook'}</button></div></div>}
        {activeNav==='dashboard' && <>
          <div className="metrics-grid workspace-metrics"><Metric icon="pin" label={realMode?'Observed source records':'Sample source records'} value={datasetSummary.sourceCount.toLocaleString()} change={realMode?'versioned historical source rows':'synthetic fixtures'} variant="cyan"/><Metric icon="flame" label="Plume records in this snapshot" value={allLoadedPlumes.toLocaleString()} change={realMode?`${datasetSummary.linkedObservationCount.toLocaleString()} linked · ${unlinkedPlumes.toLocaleString()} unlinked`:'synthetic records'} variant="orange"/><Metric icon="database" label="Source feedback field = Yes" value={sourcesWithFeedback.toLocaleString()} change="source metadata; not proof of repair" variant="blue"/><Metric icon="shield" label="Independently verified mitigation" value="—" change="not assessed by this prototype" variant="green"/></div>
          <div className="main-grid dashboard-map-grid">{renderMap()}<section className="panel activity-panel"><CardHeader title="Latest recorded observations" subtitle="Historical, not real-time alerts" action={<button className="text-link" onClick={()=>switchPage('cases')}>View all <Icon name="arrowRight" size={14}/></button>}/><div className="activity-list">{recentSources.map((item,i)=><button className="activity-row" key={item.sourceId} onClick={()=>{if (!pickSource(item.sourceId)) return;switchPage('cases', true);}}><span className="activity-image orange"><Icon name="flame" size={18}/></span><span className="activity-copy"><strong>{item.sourceId}</strong><small>{item.region}</small></span><time>{item.lastObserved?.slice(0,10)}</time></button>)}</div><div className="activity-bottom"><span className={`data-status-indicator ${getDataStatusIndicatorKind(realMode)}`} aria-hidden="true"/> Source: {realMode?'UNEP MARS historical snapshot':'synthetic fixture'}</div></section></div>
          <div className="workspace-overview-grid"><section className="panel overview-card"><CardHeader title="Investigation Focus" subtitle="Selected case · evidence status" icon="target" action={<button className="text-link" onClick={()=>switchPage('cases')}>Explore case <Icon name="arrowRight" size={13}/></button>}/><div className="overview-feature"><div className="overview-ring" role="group" aria-label={`${source.evidence.length} evidence references`}><strong>{source.evidence.length}</strong><span>evidence links</span></div><div className="overview-key"><b>{source.sourceId}</b><span>{source.region}</span><span>{source.observations?.length ?? (source.plumeCount || 0)} snapshot observations</span><span>Mitigation: not independently assessed</span></div></div></section><section className="panel overview-card"><CardHeader title="Methane Flux Observations" subtitle="Selected source · observed kg/h" icon="activity" action={<button className="text-link" onClick={()=>switchPage('cases')}>Inspect data <Icon name="arrowRight" size={13}/></button>}/><ObservationChart source={source} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetry={retrySourceHistory}/></section><section className="panel overview-card"><CardHeader title="Evidence & Audit Status" subtitle="Evidence before assumptions" icon="shield" action={<button className="text-link" onClick={()=>switchPage('audit')}>Evidence Auditor <Icon name="arrowRight" size={13}/></button>}/><div className="overview-audit"><div className={`report-verdict ${verdictTone}`}>{audit?warning:'Awaiting review'}</div><p>{audit?.reason || 'No independent verification of physical mitigation has been performed for this source.'}</p><div className="overview-audit-stat"><span>Evidence references</span><strong>{source.evidence.length}</strong></div><div className="overview-audit-stat"><span>Public blockchain receipt</span><strong>{audit?.anchored?'Available':'Not anchored'}</strong></div></div></section></div>
          <div className="workspace-cta"><span><Icon name="info" size={17}/> Detailed evidence assessment, document sources and blockchain verification are organized in dedicated workspaces.</span><div><button onClick={()=>switchPage('audit')}>Evidence Auditor →</button><button onClick={()=>switchPage('blockchain')}>Blockchain →</button><button onClick={()=>switchPage('reports')}>Reports →</button></div></div>
        </>}
        {activeNav==='map' && <><div className="explorer-quickbar"><div><Icon name="layers" size={19}/><span><strong>Global Methane Activity</strong><small>{realMode?'UNEP satellite observation snapshot':'Synthetic example'}</small></span></div><label>Period <select value={range} onChange={e=>setRange(e.target.value as ObservationArchiveWindow)}><option>All observations</option><option>1 year</option><option>30 days</option></select></label><label>Region <select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(x=><option key={x}>{x}</option>)}</select></label><small>Recent windows end at the latest archive date ({latestObservationDate || 'unavailable'} UTC), not today.</small><button className="outline-btn" onClick={()=>void exportReport()}><Icon name="download" size={14}/> Export source</button></div><div className="explorer-layout">{renderMap()}<aside className="panel selected-source-card"><CardHeader title="Selected Source" icon="target"/><div className="selected-source-imagery-note"><span>REAL SOURCE LOCATION</span><strong>Satellite imagery is shown on the adjacent globe</strong><small>The map uses the selected source coordinates and current imagery tiles; this is location context, not a methane plume image.</small><button type="button" onClick={()=>openSourceInMap(source)}>Zoom to source on globe ↗</button></div><h2>{source.sourceId}</h2><p><Icon name="pin" size={13}/> {sourceLocation.area} · {sourceLocation.coordinates}</p><div className="fact-list"><div><span>Sector</span><strong>{source.sector||'Not reported'}</strong></div><div><span>Linked observations</span><strong>{source.plumeCount??source.observations?.length??0}</strong></div><div><span>Last observed</span><strong>{source.lastObserved?.slice(0,10)||'Not reported'}</strong></div><div><span>Maximum observed flux</span><strong>{source.maxFluxKgHr == null?'Not available':`${source.maxFluxKgHr.toLocaleString()} kg/h`}</strong></div><div><span>Mitigation</span><strong>Unverified by us</strong></div></div><button className="primary-btn" onClick={()=>openCaseDialog(source)}><Icon name="briefcase" size={15}/> View full case <Icon name="arrowRight" size={15}/></button><button className="outline-btn" onClick={()=>switchPage('audit')}><Icon name="shield" size={14}/> Examine evidence</button><p className="note-small">A satellite source location is not independent evidence of a repair.</p></aside></div></>}
        {activeNav==='indicators' && <Suspense fallback={<WorkspaceLoading label="verified MARS publisher releases"/>}><MarsPublisherInsights availableMapSourceIds={sources.map(item=>item.sourceId)} onOpenSource={sourceId=>{const match=sources.find(item=>item.sourceId===sourceId);if(match)openSourceInMap(match);}}/></Suspense>}
        {activePlan && (activeNav === 'map' || activeNav === 'cases') && <Suspense fallback={<WorkspaceLoading label="active investigation plan"/>}><PlanQueue plan={activePlan} onEdit={() => { if (!confirmDraftNavigation()) return; setCountryFilter(activePlan.report.input.parameters.countries[0] || 'All regions'); setSectorFilter(activePlan.report.input.parameters.sectors[0] || 'All sectors'); switchPage('cases', true); }} onOpen={(id, target) => {
          const chosen = sources.find(s => s.sourceId === id); if (!chosen) return;
          if (target === 'map') { openSourceInMap(chosen); return; }
          if (!pickSource(id)) return; switchPage(target === 'audit' ? 'audit' : 'cases', true);
        }}/></Suspense>}
        {activeNav==='cases' && <>
          <div className="workspace-mini-stats">
            <div><Icon name="briefcase"/><strong>{filteredSources.length.toLocaleString()}</strong><span>Source records</span></div>
            <div><Icon name="activity"/><strong>{sourcePlumes.toLocaleString()}</strong><span>Linked plume records</span></div>
            <div><Icon name="people"/><strong>{sourcesWithFeedback.toLocaleString()}</strong><span>Source feedback = Yes</span></div>
            <div><Icon name="shield"/><strong>—</strong><span>Mitigation verified by us</span></div>
          </div>
          <Suspense fallback={<WorkspaceLoading label="case table"/>}><CasesWorkspace
            sources={filteredSources}
            plannerSources={sources}
            selectedSourceId={selectedId}
            countryFilter={countryFilter}
            sectorFilter={sectorFilter}
            regions={regions}
            sectors={sectors}
            datasetLabel={realMode ? 'UNEP MARS historical snapshot' : 'Synthetic demonstration'}
            datasetSnapshotId={realMode && !demoMode ? sourceSnapshotId : undefined}
            archiveSha256={realMode && !demoMode ? sourceArchiveHash : undefined}
            inputFileSha256={realMode && !demoMode ? sourceInputHash : undefined}
            observationChart={caseSource => <ObservationChart source={caseSource} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetry={retrySourceHistory}/>}
            historyLoading={sourceHistoryLoading}
            historyError={sourceHistoryError}
            onRetryHistory={retrySourceHistory}
            onCountryFilterChange={setCountryFilter}
            onSectorFilterChange={setSectorFilter}
            onSelectSource={id => pickSource(id, true)}
            onOpenMap={openSourceInMap}
            onReviewEvidence={() => switchPage('audit')}
            onPlannerOpenSource={(sourceId, target) => {
              const chosen = sources.find(item => item.sourceId === sourceId); if (!chosen) return false;
              // One confirmed handoff: selection clears filters so directory and URL agree.
              if (target === 'map') { openSourceInMap(chosen); return; }
              if (!pickSource(sourceId)) return false;
              if (target === 'audit') switchPage('audit', true);
              return true;
            }}
            onResumeWork={resumeCaseWork}
          activeWork={{ sourceId: source.sourceId, workId: activeWorkId, claimType: claim, scope: assessmentScope }}
            workReady={investigationReady}
          /></Suspense>
        </>}
        {activeNav==='operators' && <Suspense fallback={<WorkspaceLoading label="operator workspace"/>}><OperatorsWorkspace sources={sources} datasetLabel={realMode ? 'UNEP MARS historical snapshot' : 'Synthetic demonstration'} onOpenCase={openCaseDialog} onReviewEvidence={selectedSource=>{if (!pickSource(selectedSource.sourceId)) return;switchPage('audit', true);}}/></Suspense>}
        {activeNav==='settings' && <Suspense fallback={<WorkspaceLoading label="settings"/>}><SettingsWorkspace preferences={workspacePreferences} saveSucceeded={preferencesSaveSucceeded} onChange={updateWorkspacePreferences} onReset={()=>updateWorkspacePreferences({ ...DEFAULT_WORKSPACE_PREFERENCES })}/></Suspense>}
        {activeNav === 'audit' && !investigationReady && (snapshotLoading || !data && !isError ? <WorkspaceLoading label="investigation dataset"/> : <section className="panel" role="status"><p>Investigation data is unavailable. Load a historical dataset or choose the explicit DEMO dataset to continue.</p></section>)}
        {activeNav === 'audit' && investigationReady && <Suspense fallback={<WorkspaceLoading label="investigation"/>}><EvidenceAuditorWorkflow
          draftContext={JSON.stringify([caseWorkContext, activeWorkId, claim, assessmentScope])}
          key={contextKey}
          source={source}
          sources={sources}
          onSelectSource={pickSource}
          observations={observations}
          realMode={realMode}
          sourceCanBeAudited={sourceCanBeAudited}
          sourceHistoryLoading={sourceHistoryLoading}
          sourceHistoryError={sourceHistoryError}
          retrySourceHistory={retrySourceHistory}
          datasetUrl={snapshot?.sourceUrl || 'https://methanedata.unep.org/download-dataset'}
          datasetSnapshotId={sourceSnapshotId}
          datasetInputSha256={typeof snapshot?.provenance?.webSnapshotInputSha256 === 'string' ? snapshot.provenance.webSnapshotInputSha256 : undefined}
          datasetRetrievedAt={sourceRetrievedAt}
          datasetLicense={sourceLicense}
          sourceArchiveHash={sourceArchiveHash}
          onOpenGlobe={() => openSourceInMap(source)}
          claim={claim}
          scope={assessmentScope}
          onScopeChange={changeAssessmentScope}
          claimLabels={claimLabels}
          claimDescriptions={claimDescriptions}
          onClaimChange={nextClaim => { if (!confirmDraftNavigation()) return; setClaim(nextClaim); setAudit(null); setVerification(null); }}
          audit={audit}
          auditWarning={warning}
          auditPending={auditMutation.isPending && auditMutation.variables?.context === currentAssessmentContext}
          auditError={auditMutation.isError && auditMutation.variables?.context === currentAssessmentContext ? 'Audit request failed. Confirm the source is in the pinned snapshot and check API availability.' : undefined}
          onRunAudit={() => auditMutation.mutate({ sourceId: source.sourceId, claimType: claim, scope: assessmentScope, datasetSnapshotId: source.synthetic ? 'DEMO' : sourceSnapshotId, context: currentAssessmentContext })}
          documentAssessmentAllowed={documentAssessmentAllowed}
          intelligenceCapability={intelligenceStatusQuery.data || null}
          capabilityLoading={intelligenceStatusQuery.isLoading}
          capabilityError={intelligenceStatusQuery.isError ? intelligenceStatusQuery.error instanceof Error ? intelligenceStatusQuery.error.message : 'Unknown status error' : undefined}
          onRetryCapability={() => void intelligenceStatusQuery.refetch()}
          onAssessment={result => setCurrentAudit(result, currentAssessmentContext)}
          onOpenDocuments={() => { setDocumentQuery(source.sourceId); switchPage('documents'); }}
          onOpenReports={() => switchPage('reports')}
          onOpenBlockchain={() => switchPage('blockchain')}
        /><CaseWorkPanel key={`${caseWorkKey}:${activeWorkId}`} context={workPanelContext} claimType={claim} scope={assessmentScope} onResume={resumeCaseWork}/></Suspense>}
        {activeNav==='documents' && <><div className="workspace-mini-stats docs-stats"><div><Icon name="file"/><strong>{allDocuments.filter(d=>d.kind==='External report').length}</strong><span>Curated report links</span></div><div><Icon name="database"/><strong>{allDocuments.filter(d=>d.kind==='detection').length}</strong><span>Curated detection citations</span></div><div><Icon name="flame"/><strong>{snapshot?.plumeCount?.toLocaleString()||'—'}</strong><span>Plume records in loaded snapshot</span></div><div><Icon name="shield"/><strong>0</strong><span>Independently reviewed reports</span></div></div><div className="documents-workspace"><section className="panel doc-library"><CardHeader title="Evidence Library" icon="file" subtitle="Historical metadata and source links" action={<button className="outline-btn" onClick={()=>switchPage('audit')}><Icon name="sparkles" size={14}/> Assess evidence</button>}/><div className="document-filters"><div className="doc-search"><Icon name="search" size={17}/><input placeholder="Search documents, sources or keywords…" value={documentQuery} onChange={e=>setDocumentQuery(e.target.value)}/></div><span>{documentResults.length} visible references</span></div><div className="document-grid"><button className="document-upload-card" onClick={()=>switchPage('audit')}><Icon name="file" size={35}/><strong>Evaluate document evidence</strong><span>Use the secure excerpt review workspace. No documents are uploaded by this library.</span><b>Open Evidence Auditor →</b></button>{documentResults.map((doc,index)=><button key={doc.key} className={`document-tile ${currentDocument?.key===doc.key?'selected':''}`} onClick={()=>setSelectedDocument(doc.key)}><div className={`document-tile-art doc-art-${index%4}`}><Icon name={doc.kind==='External report'?'file':'activity'} size={35}/><span>{doc.kind==='External report'?'LINK':'DATA'}</span></div><strong>{doc.title}</strong><span className="document-tags">{doc.sourceId} · {doc.kind}</span><small>{doc.date||'No date supplied'} · {doc.issuer}</small></button>)}</div></section><aside className="panel document-inspector"><CardHeader title="Document Preview" icon="eye"/><div className="document-inspector-art"><Icon name="file" size={64}/><span>REFERENCE PREVIEW</span></div>{currentDocument?<><h2>{currentDocument.title}</h2><Chip tone={currentDocument.kind==='External report'?'orange':'teal'}>{currentDocument.kind}</Chip><div className="fact-list"><div><span>Source</span><button onClick={()=>{if (!pickSource(currentDocument.sourceId)) return;switchPage('cases', true);}}>{currentDocument.sourceId} ↗</button></div><div><span>Issuer / reference</span><strong>{currentDocument.issuer}</strong></div><div><span>Date</span><strong>{currentDocument.date||'Not provided'}</strong></div><div><span>License</span><strong>{currentDocument.license||'Check official terms'}</strong></div></div><a href={currentDocument.url} target="_blank" rel="noopener noreferrer" className="primary-btn doc-open-link">Open source record <Icon name="external" size={15}/></a><p className="note-small">This is a linked record, not an embedded copy or a verified extraction of the full document.</p></>:<p>No matching records.</p>}</aside></div><section className="panel snapshot-history-panel"><CardHeader title="Dataset Snapshot History" icon="database" subtitle="Only releases downloaded and hashed by this project are listed; observation dates are not continuous coverage."/><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Retrieved</th><th>Snapshot ID</th><th>Archive SHA-256</th><th>Sources</th><th>Plume rows</th><th>Linked</th><th>Source ID missing</th><th>Observation dates</th></tr></thead><tbody>{snapshotHistory.map(item=><tr key={item.snapshotId}><td>{item.retrievedAt.slice(0,10)}</td><td>{item.snapshotId}</td><td><code className="mono" title={item.archiveSha256}>{item.archiveSha256.slice(0,12)}…</code></td><td>{item.sources.toLocaleString()}</td><td>{item.plumes.toLocaleString()}</td><td>{item.linkedPlumes.toLocaleString()}</td><td>{item.sourceIdMissingPlumes.toLocaleString()}</td><td>{item.observationDateRange.start} – {item.observationDateRange.end}</td></tr>)}</tbody></table></div>{!snapshotHistory.length&&<p className="note-small">Snapshot history metadata is unavailable in this build.</p>}<p className="note-small">The complete archive SHA-256 values are available in the <a href="/data/mars-snapshot-history.json" target="_blank" rel="noreferrer">full snapshot history JSON ↗</a>. Missing source IDs remain unlinked; this display does not infer a source or mitigation status.</p><div className="dataset-reference-links"><a href="https://methanedata.unep.org/download-dataset" target="_blank" rel="noreferrer">UNEP MARS dataset and terms ↗</a><a href="https://methanedata.unep.org/dict-mars-plumes" target="_blank" rel="noreferrer">MARS data dictionary ↗</a></div></section></>}
        {activeNav==='blockchain' && <><div className="workspace-mini-stats chain-stats"><div><Icon name="file"/><strong>{audit?1:0}</strong><span>Current audit bundles</span></div><div><Icon name="shield"/><strong>{audit?.anchored?'1':'0'}</strong><span>Anchored receipts</span></div><div><Icon name="check"/><strong>{verification?.startsWith('On-chain receipt verified')?'1':'0'}</strong><span>Verified on chain this session</span></div><div><Icon name="database"/><strong>{audit?.receipt?.chainId === 31337 ? 'Local chain' : 'Sepolia'}</strong><span>Optional test network</span></div></div><div className="blockchain-workspace"><section className="panel blockchain-main"><CardHeader title="Verification Center" subtitle="From attributed evidence to verifiable digest" icon="link"/><div className="chain-flow"><div><Icon name="layers" size={27}/><strong>Evidence bundle</strong><span>Claims, citations and provenance</span></div><b>→</b><div><Icon name="database" size={27}/><strong>SHA-256 digest</strong><span>Reproducible data integrity</span></div><b>→</b><div><Icon name="cube" size={27}/><strong>Chain transaction</strong><span>{audit?.receipt?.chainId === 31337 ? 'Authorized issuer on local chain' : 'Authorized issuer on Sepolia'}</span></div><b>→</b><div><Icon name="shield" size={27}/><strong>Receipt verification</strong><span>Compare issuer, version and event</span></div></div><CardHeader title="Audit receipt" subtitle="Current selected source" action={<button className="outline-btn" onClick={()=>switchPage('audit')}>New evidence audit →</button>}/><div className="chain-current"><span className="chain-current-icon"><Icon name="shield" size={25}/></span><div><strong>{audit?`Audit ${audit.auditId}`:'No receipt has been generated'}</strong><p>{audit?.reason||'Run a real evidence audit to create a versioned bundle. A public transaction is never simulated.'}</p><Chip tone={audit?.anchored?'teal':'orange'}>{audit?.anchored?'On-chain receipt recorded':'Not anchored'}</Chip></div></div><div className="fact-list"><div><span>Source</span><strong>{source.sourceId}</strong></div><div><span>Bundle SHA-256</span><strong className="mono">{audit?.bundleHash||'Not generated'}</strong></div><div><span>Audit revision</span><strong>{audit?.revision??'—'}</strong></div><div><span>Receipt version</span><strong>{audit?.receipt?.version??'—'}</strong></div><div><span>Transaction</span><strong className="mono">{audit?.chainTxHash||'No public transaction'}</strong></div></div><div className="audit-actions"><button className="outline-btn" disabled={!audit} onClick={copyHash}><Icon name="copy" size={15}/>{copied?'Copied':'Copy digest'}</button><button className="primary-btn" disabled={!audit||currentVerificationPending} onClick={()=>audit&&verifyMutation.mutate({ auditId: audit.auditId, bundleHash: audit.bundleHash, context: currentAssessmentContext })}><Icon name="shield" size={16}/>{currentVerificationPending?'Checking…':audit?.anchored?'Verify on-chain receipt':'Verify saved digest'}</button></div>{verification&&<p role="status" className="note-small">Verifier result: {verification}</p>}{audit && <Suspense fallback={<WorkspaceLoading label="chain operations"/>}><AnchorControls key={audit.auditId} audit={audit} onAnchored={result => setCurrentAudit(result, currentAssessmentContext)}/></Suspense>}{audit?.chainTxHash && audit.receipt?.chainId === 11155111 && <a className="chain-explorer-link" href={`https://sepolia.etherscan.io/tx/${audit.chainTxHash}`} target="_blank" rel="noreferrer">View public Sepolia transaction ↗</a>}</section><aside className="panel blockchain-aside"><CardHeader title="Receipt Details" icon="shield"/><div className="chain-receipt-badge"><Icon name={audit?.anchored?'check':'clock'} size={18}/>{audit?.anchored?(audit.receipt?.chainId === 31337 ? 'Recorded on local chain' : 'Recorded on Sepolia'):'Awaiting blockchain receipt'}</div><h2>{source.sourceId}</h2><p>Historical methane evidence case</p><div className="fact-list"><div><span>Network</span><strong>{audit?.receipt?.chainId === 31337 ? 'Local development chain' : 'Sepolia (testnet)'}</strong></div><div><span>Issuer</span><strong className="mono">{audit?.receipt?.issuer||'Not recorded'}</strong></div><div><span>Block</span><strong>{audit?.receipt?.blockNumber||'—'}</strong></div><div><span>Current verification</span><strong>{verification||'Not checked'}</strong></div></div><div className="workspace-timeline"><div><span className="timeline-node"/><time>Audit lifecycle</time><strong>{audit?'Bundle created':'No audit generated'}</strong><small>{audit?`Revision ${audit.revision}`:'Begin in Evidence Auditor'}</small></div>{audit?.anchored&&<div><span className="timeline-node"/><time>On-chain</time><strong>Receipt recorded</strong><small>Verify its integrity above</small></div>}</div><p className="note-small">Blockchain verifies the recorded digest and publisher metadata. It does not prove physical leak repair.</p></aside></div></>}
        {activeNav==='reports' && <><Suspense fallback={<WorkspaceLoading label="public transparency summaries"/>}><TransparencyPanel sourceId={source.sourceId}/></Suspense><div className="workspace-mini-stats report-stats"><div><Icon name="file"/><strong>{audit?1:0}</strong><span>Audit reports this session</span></div><div><Icon name="flame"/><strong>{sourcePlumes}</strong><span>Linked observations</span></div><div><Icon name="pin"/><strong>{filteredSources.length}</strong><span>Source locations</span></div><div><Icon name="shield"/><strong>—</strong><span>Independently verified mitigation</span></div></div><div className="reports-workspace"><div className="reports-left"><section className="panel report-summary-panel"><CardHeader title={audit?.bundle.schemaVersion === 4 ? "Private assessment summary" : "Executive Summary"} icon="reports" subtitle="Historical observations and audit evidence" action={<Chip tone={realMode?'teal':'orange'}>{realMode?'UNEP SNAPSHOT':'SYNTHETIC'}</Chip>}/><div className="report-summary-grid"><div><strong>{source.sourceId}</strong><span>Selected case</span></div><div><strong>{source.observations?.length ?? source.plumeCount ?? 0}</strong><span>Snapshot observations</span></div><div><strong>{source.evidence.length}</strong><span>Evidence references</span></div><div><strong>{audit ? assessmentPresentation(audit.bundle).resultLabel : 'Pending'}</strong><span>Assessment result</span></div></div><p>{audit?.reason||`The selected source appears in the ${realDatasetLabel}. Available metadata includes satellite detections and source-level status; it does not independently establish physical mitigation.`}</p>{audit && <AssessmentMeaning bundle={audit.bundle}/>}{audit?.bundle.schemaVersion === 3 && audit.bundle.intelligence?.reviewStatus === 'unreviewed' && <button className="outline-btn" onClick={()=>switchPage('audit')}>Continue human review <Icon name="arrowRight" size={14}/></button>}<button className="outline-btn" onClick={()=>switchPage('cases')}>Review selected case <Icon name="arrowRight" size={14}/></button></section><section className="panel"><CardHeader title="Observed Methane Flux" icon="activity" subtitle="Observed points in kg/h · not continuous"/><ObservationChart source={source} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetry={retrySourceHistory}/></section><section className="panel report-checklist"><CardHeader title="Evidence completeness" icon="shield"/><div><Icon name="check" size={16}/> Source identifier and location <strong>Available</strong></div><div><Icon name="check" size={16}/> Satellite observations <strong>{source.observations?.length ?? source.plumeCount ?? 0} snapshot records</strong></div><div><Icon name="file" size={16}/> External reports <strong>{source.externalEvidence?.length||0} links</strong></div><div><Icon name="warning" size={16}/> Independently verified mitigation <strong>Not established</strong></div><div><Icon name="cube" size={16}/> Blockchain anchoring <strong>{audit?.anchored?'Receipt exists':'Not anchored'}</strong></div></section></div><section className="panel report-preview-panel"><CardHeader title={audit?.bundle.schemaVersion === 4 ? "Private report preview" : "Report Preview"} icon="eye" subtitle="Current source · generated from available evidence"/>{audit?.bundle.schemaVersion === 4 && <p className="private-report-notice" role="note">Private assessment: this preview and the full JSON contain confidential reasoning and reference metadata. Share the redacted public summary above. The Markdown brief omits private assessment details.</p>}<div className="report-paper"><div className="paper-cover"><div className="paper-logo"><AppLogo/></div><span>RESEARCH PROTOTYPE · {new Date().getUTCFullYear()}</span><h2>Global Methane<br/>Intelligence Report</h2><p>Observations. Evidence. Action.</p><div className="paper-earth"/><div className="paper-cover-meta"><span>Case {source.sourceId}</span><span>Region: {source.region}</span><span>Status: {audit ? assessmentPresentation(audit.bundle).resultLabel : 'Not audited'}</span></div></div><div className="paper-summary"><h3>Evidence assessment</h3><p>{audit?.reason||'No independent evidence audit has been completed for this case.'}</p><div className="fact-list"><div><span>Source</span><strong>{source.sourceId}</strong></div><div><span>Evidence references</span><strong>{source.evidence.length}</strong></div><div><span>Mitigation proof</span><strong>Not certified</strong></div></div></div></div><div className="report-export-actions"><button className="primary-btn" disabled={!audit} onClick={()=>void exportReport()}><Icon name="download" size={16}/> Download JSON report{audit?.bundle.schemaVersion === 4 ? ' (private)' : ''}</button><button className="outline-btn" disabled={!audit} onClick={()=>void exportReport('markdown')}><Icon name="file" size={16}/> Download investigation brief</button><button className="outline-btn" onClick={()=>switchPage('blockchain')}>Check integrity →</button></div>{reportExportError&&<p role="alert" className="inline-error">{reportExportError}</p>}<p className="note-small">The full JSON preserves the saved audit, including private fields when present. Use the redacted public summary for public sharing, or review the Markdown brief before sharing or importing into Notion. The editable brief is not a signed document. PDF generation is not implemented.</p></section></div></>}
        {(activeNav==='reports' || activeNav==='blockchain') && <Suspense fallback={<WorkspaceLoading label="report verifier"/>}><ImportedAuditVerifier/></Suspense>}
        {(activeNav==='reports'||activeNav==='blockchain')&&<Suspense fallback={<WorkspaceLoading label="audit history"/>}><AuditHistoryPanel sourceId={source.sourceId} audits={auditHistory} selectedAuditId={audit?.auditId} isLoading={auditHistoryQuery.isLoading} isError={auditHistoryQuery.isError} isFetchingMore={auditHistoryQuery.isFetchingNextPage} hasMore={Boolean(auditHistoryQuery.hasNextPage)} isFetchingMoreError={auditHistoryQuery.isFetchNextPageError} errorMessage={auditHistoryQuery.error instanceof Error ? auditHistoryQuery.error.message : undefined} privateHistoryEnabled={privateHistoryEnabled} onOpen={openHistoricalAudit} onRefresh={()=>{void auditHistoryQuery.refetch();}} onLoadMore={()=>{void auditHistoryQuery.fetchNextPage();}} onUnlockPrivate={unlockPrivateAuditHistory} onLockPrivate={lockPrivateAuditHistory}/></Suspense>}
        <footer className="footer"><span>© 2026 MethaneResponse · Research prototype · Not affiliated with UNEP or IEEE</span><span>Historical observations ≠ confirmed mitigation <Icon name="shield" size={13}/></span></footer>
      </main>
    </div>
    {caseDialogSource && <Suspense fallback={<WorkspaceLoading label="case details"/>}><CaseDetailsDialog source={caseDialogSource} observationChart={caseDialogSource ? <ObservationChart source={caseDialogSource} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetry={retrySourceHistory}/> : null} onClose={()=>setCaseDialogSourceId(null)} onOpenMap={openSourceInMap} onReviewEvidence={()=>switchPage('audit')} datasetSnapshotId={realMode && !demoMode ? sourceSnapshotId : undefined} archiveSha256={realMode && !demoMode ? sourceArchiveHash : undefined} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetryHistory={retrySourceHistory}/> </Suspense>}
    <DataDisclosureDialog open={showNotice} onClose={()=>setShowNotice(false)}/>
  </div>;
}
