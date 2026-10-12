import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEMO_SOURCES } from '@methane/shared';
import type { AuditResult, ClaimType, ReviewSource } from '@methane/shared';
import type { MapDataLayer, MapProjection, MapTheme } from './MapPanel';
import AuditHistoryPanel from './AuditHistoryPanel';
import ImportedAuditVerifier from './ImportedAuditVerifier';
import { MapPanelErrorBoundary } from './MapPanelErrorBoundary';
import IntelligencePanel from './IntelligencePanel';
import type { IntelligenceCapability } from './reviewer-capability';
import { auditHistoryQueryKey, isPrivateAuditHistoryQuery } from './audit-history';
import { addExportIntegrity, buildReportExportPayload } from './report-export';
import { parseVerifiedMarsSnapshot } from './mars-snapshot-integrity';
import { DEFAULT_MAP_DATA_LAYER } from './map-layer-preferences';
import { shouldActivateMapPanel } from './map-panel-load';
import { filterObservationsToArchiveWindow, getMarsDashboardSummary, loadMarsFile, mergeCuratedCasebookEvidence, parseMarsGeoJSON, type MarsObservation, type MarsSnapshot, type MarsSource, type ObservationArchiveWindow } from './mars';

const MapPanel = lazy(() => import('./MapPanel'));

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

const nav: { key: string; label: string; icon: IconName; target: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', target: 'top' },
  { key: 'map', label: 'Explore Map', icon: 'map', target: 'explorer' },
  { key: 'cases', label: 'Cases', icon: 'briefcase', target: 'case' },
  { key: 'audit', label: 'Evidence Auditor', icon: 'sparkles', target: 'auditor' },
  { key: 'documents', label: 'Documents', icon: 'file', target: 'documents' },
  { key: 'blockchain', label: 'Blockchain', icon: 'cube', target: 'blockchain' },
  { key: 'reports', label: 'Reports', icon: 'reports', target: 'reports' },
];
const dateSeries = [2870, 2910, 2760, 2510, 2310, 2070, 1900, 1770, 1760, 1590, 1510, 1390];
const caseIds = ['DEMO-001', 'DEMO-002'];
const claimLabels: Record<ClaimType, string> = { source_detected: 'A methane source was detected', operator_notified: 'The source operator was notified', mitigation_confirmed: 'The detected methane release has been mitigated' };
const claimDescriptions: Record<ClaimType, string> = { source_detected: 'Requires an identifiable observation record.', operator_notified: 'Requires actual evidence of notification, not an inference.', mitigation_confirmed: 'Requires explicit, attributable mitigation confirmation.' };
const assets = '/assets/';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const response = await fetch(`${base}/api${path}`, init);
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function fetchAuditHistory(sourceId: string, accessToken?: string, signal?: AbortSignal): Promise<{ audits: AuditResult[] }> {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const privateRead = Boolean(accessToken);
  const route = privateRead ? '/audits/history' : '/audits';
  const response = await fetch(`${base}/api${route}?sourceId=${encodeURIComponent(sourceId)}`, {
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
  return response.json() as Promise<{ audits: AuditResult[] }>;
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

function ObservationChart({ source }: { source: MarsSource }) {
  const observations = [...(source.observations || [])].filter(o => o.fluxKgHr !== null && Number.isFinite(o.fluxKgHr)).sort((a,b) => a.date.localeCompare(b.date));
  if (!observations.length) return <div className="empty-observations"><Icon name="activity" size={22}/><strong>No quantified plume series</strong><span>UNEP source metadata is available, but no individual flux measurements were imported for this source.</span></div>;
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
  const [activeNav, setActiveNav] = useState(() => { const path = window.location.pathname.split('/')[2]; return nav.some(item=>item.key===path) ? path : 'dashboard'; });
  const [documentQuery, setDocumentQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('sourceId') || '');
  const [range, setRange] = useState<ObservationArchiveWindow>('All observations');
  const [mapRecordMode, setMapRecordMode] = useState<'sources' | 'plumes'>('sources');
  const [mapDataLayer, setMapDataLayer] = useState<MapDataLayer>(DEFAULT_MAP_DATA_LAYER);
  const [selectedUnlinked, setSelectedUnlinked] = useState<MarsObservation | null>(null);
  const [mapTheme, setMapTheme] = useState<MapTheme>('satellite');
  const [mapGrayPercent, setMapGrayPercent] = useState(100);
  const [mapProjection, setMapProjection] = useState<MapProjection>('globe');
  const [mapRecoveryVersion, setMapRecoveryVersion] = useState(0);
  const [mapPanelActivated, setMapPanelActivated] = useState(false);
  const mapPanelViewportRef = useRef<HTMLDivElement>(null);
  const [projectionNotice, setProjectionNotice] = useState<string | null>(null);
  const [globeSupported, setGlobeSupported] = useState(false);
  const [globeRuntimeFailed, setGlobeRuntimeFailed] = useState(false);
  const [expandedMap, setExpandedMap] = useState(false);
  const [snapshot, setSnapshot] = useState<MarsSnapshot | null>(null);
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
  const [claim, setClaim] = useState<ClaimType>('mitigation_confirmed');
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditHistoryAccessToken, setAuditHistoryAccessToken] = useState('');
  const [privateHistoryEnabled, setPrivateHistoryEnabled] = useState(false);
  const [privateHistorySession, setPrivateHistorySession] = useState(0);
  const [verification, setVerification] = useState<string | null>(null);
  const [reportExportError, setReportExportError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [caseLimit, setCaseLimit] = useState(200);
  const [caseTab, setCaseTab] = useState('Overview');
  const [docIndex, setDocIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const manualDatasetChoice = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (mapPanelActivated) return;
    const element = mapPanelViewportRef.current;
    if (!element) return;

    const observerSupported = typeof IntersectionObserver !== 'undefined';
    if (shouldActivateMapPanel(false, observerSupported)) {
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
  }, [activeNav, mapPanelActivated]);
  const { data, isError } = useQuery({ queryKey: ['review-sources', demoMode], queryFn: () => fetchApi<{ synthetic: boolean; sources: ReviewSource[] }>(`/sources${demoMode ? '?mode=demo' : ''}`), retry: 0 });
  const realMode = snapshot !== null || (!demoMode && data?.synthetic === false);
  const realDatasetLabel = snapshot ? 'UNEP MARS snapshot' : 'pinned UNEP MARS casebook';
  const caseSourceBadge = snapshot ? 'IMPORTED MARS SNAPSHOT' : realMode ? 'PINNED MARS CASE' : 'SYNTHETIC CASE';
  const sources: MarsSource[] = useMemo(() => {
    if (snapshot) return mergeCuratedCasebookEvidence(snapshot.sources, data?.synthetic === false ? data.sources as MarsSource[] : []);
    return data?.sources as MarsSource[] || DEMO_SOURCES;
  }, [snapshot, data?.sources, data?.synthetic]);
  const source: MarsSource = sources.find(s => s.sourceId === selectedId) || sources[0];
  const sourceArchiveHash = (snapshot?.provenance?.archiveSha256 as string | undefined) || source.provenance?.archiveSha256;
  const sourceRetrievedAt = snapshot?.importedAt || source.provenance?.retrievedAt;
  const sourceLicense = snapshot?.license || source.provenance?.license;
  const sourceSnapshotId = snapshot?.snapshotId || source.provenance?.snapshotId;
  const sourceCanBeAudited = Boolean(source && (source.synthetic || source.caseId));
  const documentAssessmentAllowed = Boolean(source && !source.synthetic && source.caseId);
  const mapObservations = useMemo(() => [
    ...sources.flatMap(item => (item.observations || []).map(observation => ({
      ...observation,
      sourceId: observation.sourceId || item.sourceId,
      linkStatus: 'linked' as const,
      country: observation.country || item.country || item.region,
      sector: observation.sector || item.sector || null,
    }))),
    ...(snapshot?.unlinkedObservations || []),
  ], [sources, snapshot]);
  const latestObservationDate = useMemo(() => snapshot?.plumeObservationDateRange?.end
    || snapshot?.lastObserved?.slice(0, 10)
    || mapObservations.map(item => item.date.slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().at(-1)
    || null, [snapshot, mapObservations]);
  const filteredSources = useMemo(() => sources.filter(item => {
    if (countryFilter !== 'All regions' && (item.country || item.region) !== countryFilter) return false;
    if (sectorFilter !== 'All sectors' && item.sector !== sectorFilter) return false;
    if (range === 'All observations' || !item.observations?.length) return true;
    return filterObservationsToArchiveWindow(item.observations, range, latestObservationDate).length > 0;
  }), [sources, countryFilter, sectorFilter, range, latestObservationDate]);
  const caseSearchSources = useMemo(() => filteredSources.filter(item => !search.trim() || `${item.sourceId} ${item.name} ${item.region} ${item.sector || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [filteredSources, search]);
  const visibleCaseSources = caseSearchSources.slice(0, caseLimit);
  const datasetSummary = useMemo(() => getMarsDashboardSummary(sources, snapshot?.unlinkedObservations || []), [sources, snapshot]);
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
  const auditHistoryQuery = useQuery({
    queryKey: auditHistoryQueryKey(source?.sourceId || '', privateHistoryEnabled, privateHistorySession),
    queryFn: ({ signal }) => fetchAuditHistory(source.sourceId, privateHistoryEnabled ? auditHistoryAccessToken : undefined, signal),
    enabled: Boolean(source?.sourceId && (activeNav === 'reports' || activeNav === 'blockchain')),
    retry: false,
    gcTime: 0,
  });
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
    void queryClient.cancelQueries({ predicate: isPrivateAuditHistoryQuery });
    queryClient.removeQueries({ predicate: isPrivateAuditHistoryQuery });
    setPrivateHistoryEnabled(false);
    setAuditHistoryAccessToken('');
    const selectedIsPublic = audit && (audit.bundle.schemaVersion !== 3 || (
      audit.bundle.intelligence?.reviewStatus === 'approved'
      && audit.bundle.intelligence?.citationPublication?.status === 'public'
      && audit.bundle.intelligence?.citationPublication?.authorConsent === true
    ));
    if (audit?.bundle.schemaVersion === 3 && !selectedIsPublic) {
      setAudit(null);
      setVerification(null);
    }
  }
  function setCurrentAudit(result: AuditResult) {
    setAudit(result);
    setVerification(null);
    void queryClient.invalidateQueries({ queryKey: ['audit-history', result.sourceId] });
  }
  const auditMutation = useMutation({
    mutationFn: ({ sourceId, claimType }: { sourceId: string; claimType: ClaimType }) => fetchApi<AuditResult>('/audits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, claimType }) }),
    onSuccess: setCurrentAudit,
  });
  const verifyMutation = useMutation({ mutationFn: (id: string) => fetchApi<{ status: string; integrityVerified: boolean; localDigestValid: boolean }>('/audits/' + encodeURIComponent(id) + '/verify'), onSuccess: response => setVerification(response.integrityVerified ? `On-chain receipt verified (${response.status})` : response.localDigestValid ? `Local SHA-256 valid · no on-chain verification (${response.status})` : `Local SHA-256 mismatch (${response.status})`) });
  const sourceEvidence = source?.evidence || [];
  const activeDoc = sourceEvidence[docIndex % Math.max(1, sourceEvidence.length)];
  const displayedResults = useMemo(() => sources.filter(s => `${s.sourceId} ${s.name} ${s.region}`.toLowerCase().includes(search.toLowerCase())), [search, sources]);
  const warning = audit?.bundle.schemaVersion === 3 ? audit.bundle.intelligence?.reviewStatus === 'unreviewed' ? 'AI suggestion · unreviewed' : audit.bundle.intelligence?.reviewStatus === 'approved' ? 'Document review accepted' : audit.bundle.intelligence?.reviewStatus === 'needs_more_evidence' ? 'Additional evidence requested' : 'Document review rejected' : audit?.result === 'contradicted' ? 'Contradicted' : audit?.result === 'supported' ? 'Supported' : 'Insufficient evidence';
  const alertText = audit ? audit.reason : realMode ? 'Satellite detections alone cannot establish whether emissions have stopped. Run the deterministic coverage baseline to inspect the selected claim.' : 'No independent mitigation confirmation is present for this selected synthetic fixture. Run a baseline audit to check the evidence.';
  const verdictTone = audit?.result === 'supported' ? 'positive' : 'caution';
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
    fetch('/data/mars-snapshot-history.json', { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('Snapshot history unavailable.');
      const history = await response.json() as {snapshots?: typeof snapshotHistory};
      if (!cancelled && Array.isArray(history.snapshots)) setSnapshotHistory(history.snapshots);
    }).catch(() => { if (!cancelled) setSnapshotHistory([]); });
    Promise.all([
      fetch('/data/mars-snapshot.json.gz', { cache: 'no-cache' }),
      fetch('/data/mars-snapshot-manifest.json', { cache: 'no-cache' }),
    ]).then(async ([snapshotResponse, manifestResponse]) => {
      if (!snapshotResponse.ok) throw new Error(`Snapshot request failed (${snapshotResponse.status}).`);
      if (!manifestResponse.ok) throw new Error(`Snapshot manifest request failed (${manifestResponse.status}).`);
      return parseVerifiedMarsSnapshot(await snapshotResponse.arrayBuffer(), await manifestResponse.json());
    }).then(parsed => {
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
    return () => { cancelled = true; };
  }, []);
  async function importDataset(file?: File) {
    if (!file) return;
    manualDatasetChoice.current = true;
    setDatasetError(null);setImporting(true);
    try { const parsed = await loadMarsFile(file); setDemoMode(false);setSnapshot(parsed);setSelectedId(parsed.sources[0].sourceId);rememberSelectedSource(parsed.sources[0].sourceId);setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }
    catch (error) { setDatasetError(error instanceof Error ? error.message : 'Unable to import dataset.'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function useDemo() { manualDatasetChoice.current = true;setDemoMode(true);setSnapshot(null);setSelectedId('DEMO-001');rememberSelectedSource('DEMO-001');setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }
  function useCasebook() { manualDatasetChoice.current = true;setDemoMode(false);setSnapshot(null);setSelectedId('KAZ_S_159');rememberSelectedSource('KAZ_S_159');setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }

  function navigate(item: typeof nav[number]) {
    setActiveNav(item.key); setMobileNav(false); setSearchFocused(false);
    const sourceId = new URLSearchParams(window.location.search).get('sourceId') || selectedId;
    const pathname = item.key === 'dashboard' ? '/dashboard' : `/dashboard/${item.key}`;
    const path = `${pathname}${sourceId ? `?sourceId=${encodeURIComponent(sourceId)}` : ''}`;
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, '', path);
    window.scrollTo({top:0,behavior:'auto'});
  }
  useEffect(() => {
    const onPop = () => {
      const page = window.location.pathname.split('/')[2] || 'dashboard';
      const sourceId = new URLSearchParams(window.location.search).get('sourceId');
      if (sourceId) setSelectedId(sourceId);
      setActiveNav(nav.some(item=>item.key===page)?page:'dashboard');
    };
    window.addEventListener('popstate',onPop); return () => window.removeEventListener('popstate',onPop);
  }, []);

  function pickSource(id: string) { setSelectedUnlinked(null);setCountryFilter('All regions'); setSectorFilter('All sectors'); setRange('All observations'); setSelectedId(id);rememberSelectedSource(id);setAudit(null); setVerification(null); setDocIndex(0); setSearchFocused(false); setSearch(''); }
  function openHistoricalAudit(item: AuditResult) { setAudit(item);setClaim(item.claimType);setVerification(null); }
  async function exportReport() {
    setReportExportError(null);
    try {
      const payload = buildReportExportPayload({ audit, claim, source, snapshot, sourceArchiveHash, realMode, generatedAt: new Date().toISOString() });
      const report = await addExportIntegrity(payload);
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `methane-response-${(audit?.sourceId || source.sourceId).toLowerCase()}-audit.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setReportExportError('Browser SHA-256 tidak tersedia; ekspor belum dibuat. Coba dari browser modern melalui HTTPS atau localhost.');
    }
  }
  async function copyHash() { if (!audit) return; try { await navigator.clipboard.writeText(audit.bundleHash); setCopied(true); setTimeout(()=>setCopied(false),1600); } catch { setCopied(false); } }
  useEffect(() => { const k = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); ref.current?.querySelector('input')?.focus(); } if(event.key==='Escape') { setShowReport(false); setSearchFocused(false); setExpandedMap(false); } }; window.addEventListener('keydown',k);return () => window.removeEventListener('keydown',k); }, []);
  const local = (s: ReviewSource) => s.region.replace('Synthetic ', '');
  const sourcePlumes = filteredSources.reduce((count, item) => count + (item.plumeCount ?? item.observations?.length ?? 0), 0);
  const allLoadedPlumes = snapshot?.plumeCount ?? sourcePlumes;
  const unlinkedPlumes = snapshot?.unlinkedObservations?.length ?? 0;
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
    cases: {eyebrow:'CASE MANAGEMENT',title:'Cases & Investigations',description:'Explore source histories, inspect observations and organize evidence reviews.'},
    audit: {eyebrow:'CLIMATE INTELLIGENCE / EVIDENCE AUDITOR',title:'Evidence Auditor',description:'Examine a specific claim against source-linked evidence with human oversight.'},
    documents: {eyebrow:'CLIMATE INTELLIGENCE / DOCUMENTS',title:'Evidence Library',description:'Browse attributable environmental records and links without misrepresenting source material.'},
    blockchain: {eyebrow:'CLIMATE INTELLIGENCE / BLOCKCHAIN',title:'Verification Center',description:'Check bundle integrity, receipt history and the distinction between evidence and proof.'},
    reports: {eyebrow:'CLIMATE INTELLIGENCE / REPORTING',title:'Investigation Reports',description:'Prepare transparent source reports and export their supporting observations.'},
  };
  const currentInfo = pageInfo[activeNav] || pageInfo.dashboard;
  const switchPage = (name: string) => navigate(nav.find(item => item.key === name) || nav[0]);
  const renderMap = () => <section id="explorer" className={`panel map-panel ${expandedMap ? 'expanded-map' : ''}`}>
    <CardHeader title="Global Methane Activity" icon="map" subtitle={realMode ? `UNEP MARS · ${realDatasetLabel} · historical snapshot` : 'Synthetic sample data · not live'} action={<div className="map-controls">
      <select className="map-style-selector" aria-label="Map records" value={mapRecordMode} onChange={e=>{setMapRecordMode(e.target.value as 'sources' | 'plumes');setSelectedUnlinked(null);}}><option value="sources">Source locations</option><option value="plumes">Historical plume records</option></select><select className="map-style-selector map-data-selector" aria-label="Methane data layer" value={mapDataLayer} onChange={e=>{const layer=e.target.value as MapDataLayer;setMapDataLayer(layer);if(layer==='plume-footprints')setMapRecordMode('plumes');}}><option value="source-density">Source location density</option><option value="observed-flux">Reported flux overlay</option><option value="plume-footprints">MARS plume geometry · selected month</option><option value="investigation-priority">Investigation priority</option></select><select className="map-style-selector" aria-label="Basemap" value={mapTheme} onChange={e => setMapTheme(e.target.value as MapTheme)}><option value="satellite">Satellite · natural color</option><option value="grayscale">Satellite · grayscale</option><option value="street">Streets</option><option value="dark">Dark map</option></select>
      <button className={`mini-btn projection-toggle ${mapProjection==='globe'?'projection-active':''}`} disabled={!globeSupported} onClick={()=>setMapProjection(p=>p==='globe'?'flat':'globe')} title="Switch 2D / 3D globe">{mapProjection === 'globe' ? '3D Globe' : 'Flat Map'}</button>
      <button className={`mini-btn ${filtersOpen?'mini-active':''}`} onClick={()=>setFiltersOpen(!filtersOpen)}><Icon name="layers" size={14}/> Layers & filters</button>
      <button className="mini-btn square" aria-label={expandedMap ? 'Exit enlarged map' : 'Enlarge map'} onClick={()=>setExpandedMap(!expandedMap)}><Icon name={expandedMap?'close':'zoom'} size={16}/></button>
    </div>}/>
    {projectionNotice && <div className="map-render-notice" role="status">{projectionNotice}<button onClick={()=>setProjectionNotice(null)}>Dismiss</button></div>}{selectedUnlinked && <div className="map-render-notice" role="status"><strong>{selectedUnlinked.id}</strong> · {selectedUnlinked.date} · {selectedUnlinked.fluxKgHr == null ? 'flux not provided' : `${selectedUnlinked.fluxKgHr.toLocaleString()} kg/h`} · source ID is missing in the MARS row; no source assignment was inferred.<button onClick={()=>setSelectedUnlinked(null)}>Dismiss</button></div>}
    <div ref={mapPanelViewportRef} className="real-world-map">{mapPanelActivated ? <MapPanelErrorBoundary><Suspense fallback={<div className="map-loading" role="status">Loading interactive globe…</div>}>
      <MapPanel key={mapRecoveryVersion} sources={filteredSources} observations={filteredMapObservations} recordMode={mapRecordMode} dataLayer={mapDataLayer} latestObservationDate={latestObservationDate} datasetSnapshotId={realMode && !demoMode ? sourceSnapshotId : null} sourceArchiveSha256={realMode && !demoMode ? sourceArchiveHash : null} selectedId={selectedId} onSelect={pickSource} onSelectUnlinked={plumeId=>setSelectedUnlinked(mapObservations.find(item=>item.id===plumeId)||null)} onProjectionFallback={()=>{setGlobeRuntimeFailed(true);setMapProjection('flat');setGlobeSupported(false);setProjectionNotice('Globe unavailable on this device; switched to 2D map.');setMapRecoveryVersion(v=>v+1);}} onGlobeSupportChange={supported=>{if(globeRuntimeFailed)return;setGlobeSupported(supported);}} theme={mapTheme} grayPercent={mapGrayPercent} projection={mapProjection} focusOnly={onlySelected} expanded={expandedMap}/>
    </Suspense></MapPanelErrorBoundary> : <div className="map-loading" role="status">Interactive globe loads when this map is in view…</div>}
    {filtersOpen && <div className="real-map-filter"><strong>Map filters</strong><label>Region<select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(r=><option key={r}>{r}</option>)}</select></label><label>Sector<select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}><option>All sectors</option>{sectors.map(s=><option key={s}>{s}</option>)}</select></label><label><input type="checkbox" checked={onlySelected} onChange={e=>setOnlySelected(e.target.checked)}/> Only selected source</label><label>Observation period<select value={range} onChange={e=>setRange(e.target.value as ObservationArchiveWindow)}><option>All observations</option><option>1 year</option><option>30 days</option></select></label><small>Relative to archive end {latestObservationDate || 'unavailable'} UTC, not today.</small>{mapTheme==='grayscale' && <label>Grayscale {mapGrayPercent}%<input type="range" min="0" max="100" value={mapGrayPercent} onChange={e=>setMapGrayPercent(Number(e.target.value))}/></label>}<button className="text-link" onClick={()=>{setCountryFilter('All regions');setSectorFilter('All sectors');setRange('All observations');setOnlySelected(false);}}>Clear filters</button></div>}
    </div>
    <div className="map-data-footer"><span>Basemap: Esri / OpenFreeMap · Data: {realMode?'UNEP MARS · historical':'Synthetic demo'}</span><span>Glow depicts point density, not measured atmospheric concentration · observations are not continuous</span></div>
  </section>;
  return <div id="top" className={`app workspace-app current-${activeNav}`}>
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><a href="/" aria-label="MethaneResponse homepage"><AppLogo/></a><button className="sidebar-close icon-button" aria-label="Close menu" onClick={()=>setMobileNav(false)}><Icon name="close"/></button></div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map(item=><button key={item.key} className={`nav-item ${activeNav===item.key?'active':''}`} onClick={()=>navigate(item)}><Icon name={item.icon} size={19}/><span>{item.label === 'Explore Map' ? 'Map Explorer' : item.label}</span>{activeNav===item.key && <span className="nav-active-mark"/>}</button>)}<div className="nav-separator"/><button className="nav-item" onClick={()=>setShowNotice(true)}><Icon name="people" size={18}/> Operators</button><button className="nav-item" onClick={()=>setShowNotice(true)}><Icon name="settings" size={18}/> Settings</button></nav>
      <div className="sidebar-bottom"><div className="sidebar-globe"/><div className="sidebar-note"><div className="tiny-leaf">◈</div><strong>Turning data into climate action.</strong><p>Trusted sources. Transparent evidence. Reproducible insights.</p></div><div className="sidebar-credit">RESEARCH PROTOTYPE <span>v0.3</span></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Icon name="menu"/></button>
        <div className="top-search" ref={ref}><Icon name="search" size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setSearchFocused(true);}} onFocus={()=>setSearchFocused(true)} placeholder="Search locations, cases, satellites, or evidence…" aria-label="Search methane sources"/><kbd>⌘ K</kbd>{searchFocused && search.trim() && <div className="search-results">{displayedResults.slice(0,12).map(item=><button key={item.sourceId} onClick={()=>{pickSource(item.sourceId);setSearchFocused(false);switchPage('cases');}}><Icon name="pin" size={15}/><span><strong>{item.sourceId}</strong><small>{item.region} · {item.sector || 'Source'}</small></span></button>)}{!displayedResults.length && <div className="search-empty">No matching sources</div>}</div>}</div>
        <div className="top-actions"><span className="environment-status"><span className="pulse"/> {realMode?'UNEP SNAPSHOT · NOT LIVE':'SYNTHETIC PREVIEW'}</span><button className="icon-button notification" aria-label="Data and prototype information" onClick={()=>setShowNotice(true)}><Icon name="bell" size={19}/><i/></button><div className="top-sep"/><button className="account" onClick={()=>setShowNotice(true)}><span className="avatar">MR</span><span className="account-copy"><strong>Research Workspace</strong><small>Prototype · no sign-in</small></span><Icon name="chevron" size={13}/></button></div>
      </header>
      <main className="dashboard-content workspace-content">
        <section className="workspace-hero"><div className="hero-content"><div className="eyebrow"><span/> {currentInfo.eyebrow}</div><h1>{currentInfo.title}<span className="headline-accent">.</span></h1><p>{currentInfo.description}</p></div><div className="hero-actions">{activeNav==='dashboard' || activeNav==='reports'?<button className="outline-btn" disabled={activeNav==='reports'&&!audit} onClick={()=>void exportReport()}><Icon name="download" size={15}/> Export current report</button>:activeNav==='cases'||activeNav==='audit'?<button className="outline-btn" onClick={()=>switchPage('map')}><Icon name="map" size={15}/> Explore on map</button>:null}</div></section>
        {datasetError && <div role="alert" className="dataset-error">{datasetError}<button onClick={()=>setDatasetError(null)}>Dismiss</button></div>}
        {(activeNav==='dashboard'||activeNav==='map') && <div className="snapshot-bar"><span><Icon name="info" size={15}/><strong>{realMode?'Historical UNEP MARS data':'Synthetic demonstration'}</strong> · {datasetSummary.sourceCount.toLocaleString()} sources · {datasetSummary.observationCount.toLocaleString()} plume records ({datasetSummary.unlinkedObservationCount.toLocaleString()} without source ID) · {snapshot?.plumeObservationDateRange?.start||'date range unavailable'} to {snapshot?.plumeObservationDateRange?.end||maxRecordedDate?.slice(0,10)||'not reported'} · not live {snapshotLoading?'· loading pinned snapshot':''} · {sourceSnapshotId||'version not available'}</span><div className="dataset-actions"><input ref={fileRef} type="file" accept=".geojson,.json,application/json" hidden onChange={e=>void importDataset(e.target.files?.[0])}/><button className="dataset-btn" onClick={()=>fileRef.current?.click()} disabled={importing}><Icon name="database" size={14}/>{importing?'Importing…':'Import MARS GeoJSON'}</button><button className="dataset-demo-btn" onClick={realMode?useDemo:useCasebook}>{realMode?'Synthetic demo':'UNEP casebook'}</button></div></div>}
        {activeNav==='dashboard' && <>
          <div className="metrics-grid workspace-metrics"><Metric icon="pin" label={realMode?'Observed source records':'Sample source records'} value={datasetSummary.sourceCount.toLocaleString()} change={realMode?'versioned historical source rows':'synthetic fixtures'} variant="cyan"/><Metric icon="flame" label="Plume records in this snapshot" value={allLoadedPlumes.toLocaleString()} change={realMode?`${datasetSummary.linkedObservationCount.toLocaleString()} linked · ${unlinkedPlumes.toLocaleString()} unlinked`:'synthetic records'} variant="orange"/><Metric icon="database" label="Source feedback field = Yes" value={sourcesWithFeedback.toLocaleString()} change="source metadata; not proof of repair" variant="blue"/><Metric icon="shield" label="Independently verified mitigation" value="—" change="not assessed by this prototype" variant="violet"/></div>
          <div className="main-grid dashboard-map-grid">{renderMap()}<section className="panel activity-panel"><CardHeader title="Latest recorded observations" subtitle="Historical, not real-time alerts" action={<button className="text-link" onClick={()=>switchPage('cases')}>View all <Icon name="arrowRight" size={14}/></button>}/><div className="activity-list">{recentSources.map((item,i)=><button className="activity-row" key={item.sourceId} onClick={()=>{pickSource(item.sourceId);switchPage('cases');}}><span className="activity-image orange"><Icon name="flame" size={18}/></span><span className="activity-copy"><strong>{item.sourceId}</strong><small>{item.region}</small></span><time>{item.lastObserved?.slice(0,10)}</time></button>)}</div><div className="activity-bottom"><span className="live-dot"/> Source: {realMode?'UNEP MARS historical snapshot':'synthetic fixture'}</div></section></div>
          <div className="workspace-overview-grid"><section className="panel overview-card"><CardHeader title="Investigation Focus" subtitle="Selected case · evidence status" icon="target" action={<button className="text-link" onClick={()=>switchPage('cases')}>Explore case <Icon name="arrowRight" size={13}/></button>}/><div className="overview-feature"><div className="overview-ring"><strong>{source.evidence.length}</strong><span>records</span></div><div className="overview-key"><b>{source.sourceId}</b><span>{source.region}</span><span>{source.observations?.length||0} displayed observations</span><span>Mitigation: not independently assessed</span></div></div></section><section className="panel overview-card"><CardHeader title="Methane Flux Observations" subtitle="Selected source · observed kg/h" icon="activity" action={<button className="text-link" onClick={()=>switchPage('cases')}>Inspect data <Icon name="arrowRight" size={13}/></button>}/><ObservationChart source={source}/></section><section className="panel overview-card"><CardHeader title="Evidence & Audit Status" subtitle="Evidence before assumptions" icon="shield" action={<button className="text-link" onClick={()=>switchPage('audit')}>Evidence Auditor <Icon name="arrowRight" size={13}/></button>}/><div className="overview-audit"><div className={`report-verdict ${verdictTone}`}>{audit?warning:'Awaiting review'}</div><p>{audit?.reason || 'No independent verification of physical mitigation has been performed for this source.'}</p><div className="overview-audit-stat"><span>Evidence references</span><strong>{source.evidence.length}</strong></div><div className="overview-audit-stat"><span>Public blockchain receipt</span><strong>{audit?.anchored?'Available':'Not anchored'}</strong></div></div></section></div>
          <div className="workspace-cta"><span><Icon name="info" size={17}/> Detailed evidence assessment, document sources and blockchain verification are organized in dedicated workspaces.</span><div><button onClick={()=>switchPage('audit')}>Evidence Auditor →</button><button onClick={()=>switchPage('blockchain')}>Blockchain →</button><button onClick={()=>switchPage('reports')}>Reports →</button></div></div>
        </>}
        {activeNav==='map' && <><div className="explorer-quickbar"><div><Icon name="layers" size={19}/><span><strong>Global Methane Activity</strong><small>{realMode?'UNEP satellite observation snapshot':'Synthetic example'}</small></span></div><label>Period <select value={range} onChange={e=>setRange(e.target.value as ObservationArchiveWindow)}><option>All observations</option><option>1 year</option><option>30 days</option></select></label><label>Region <select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(x=><option key={x}>{x}</option>)}</select></label><small>Recent windows end at the latest archive date ({latestObservationDate || 'unavailable'} UTC), not today.</small><button className="outline-btn" onClick={()=>void exportReport()}><Icon name="download" size={14}/> Export source</button></div><div className="explorer-layout">{renderMap()}<aside className="panel selected-source-card"><CardHeader title="Selected Source" icon="target"/><img src={`${assets}site-demo.webp`} alt="Illustrative industrial facility, not actual imagery of this source"/><span className="illustrative-label">ILLUSTRATION · NOT SATELLITE EVIDENCE</span><h2>{source.sourceId}</h2><p><Icon name="pin" size={13}/> {source.region} · {source.lat.toFixed(2)}°, {source.lon.toFixed(2)}°</p><div className="fact-list"><div><span>Sector</span><strong>{source.sector||'Not reported'}</strong></div><div><span>Linked observations</span><strong>{source.plumeCount??source.observations?.length??0}</strong></div><div><span>Last observed</span><strong>{source.lastObserved?.slice(0,10)||'Not reported'}</strong></div><div><span>Maximum observed flux</span><strong>{source.maxFluxKgHr == null?'Not available':`${source.maxFluxKgHr.toLocaleString()} kg/h`}</strong></div><div><span>Mitigation</span><strong>Unverified by us</strong></div></div><button className="primary-btn" onClick={()=>switchPage('cases')}><Icon name="briefcase" size={15}/> View full case <Icon name="arrowRight" size={15}/></button><button className="outline-btn" onClick={()=>switchPage('audit')}><Icon name="shield" size={14}/> Examine evidence</button><p className="note-small">A satellite source location is not independent evidence of a repair.</p></aside></div></>}
        {activeNav==='cases' && <><div className="workspace-mini-stats"><div><Icon name="briefcase"/><strong>{filteredSources.length}</strong><span>Source records</span></div><div><Icon name="activity"/><strong>{sourcePlumes}</strong><span>Linked plume records</span></div><div><Icon name="people"/><strong>{sourcesWithFeedback}</strong><span>Source feedback = Yes</span></div><div><Icon name="shield"/><strong>—</strong><span>Mitigation verified by us</span></div></div><div className="cases-toolbar"><label><Icon name="filter" size={14}/> Region<select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(region=><option key={region}>{region}</option>)}</select></label><label>Sector<select value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}><option>All sectors</option>{sectors.map(sector=><option key={sector}>{sector}</option>)}</select></label><span>{caseSearchSources.length.toLocaleString()} matching sources · search by ID or region in the top bar</span></div><div className="cases-workspace"><section className="panel cases-list"><CardHeader title={`Cases (${caseSearchSources.length})`} subtitle="Select a historical MARS source"/><div className="case-scroll">{visibleCaseSources.map(item=><button key={item.sourceId} className={`case-entry ${source.sourceId===item.sourceId?'selected':''}`} onClick={()=>pickSource(item.sourceId)}><span className="case-entry-thumb"><Icon name="flame" size={23}/></span><span><strong>{item.sourceId}</strong><small>{item.region} · {item.lastObserved?.slice(0,10)||'undated'}</small><small>{item.plumeCount??item.observations?.length??0} plume record(s)</small></span><Icon name="chevron" size={14}/></button>)}</div>{caseSearchSources.length>visibleCaseSources.length&&<div className="case-pagination"><p className="note-small">Showing {visibleCaseSources.length.toLocaleString()} of {caseSearchSources.length.toLocaleString()} matching source records.</p><button className="outline-btn" onClick={()=>setCaseLimit(limit=>limit+200)}>Load next 200 sources</button></div>}</section><section className="panel case-inspector"><div className="case-inspector-top"><img src={`${assets}site-demo.webp`} alt="Illustrative methane site graphic"/><div><span className="eyebrow">SELECTED SOURCE · {realMode?'HISTORICAL':'SYNTHETIC'}</span><h2>{source.sourceId}</h2><p>{source.region} · {source.sector||'Sector unspecified'}</p><div className="case-action-row"><button className="outline-btn" onClick={()=>switchPage('map')}><Icon name="map" size={14}/> Map</button><button className="primary-btn" onClick={()=>switchPage('audit')}><Icon name="shield" size={14}/> Review evidence</button></div></div></div><div className="case-tabs">{['Overview','Observations','Evidence','Timeline'].map(t=><button key={t} className={caseTab===t?'tab-active':''} onClick={()=>setCaseTab(t)}>{t}</button>)}</div>{caseTab==='Overview'&&<div className="case-overview-layout"><div><h3>Investigation summary</h3><p>Historical satellite source metadata. These observations do not establish continuous emissions or confirmed mitigation.</p><div className="fact-list"><div><span>Source ID</span><strong>{source.sourceId}</strong></div><div><span>Country / region</span><strong>{source.region}</strong></div><div><span>Coordinates</span><strong>{source.lat.toFixed(3)}°, {source.lon.toFixed(3)}°</strong></div><div><span>MARS notification metadata</span><strong>{source.notified||'Unknown'}</strong></div><div><span>Response metadata</span><strong>{source.feedback||'Unknown'}</strong></div><div><span>Verified mitigation</span><strong>Not assessed</strong></div></div></div><div><h3>Observed flux</h3><ObservationChart source={source}/><button className="outline-btn" onClick={()=>setCaseTab('Observations')}>Review observations →</button></div></div>}{caseTab==='Observations'&&<><ObservationChart source={source}/><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Date</th><th>Plume ID</th><th>Estimated flux (kg/h)</th><th>Satellite</th></tr></thead><tbody>{observations.map(o=><tr key={o.id}><td>{o.date}</td><td>{o.id}</td><td>{o.fluxKgHr??'—'}{o.uncertaintyKgHr!=null?` ± ${o.uncertaintyKgHr}`:''}</td><td>{o.satellite||'Not reported'}</td></tr>)}</tbody></table></div></>}{caseTab==='Evidence'&&<div className="evidence-list">{source.evidence.map(e=><div key={e.id}><Icon name="file" size={16}/><span><strong>{e.title}</strong><small>{e.kind.replaceAll('_',' ')} · {e.date||'No date'}</small></span><a href={e.reference} target="_blank" rel="noreferrer">Open source ↗</a></div>)}{!source.evidence.length&&<p>No documents linked to this source.</p>}</div>}{caseTab==='Timeline'&&<div className="workspace-timeline">{observations.map(o=><div key={o.id}><span className="timeline-node"/><time>{o.date}</time><strong>Satellite observation recorded</strong><small>{o.fluxKgHr==null?'Flux not provided':`${o.fluxKgHr} kg/h`} · {o.id}</small></div>)}{!observations.length&&<p>No dated plume observations provided.</p>}</div>}</section></div></>}
        {activeNav==='audit' && <><div className="claim-banner"><span className="claim-banner-icon"><Icon name="shield" size={26}/></span><div><span className="micro-label">CLAIM UNDER REVIEW</span><strong>{claimLabels[claim]}</strong><small>{claimDescriptions[claim]}</small></div><div className="claim-banner-source"><small>SOURCE CASE</small><button onClick={()=>switchPage('cases')}>{source.sourceId} ↗</button><small>{source.region}</small></div></div><div className="auditor-workspace"><section className="panel evidence-viewer"><CardHeader title="Evidence Viewer" subtitle="Source-linked records · official documents are not embedded" icon="file"/><div className="viewer-head"><Icon name="database" size={22}/><div><strong>{source.sourceId} · Evidence inventory</strong><small>{realMode?'UNEP MARS historical metadata':'Synthetic test fixture'} · {source.evidence.length} references</small></div><Chip tone={realMode?'teal':'orange'}>{realMode?'UNEP SNAPSHOT':'DEMO'}</Chip></div><div className="evidence-preview"><div className="evidence-preview-side">{[1,2,3,4].map(n=><button key={n} className={docIndex%4===n-1?'selected':''} onClick={()=>setDocIndex(n-1)}><img src={`${assets}observation-${n}.webp`} alt="Decorative observation art"/><span>{n}</span></button>)}</div><div className="evidence-preview-body"><div className="image-illustration"><img src={`${assets}observation-${docIndex%5+1}.webp`} alt="Generated methane plume illustration; not original satellite data"/><span>ILLUSTRATIVE VISUAL — NOT OBSERVATIONAL EVIDENCE</span></div><div className="document-passage"><span>UNEP MARS SOURCE METADATA</span><h3>{source.sourceId}</h3><p>Detected plume records: {source.plumeCount??observations.length}. Response metadata: {source.feedback||'not provided'}. Notification metadata: {source.notified||'not provided'}.</p><p>Satellite detections alone cannot establish that an operator received a notification or that methane mitigation occurred.</p></div></div></div><div className="evidence-list compact">{source.externalEvidence?.map(e=><div key={e.url}><Icon name="file" size={16}/><span><strong>{e.title}</strong><small>Linked document · {e.publisher||'Publisher unspecified'} · content not copied</small></span><a href={e.url} target="_blank" rel="noreferrer">Official link ↗</a></div>)}{source.evidence.slice(0,10).map(e=><div key={e.id}><Icon name="activity" size={16}/><span><strong>{e.title}</strong><small>{e.date||'undated'} · {e.id}</small></span><a href={e.reference} target="_blank" rel="noreferrer">Source ↗</a></div>)}</div></section><section className="panel audit-assessment"><CardHeader title="Assessment Result" icon="sparkles" subtitle="Deterministic baseline · optional external document AI"/><label className="field-small" htmlFor="claim-audit">CLAIM TO EVALUATE</label><select id="claim-audit" className="claim-select" value={claim} onChange={e=>{setClaim(e.target.value as ClaimType);setAudit(null);}}>{(Object.keys(claimLabels) as ClaimType[]).map(type=><option key={type} value={type}>{claimLabels[type]}</option>)}</select><button className="primary-btn run-btn" disabled={auditMutation.isPending||!sourceCanBeAudited} onClick={()=>auditMutation.mutate({sourceId:source.sourceId,claimType:claim})}><Icon name="sparkles" size={15}/>{auditMutation.isPending?'Assessing…':'Run evidence audit'} <Icon name="arrowRight" size={14}/></button>{!sourceCanBeAudited&&<p className="note-small">This imported source has no curated audit casebook evidence. Use a supported case for baseline audit.</p>}{auditMutation.isError&&<p role="alert" className="inline-error">Audit request failed. Check API connection.</p>}<div className={`audit-verdict-card ${audit?.result||'empty'}`}><Icon name={audit?.result==='supported'?'check':'shield'} size={30}/><div><strong>{audit?warning:'Awaiting assessment'}</strong><p>{audit?.reason||'No assessment has been performed for the selected claim.'}</p><small>{audit?'Result is limited to cited evidence.':'No physical methane mitigation certified.'}</small></div></div><div className="audit-result-mini"><div><Icon name="link" size={19}/><strong>{audit?.bundle.citedEvidence.length||0}</strong><span>Cited records</span></div><div><Icon name="warning" size={19}/><strong>{source.evidence.filter(e=>e.kind==='contradiction').length}</strong><span>Explicit contradictions</span></div><div><Icon name="shield" size={19}/><strong>{audit?.anchored?'1':'0'}</strong><span>Anchored receipts</span></div></div>{audit?.bundle.citedEvidence.length? <div className="evidence-list compact">{audit.bundle.citedEvidence.map(e=><div key={e.id}><Icon name="link" size={15}/><span><strong>{e.title}</strong><small>{e.id} · {e.date||'undated'}</small></span><a href={e.reference} target="_blank" rel="noreferrer">Inspect ↗</a></div>)}</div>:<p className="note-small">Citations appear here after a supported evidence assessment.</p>}<div className="audit-actions"><button className="outline-btn" onClick={()=>switchPage('documents')}>View references</button><button className="outline-btn" onClick={()=>switchPage('blockchain')}>Check integrity →</button></div></section></div><IntelligencePanel sourceId={source.sourceId} claimType={claim} synthetic={source.synthetic} documentAssessmentAllowed={documentAssessmentAllowed} currentAudit={audit} onAssessment={setCurrentAudit} capability={intelligenceStatusQuery.data || null} capabilityLoading={intelligenceStatusQuery.isLoading} capabilityError={intelligenceStatusQuery.isError ? intelligenceStatusQuery.error instanceof Error ? intelligenceStatusQuery.error.message : "Unknown status error" : undefined} onRetryCapability={()=>void intelligenceStatusQuery.refetch()}/></>}
        {activeNav==='documents' && <><div className="workspace-mini-stats docs-stats"><div><Icon name="file"/><strong>{allDocuments.filter(d=>d.kind==='External report').length}</strong><span>Curated report links</span></div><div><Icon name="database"/><strong>{allDocuments.filter(d=>d.kind==='detection').length}</strong><span>Curated detection citations</span></div><div><Icon name="flame"/><strong>{snapshot?.plumeCount?.toLocaleString()||'—'}</strong><span>Plume records in loaded snapshot</span></div><div><Icon name="shield"/><strong>0</strong><span>Independently reviewed reports</span></div></div><div className="documents-workspace"><section className="panel doc-library"><CardHeader title="Evidence Library" icon="file" subtitle="Historical metadata and source links" action={<button className="outline-btn" onClick={()=>switchPage('audit')}><Icon name="sparkles" size={14}/> Assess evidence</button>}/><div className="document-filters"><div className="doc-search"><Icon name="search" size={17}/><input placeholder="Search documents, sources or keywords…" value={documentQuery} onChange={e=>setDocumentQuery(e.target.value)}/></div><span>{documentResults.length} visible references</span></div><div className="document-grid"><button className="document-upload-card" onClick={()=>switchPage('audit')}><Icon name="file" size={35}/><strong>Evaluate document evidence</strong><span>Use the secure excerpt review workspace. No documents are uploaded by this library.</span><b>Open Evidence Auditor →</b></button>{documentResults.map((doc,index)=><button key={doc.key} className={`document-tile ${currentDocument?.key===doc.key?'selected':''}`} onClick={()=>setSelectedDocument(doc.key)}><div className={`document-tile-art doc-art-${index%4}`}><Icon name={doc.kind==='External report'?'file':'activity'} size={35}/><span>{doc.kind==='External report'?'LINK':'DATA'}</span></div><strong>{doc.title}</strong><span className="document-tags">{doc.sourceId} · {doc.kind}</span><small>{doc.date||'No date supplied'} · {doc.issuer}</small></button>)}</div></section><aside className="panel document-inspector"><CardHeader title="Document Preview" icon="eye"/><div className="document-inspector-art"><Icon name="file" size={64}/><span>REFERENCE PREVIEW</span></div>{currentDocument?<><h2>{currentDocument.title}</h2><Chip tone={currentDocument.kind==='External report'?'orange':'teal'}>{currentDocument.kind}</Chip><div className="fact-list"><div><span>Source</span><button onClick={()=>{pickSource(currentDocument.sourceId);switchPage('cases');}}>{currentDocument.sourceId} ↗</button></div><div><span>Issuer / reference</span><strong>{currentDocument.issuer}</strong></div><div><span>Date</span><strong>{currentDocument.date||'Not provided'}</strong></div><div><span>License</span><strong>{currentDocument.license||'Check official terms'}</strong></div></div><a href={currentDocument.url} target="_blank" rel="noopener noreferrer" className="primary-btn doc-open-link">Open source record <Icon name="external" size={15}/></a><p className="note-small">This is a linked record, not an embedded copy or a verified extraction of the full document.</p></>:<p>No matching records.</p>}</aside></div><section className="panel snapshot-history-panel"><CardHeader title="Dataset Snapshot History" icon="database" subtitle="Only releases downloaded and hashed by this project are listed; observation dates are not continuous coverage."/><div className="table-wrap"><table className="workspace-table"><thead><tr><th>Retrieved</th><th>Snapshot ID</th><th>Archive SHA-256</th><th>Sources</th><th>Plume rows</th><th>Linked</th><th>Source ID missing</th><th>Observation dates</th></tr></thead><tbody>{snapshotHistory.map(item=><tr key={item.snapshotId}><td>{item.retrievedAt.slice(0,10)}</td><td>{item.snapshotId}</td><td><code className="mono" title={item.archiveSha256}>{item.archiveSha256.slice(0,12)}…</code></td><td>{item.sources.toLocaleString()}</td><td>{item.plumes.toLocaleString()}</td><td>{item.linkedPlumes.toLocaleString()}</td><td>{item.sourceIdMissingPlumes.toLocaleString()}</td><td>{item.observationDateRange.start} – {item.observationDateRange.end}</td></tr>)}</tbody></table></div>{!snapshotHistory.length&&<p className="note-small">Snapshot history metadata is unavailable in this build.</p>}<p className="note-small">The complete archive SHA-256 values are available in the <a href="/data/mars-snapshot-history.json" target="_blank" rel="noreferrer">full snapshot history JSON ↗</a>. Missing source IDs remain unlinked; this display does not infer a source or mitigation status.</p><div className="dataset-reference-links"><a href="https://methanedata.unep.org/download-dataset" target="_blank" rel="noreferrer">UNEP MARS dataset and terms ↗</a><a href="https://methanedata.unep.org/dict-mars-plumes" target="_blank" rel="noreferrer">MARS data dictionary ↗</a></div></section></>}
        {activeNav==='blockchain' && <><div className="workspace-mini-stats chain-stats"><div><Icon name="file"/><strong>{audit?1:0}</strong><span>Current audit bundles</span></div><div><Icon name="shield"/><strong>{audit?.anchored?'1':'0'}</strong><span>Anchored receipts</span></div><div><Icon name="check"/><strong>{verification?.startsWith('On-chain receipt verified')?'1':'0'}</strong><span>Verified on chain this session</span></div><div><Icon name="database"/><strong>Sepolia</strong><span>Optional test network</span></div></div><div className="blockchain-workspace"><section className="panel blockchain-main"><CardHeader title="Verification Center" subtitle="From attributed evidence to verifiable digest" icon="link"/><div className="chain-flow"><div><Icon name="layers" size={27}/><strong>Evidence bundle</strong><span>Claims, citations and provenance</span></div><b>→</b><div><Icon name="database" size={27}/><strong>SHA-256 digest</strong><span>Reproducible data integrity</span></div><b>→</b><div><Icon name="cube" size={27}/><strong>Chain transaction</strong><span>Authorized issuer on Sepolia</span></div><b>→</b><div><Icon name="shield" size={27}/><strong>Receipt verification</strong><span>Compare issuer, version and event</span></div></div><CardHeader title="Audit receipt" subtitle="Current selected source" action={<button className="outline-btn" onClick={()=>switchPage('audit')}>New evidence audit →</button>}/><div className="chain-current"><span className="chain-current-icon"><Icon name="shield" size={25}/></span><div><strong>{audit?`Audit ${audit.auditId}`:'No receipt has been generated'}</strong><p>{audit?.reason||'Run a real evidence audit to create a versioned bundle. A public transaction is never simulated.'}</p><Chip tone={audit?.anchored?'teal':'orange'}>{audit?.anchored?'On-chain receipt recorded':'Not anchored'}</Chip></div></div><div className="fact-list"><div><span>Source</span><strong>{source.sourceId}</strong></div><div><span>Bundle SHA-256</span><strong className="mono">{audit?.bundleHash||'Not generated'}</strong></div><div><span>Audit revision</span><strong>{audit?.revision??'—'}</strong></div><div><span>Receipt version</span><strong>{audit?.receipt?.version??'—'}</strong></div><div><span>Transaction</span><strong className="mono">{audit?.chainTxHash||'No public transaction'}</strong></div></div><div className="audit-actions"><button className="outline-btn" disabled={!audit} onClick={copyHash}><Icon name="copy" size={15}/>{copied?'Copied':'Copy digest'}</button><button className="primary-btn" disabled={!audit||verifyMutation.isPending} onClick={()=>audit&&verifyMutation.mutate(audit.auditId)}><Icon name="shield" size={16}/>{verifyMutation.isPending?'Checking…':audit?.anchored?'Verify on-chain receipt':'Verify saved digest'}</button></div>{verification&&<p role="status" className="note-small">Verifier result: {verification}</p>}{audit?.chainTxHash&&<a className="chain-explorer-link" href={`https://sepolia.etherscan.io/tx/${audit.chainTxHash}`} target="_blank" rel="noreferrer">View public Sepolia transaction ↗</a>}</section><aside className="panel blockchain-aside"><CardHeader title="Receipt Details" icon="shield"/><div className="chain-receipt-badge"><Icon name={audit?.anchored?'check':'clock'} size={18}/>{audit?.anchored?'Recorded on Sepolia':'Awaiting blockchain receipt'}</div><h2>{source.sourceId}</h2><p>Historical methane evidence case</p><div className="fact-list"><div><span>Network</span><strong>Sepolia (testnet)</strong></div><div><span>Issuer</span><strong className="mono">{audit?.receipt?.issuer||'Not recorded'}</strong></div><div><span>Block</span><strong>{audit?.receipt?.blockNumber||'—'}</strong></div><div><span>Current verification</span><strong>{verification||'Not checked'}</strong></div></div><div className="workspace-timeline"><div><span className="timeline-node"/><time>Audit lifecycle</time><strong>{audit?'Bundle created':'No audit generated'}</strong><small>{audit?`Revision ${audit.revision}`:'Begin in Evidence Auditor'}</small></div>{audit?.anchored&&<div><span className="timeline-node"/><time>On-chain</time><strong>Receipt recorded</strong><small>Verify its integrity above</small></div>}</div><p className="note-small">Blockchain verifies the recorded digest and publisher metadata. It does not prove physical leak repair.</p></aside></div></>}
        {activeNav==='reports' && <><div className="workspace-mini-stats report-stats"><div><Icon name="file"/><strong>{audit?1:0}</strong><span>Audit reports this session</span></div><div><Icon name="flame"/><strong>{sourcePlumes}</strong><span>Linked observations</span></div><div><Icon name="pin"/><strong>{filteredSources.length}</strong><span>Source locations</span></div><div><Icon name="shield"/><strong>—</strong><span>Independently verified mitigation</span></div></div><div className="reports-workspace"><div className="reports-left"><section className="panel report-summary-panel"><CardHeader title="Executive Summary" icon="reports" subtitle="Historical observations and audit evidence" action={<Chip tone={realMode?'teal':'orange'}>{realMode?'UNEP SNAPSHOT':'SYNTHETIC'}</Chip>}/><div className="report-summary-grid"><div><strong>{source.sourceId}</strong><span>Selected case</span></div><div><strong>{observations.length}</strong><span>Displayed observations</span></div><div><strong>{source.evidence.length}</strong><span>Evidence references</span></div><div><strong>{audit?.result?.replaceAll('_',' ')||'Pending'}</strong><span>Assessment result</span></div></div><p>{audit?.reason||`The selected source appears in the ${realDatasetLabel}. Available metadata includes satellite detections and source-level status; it does not independently establish physical mitigation.`}</p>{audit?.bundle.schemaVersion === 3 && audit.bundle.intelligence?.reviewStatus === 'unreviewed' && <button className="outline-btn" onClick={()=>switchPage('audit')}>Continue human review <Icon name="arrowRight" size={14}/></button>}<button className="outline-btn" onClick={()=>switchPage('cases')}>Review selected case <Icon name="arrowRight" size={14}/></button></section><section className="panel"><CardHeader title="Observed Methane Flux" icon="activity" subtitle="Observed points in kg/h · not continuous"/><ObservationChart source={source}/></section><section className="panel report-checklist"><CardHeader title="Evidence completeness" icon="shield"/><div><Icon name="check" size={16}/> Source identifier and location <strong>Available</strong></div><div><Icon name="check" size={16}/> Satellite observations <strong>{observations.length} displayed</strong></div><div><Icon name="file" size={16}/> External reports <strong>{source.externalEvidence?.length||0} links</strong></div><div><Icon name="warning" size={16}/> Independently verified mitigation <strong>Not established</strong></div><div><Icon name="cube" size={16}/> Blockchain anchoring <strong>{audit?.anchored?'Receipt exists':'Not anchored'}</strong></div></section></div><section className="panel report-preview-panel"><CardHeader title="Report Preview" icon="eye" subtitle="Current source · generated from available evidence"/><div className="report-paper"><div className="paper-cover"><div className="paper-logo"><AppLogo/></div><span>RESEARCH PROTOTYPE · {new Date().getUTCFullYear()}</span><h2>Global Methane<br/>Intelligence Report</h2><p>Observations. Evidence. Action.</p><div className="paper-earth"/><div className="paper-cover-meta"><span>Case {source.sourceId}</span><span>Region: {source.region}</span><span>Status: {audit?audit.result:'Not audited'}</span></div></div><div className="paper-summary"><h3>Evidence assessment</h3><p>{audit?.reason||'No independent evidence audit has been completed for this case.'}</p><div className="fact-list"><div><span>Source</span><strong>{source.sourceId}</strong></div><div><span>Evidence references</span><strong>{source.evidence.length}</strong></div><div><span>Mitigation proof</span><strong>Not certified</strong></div></div></div></div><div className="report-export-actions"><button className="primary-btn" disabled={!audit} onClick={()=>void exportReport()}><Icon name="download" size={16}/> Download JSON report</button><button className="outline-btn" onClick={()=>switchPage('blockchain')}>Check integrity →</button></div>{reportExportError&&<p role="alert" className="inline-error">{reportExportError}</p>}<p className="note-small">The export is JSON. PDF report generation is not yet implemented; the on-screen cover is a layout preview, not a published document.</p></section></div></>}
        {activeNav==='blockchain' && <ImportedAuditVerifier/>}
        {(activeNav==='reports'||activeNav==='blockchain')&&<AuditHistoryPanel sourceId={source.sourceId} audits={auditHistoryQuery.data?.audits||[]} selectedAuditId={audit?.auditId} isLoading={auditHistoryQuery.isLoading} isError={auditHistoryQuery.isError} errorMessage={auditHistoryQuery.error instanceof Error ? auditHistoryQuery.error.message : undefined} privateHistoryEnabled={privateHistoryEnabled} onOpen={openHistoricalAudit} onRefresh={()=>{void auditHistoryQuery.refetch();}} onUnlockPrivate={unlockPrivateAuditHistory} onLockPrivate={lockPrivateAuditHistory}/>}
        <footer className="footer"><span>© 2026 MethaneResponse · Research prototype · Not affiliated with UNEP or IEEE</span><span>Historical observations ≠ confirmed mitigation <Icon name="shield" size={13}/></span></footer>
      </main>
    </div>
    {showNotice && <div className="modal-overlay" onMouseDown={()=>setShowNotice(false)}><div className="info-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setShowNotice(false)} aria-label="Close"><Icon name="close"/></button><div className="modal-kicker">DATA & PROTOTYPE DISCLOSURE</div><h2>Evidence before assumptions</h2><p>Historical UNEP MARS snapshots are not live monitoring. Satellite detections and notification/feedback fields alone do not certify mitigation. Imported sources may have no curated audit evidence. The deterministic baseline and optional external AI analysis require supporting source references; public chain receipts are only shown when actually recorded. Generated observation thumbnails and decorative Earth artwork are illustrations.</p><button className="primary-btn" onClick={()=>setShowNotice(false)}>Understood</button></div></div>}
  </div>;
}
