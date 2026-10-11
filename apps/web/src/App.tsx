import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DEMO_SOURCES } from '@methane/shared';
import type { AuditResult, ClaimType, ReviewSource } from '@methane/shared';
import type { MapProjection, MapTheme } from './MapPanel';
import { MapPanelErrorBoundary } from './MapPanelErrorBoundary';
import { loadMarsFile, parseMarsGeoJSON, type MarsSnapshot, type MarsSource } from './mars';

const MapPanel = lazy(() => import('./MapPanel'));

/*
 * The default review is backed by a pinned, three-source MARS casebook. The
 * optional demo fixtures and dashboard trend artwork are synthetic. Audits use
 * deterministic rules; this interface does not claim an LLM is running.
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

function Metric({ icon, label, value, change, variant, trail }: { icon: IconName; label: string; value: string; change: string; variant: string; trail: number[] }) {
  const poly = trail.map((v, i) => `${i * 10},${33 - v * 3}`).join(' ');
  return <div className={`metric-card metric-${variant}`}><div className="metric-icon"><Icon name={icon} size={24}/></div><div className="metric-copy"><div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-change">↗ {change} <span>illustrative</span></div></div><svg viewBox="0 0 70 37" className="sparkline" role="img" aria-label="Decorative trend"><polyline points={poly} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
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
  const recent = observations.slice(-40);
  const max = Math.max(...recent.map(o=>o.fluxKgHr!), 1);
  const minTime = Date.parse(recent[0].date) || 0;
  const maxTime = Date.parse(recent[recent.length-1].date) || minTime + 1;
  const xFor = (date:string, index:number) => 40 + ((Date.parse(date) - minTime) / (maxTime-minTime || 1) || index/(recent.length || 1)) * 518;
  const yFor = (n:number) => 220 - n / max * 182;
  return <div className="chart-wrap"><svg className="trend-chart" viewBox="0 0 600 270" role="img" aria-label="Actual individual UNEP methane plume flux observations in kilograms per hour, not continuous emissions">
    {[0,1,2,3,4].map(i=><g key={i}><line x1="40" x2="565" y1={38+i*45.5} y2={38+i*45.5} stroke="#274555" strokeWidth="1"/><text x="1" y={43+i*45.5} fill="#7599a8" fontSize="12">{Math.round(max*(1-i/4)).toLocaleString()}</text></g>)}
    {recent.map((o,i)=><g key={o.id}><circle cx={xFor(o.date,i)} cy={yFor(o.fluxKgHr!)} r="4.3" fill="#20e9cb" stroke="#062c37" strokeWidth="1.4"><title>{`${o.date.slice(0,10)} — ${o.fluxKgHr?.toLocaleString()} kg/h${o.uncertaintyKgHr ? ` ±${o.uncertaintyKgHr}` : ''}`}</title></circle></g>)}
    <text x="40" y="257" fill="#89a7b5" fontSize="12">{recent[0].date.slice(0,10)}</text><text x="455" y="257" fill="#89a7b5" fontSize="12">{recent[recent.length-1].date.slice(0,10)}</text>
  </svg><div className="chart-caption">RECORDED MARS PLUME OBSERVATIONS · {recent.length} point measurements · kg/h, not continuous monitoring</div></div>;
}

function AppLogo() { return <div className="brand"><div className="brand-symbol"><svg viewBox="0 0 38 38" fill="none"><circle cx="19" cy="19" r="14" stroke="#E9FFFA" strokeWidth="2.3" strokeDasharray="70 24" transform="rotate(-35 19 19)"/><path d="M8 26c6-12 16-17 25-19C28 17 20 29 8 26z" fill="#19E5C4"/><path d="M8 26c9-5 13-9 20-15" stroke="#062b34" strokeWidth="1.8" strokeLinecap="round"/></svg></div><span>Methane<span>Response</span></span></div>; }

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [selectedId, setSelectedId] = useState('');
  const [range, setRange] = useState('All observations');
  const [mapTheme, setMapTheme] = useState<MapTheme>('satellite');
  const [mapGrayPercent, setMapGrayPercent] = useState(100);
  const [mapProjection, setMapProjection] = useState<MapProjection>('flat');
  const [mapRecoveryVersion, setMapRecoveryVersion] = useState(0);
  const [projectionNotice, setProjectionNotice] = useState<string | null>(null);
  const [globeSupported, setGlobeSupported] = useState(false);
  const [globeRuntimeFailed, setGlobeRuntimeFailed] = useState(false);
  const [expandedMap, setExpandedMap] = useState(false);
  const [snapshot, setSnapshot] = useState<MarsSnapshot | null>(null);
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
  const [verification, setVerification] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [caseTab, setCaseTab] = useState('Overview');
  const [docIndex, setDocIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isError } = useQuery({ queryKey: ['review-sources', demoMode], queryFn: () => fetchApi<{ synthetic: boolean; sources: ReviewSource[] }>(`/sources${demoMode ? '?mode=demo' : ''}`), retry: 0 });
  const realMode = snapshot !== null || (!demoMode && data?.synthetic === false);
  const realDatasetLabel = snapshot ? 'user-imported UNEP snapshot' : 'pinned UNEP MARS casebook';
  const caseSourceBadge = snapshot ? 'IMPORTED MARS SNAPSHOT' : realMode ? 'PINNED MARS CASE' : 'SYNTHETIC CASE';
  const sources: MarsSource[] = snapshot?.sources || data?.sources || DEMO_SOURCES;
  const source: MarsSource = sources.find(s => s.sourceId === selectedId) || sources[0];
  const sourceArchiveHash = snapshot ? undefined : source.provenance?.archiveSha256;
  const sourceRetrievedAt = snapshot?.importedAt || source.provenance?.retrievedAt;
  const sourceLicense = snapshot?.license || source.provenance?.license;
  const sourceCanBeAudited = Boolean(source && (source.synthetic || data?.sources.some(item => item.sourceId === source.sourceId && item.caseId)));
  const filteredSources = useMemo(() => sources.filter(item => {
    if (countryFilter !== 'All regions' && (item.country || item.region) !== countryFilter) return false;
    if (sectorFilter !== 'All sectors' && item.sector !== sectorFilter) return false;
    if (range === 'All observations' || !item.observations?.length) return true;
    const ageMs = range === '30 days' ? 30 * 86400000 : 365 * 86400000;
    const cutoff = Date.now() - ageMs;
    return item.observations.some(observation => Date.parse(observation.date) >= cutoff);
  }), [sources, countryFilter, sectorFilter, range]);
  const regions = [...new Set(sources.map(item => item.country || item.region).filter(Boolean))].sort();
  const sectors = [...new Set(sources.map(item => item.sector).filter((item): item is string => Boolean(item)))].sort();
  const auditMutation = useMutation({
    mutationFn: ({ sourceId, claimType }: { sourceId: string; claimType: ClaimType }) => fetchApi<AuditResult>('/audits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceId, claimType }) }),
    onSuccess: result => { setAudit(result); setVerification(null); },
  });
  const verifyMutation = useMutation({ mutationFn: (id: string) => fetchApi<{ status: string; integrityVerified: boolean }>('/audits/' + encodeURIComponent(id) + '/verify'), onSuccess: response => setVerification(response.status) });
  const sourceEvidence = source?.evidence || [];
  const activeDoc = sourceEvidence[docIndex % Math.max(1, sourceEvidence.length)];
  const displayedResults = useMemo(() => sources.filter(s => `${s.sourceId} ${s.name} ${s.region}`.toLowerCase().includes(search.toLowerCase())), [search, sources]);
  const warning = audit?.result === 'contradicted' ? 'Contradicted' : audit?.result === 'supported' ? 'Supported' : 'Insufficient evidence';
  const alertText = audit ? audit.reason : realMode ? 'Satellite detections alone cannot establish whether emissions have stopped. Run the deterministic coverage baseline to inspect the selected claim.' : 'No independent mitigation confirmation is present for this selected synthetic fixture. Run a baseline audit to check the evidence.';
  const verdictTone = audit?.result === 'supported' ? 'positive' : 'caution';
  const totalEvidence = sources.reduce((n,s) => n+s.evidence.length,0);
  const insights = sourceEvidence.filter(s => s.kind === 'mitigation_confirmation').length;
  const maxRecordedDate = snapshot?.lastObserved || sources.map(item => item.lastObserved || '').sort().at(-1) || undefined;
  useEffect(() => {
    if (sources.length && !sources.some(item => item.sourceId === selectedId)) setSelectedId(sources[0].sourceId);
  }, [sources, selectedId]);
  useEffect(() => {
    let cancelled = false;
    fetch('/data/mars-snapshot.json', { cache: 'no-cache' }).then(async r => r.ok ? r.json() : null).then(raw => {
      if (!raw || cancelled) return;
      const parsed = parseMarsGeoJSON(raw);
      if (parsed.sources.length && !cancelled) { setSnapshot(parsed); setSelectedId(parsed.sources[0].sourceId); }
    }).catch(() => {}).finally(() => {});
    return () => { cancelled = true; };
  }, []);
  async function importDataset(file?: File) {
    if (!file) return;
    setDatasetError(null);setImporting(true);
    try { const parsed = await loadMarsFile(file); setDemoMode(false);setSnapshot(parsed);setSelectedId(parsed.sources[0].sourceId);setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }
    catch (error) { setDatasetError(error instanceof Error ? error.message : 'Unable to import dataset.'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function useDemo() { setDemoMode(true);setSnapshot(null);setSelectedId('DEMO-001');setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }
  function useCasebook() { setDemoMode(false);setSnapshot(null);setSelectedId('KAZ_S_159');setAudit(null);setVerification(null);setDocIndex(0);setSearch(''); }

  function navigate(item: typeof nav[number]) {
    setActiveNav(item.key); setMobileNav(false);
    document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (item.key === 'reports') setShowReport(true);
  }
  function pickSource(id: string) { setSelectedId(id); setAudit(null); setVerification(null); setDocIndex(0); setSearchFocused(false); setSearch(''); }
  function exportReport() {
    const report = { prototype: true, synthetic: !realMode, product: 'MethaneResponse', generatedAt: new Date().toISOString(), sourceDataset: snapshot ? { name: snapshot.dataset, sourceUrl: snapshot.sourceUrl, license: snapshot.license, importedAt: snapshot.importedAt } : source.provenance || 'synthetic fixture', selectedSourceId: source.sourceId, observations: source.observations || [], externalEvidence: source.externalEvidence || [], claim, latestAudit: audit || null, disclaimer: realMode ? 'Historical UNEP observation snapshot; not live. Plume absence, notification, and feedback do not prove mitigation. Verify the bundled evidence digest independently.' : 'Synthetic fixture only; not a UNEP observation or third-party mitigation certification.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)], { type:'application/json' }));
    const a = document.createElement('a'); a.href=url; a.download=`methane-response-${source.sourceId.toLowerCase()}-audit.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function copyHash() { if (!audit) return; try { await navigator.clipboard.writeText(audit.bundleHash); setCopied(true); setTimeout(()=>setCopied(false),1600); } catch { setCopied(false); } }
  useEffect(() => { const k = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); ref.current?.querySelector('input')?.focus(); } if(event.key==='Escape') { setShowReport(false); setSearchFocused(false); setExpandedMap(false); } }; window.addEventListener('keydown',k);return () => window.removeEventListener('keydown',k); }, []);
  const local = (s: ReviewSource) => s.region.replace('Synthetic ', '');
  return <div id="top" className="app">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="sidebar-top"><a href="/" aria-label="MethaneResponse landing page"><AppLogo/></a><button className="sidebar-close icon-button" aria-label="Close menu" onClick={()=>setMobileNav(false)}><Icon name="close"/></button></div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map(item => <button key={item.key} className={`nav-item ${activeNav === item.key ? 'active' : ''}`} onClick={()=>navigate(item)}><Icon name={item.icon} size={18}/><span>{item.label}</span>{activeNav===item.key && <span className="nav-active-mark"/>}</button>)}<div className="nav-separator"/><button className="nav-item" onClick={()=>{setActiveNav('operators');setShowNotice(true)}}><Icon name="people" size={18}/> Operators</button><button className="nav-item" onClick={()=>setShowNotice(true)}><Icon name="settings" size={18}/> Settings</button></nav>
      <div className="sidebar-bottom"><div className="sidebar-globe"/><div className="sidebar-note"><div className="tiny-leaf">◉</div><strong>Evidence before assumptions.</strong><p>Audit climate claims with traceable records.</p></div><div className="sidebar-credit">UI PROTOTYPE <span>v0.2</span></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <button aria-label="Open menu" className="mobile-menu icon-button" onClick={()=>setMobileNav(true)}><Icon name="menu"/></button>
        <div className="top-search" ref={ref}><Icon name="search" size={17}/><input value={search} onChange={e=>{setSearch(e.target.value);setSearchFocused(true)}} onFocus={()=>setSearchFocused(true)} placeholder="Search sources, locations, cases, evidence..." aria-label="Search methane sources"/><kbd>⌘ K</kbd>
          {searchFocused && search.trim() && <div className="search-results">{displayedResults.length ? displayedResults.map(s=><button key={s.sourceId} onClick={()=>{pickSource(s.sourceId);document.getElementById('case')?.scrollIntoView({behavior:'smooth'});}}><Icon name="pin" size={15}/><span><strong>{s.sourceId}</strong><small>{s.name}</small></span></button>) : <div className="search-empty">No matching demo sources</div>}</div>}
        </div>
        <div className="top-actions"><span className="environment-status"><span className="pulse"/> {realMode ? 'UNEP SNAPSHOT · NOT LIVE' : 'SYNTHETIC PREVIEW'}</span><button className="icon-button notification" aria-label="Information" onClick={()=>setShowNotice(true)}><Icon name="bell" size={19}/><i/></button><div className="top-sep"/><button className="account" onClick={()=>setShowNotice(true)}><span className="avatar">MR</span><span className="account-copy"><strong>Demo Analyst</strong><small>Research workspace</small></span><Icon name="chevron" size={15}/></button></div>
      </header>
      <main className="dashboard-content">
        <div className="page-heading"><div><div className="eyebrow"><span/> CLIMATE INTELLIGENCE / EVIDENCE ANALYTICS</div><h1>Global Methane Intelligence <span className="headline-accent">.</span></h1><p>Explore emissions, investigate claims, and trace evidence to verifiable audit records.</p></div><button className="outline-btn heading-export" onClick={exportReport}><Icon name="download" size={16}/> Export audit report</button></div>
        <div className={`preview-banner ${realMode ? 'official-data-banner' : ''}`}><Icon name="info" size={16}/> <span><strong>{realMode ? 'UNEP MARS historical case data loaded.' : 'Synthetic demo mode.'}</strong> {realMode ? snapshot ? `Showing ${sources.length.toLocaleString()} imported source locations; latest record ${maxRecordedDate?.slice(0,10) || 'not reported'}. This is a user-provided historical snapshot, not a live feed.` : `Showing ${sources.length} curated UNEP MARS cases and ${sources.reduce((n,s)=>n+(s.observations?.length||0),0)} linked plume records from the pinned archive retrieved ${source.provenance?.retrievedAt.slice(0,10) || '2026-10-11'}. Not live monitoring; report links are metadata only.` : 'Switch to UNEP cases or import an official MARS GeoJSON snapshot to review historical source locations and plume observations.'}</span><div className="dataset-actions"><input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onChange={e=>{void importDataset(e.target.files?.[0]);}}/><button className="dataset-btn" onClick={()=>fileRef.current?.click()} disabled={importing}><Icon name="database" size={14}/>{importing?'Importing...':'Import full MARS GeoJSON'}</button>{realMode ? <button className="dataset-demo-btn" onClick={useDemo}>Synthetic demo</button> : <button className="dataset-demo-btn" onClick={useCasebook}>UNEP cases</button>}<a href="https://methanedata.unep.org/download-dataset" target="_blank" rel="noopener noreferrer" className="dataset-link">Get data ↗</a></div></div>{datasetError && <div className="dataset-error" role="alert"><Icon name="warning" size={15}/>{datasetError}<button onClick={()=>setDatasetError(null)}>Dismiss</button></div>}
        <div className="metrics-grid"><Metric icon="activity" label={realMode ? 'MARS source locations':'Sample methane sources'} value={filteredSources.length.toLocaleString()} change={realMode?'UNEP snapshot':'demo only'} variant="cyan" trail={[1,3,2,5,3,4,6]}/><Metric icon="flame" label={realMode?'Linked plume observations':'Synthetic observations'} value={realMode ? filteredSources.reduce((n,s)=>n+(s.observations?.length || s.plumeCount || 0),0).toLocaleString() : '18'} change={realMode?'not continuous':'demo only'} variant="orange" trail={[1,2,4,3,6,4,7]}/><Metric icon="people" label={realMode?'Sources with feedback':'Evidence records'} value={realMode ? filteredSources.filter(s=>s.feedback?.toLowerCase()==='yes').length.toLocaleString() : String(totalEvidence).padStart(2,'0')} change={realMode?'not mitigation':'fixture records'} variant="teal" trail={[2,3,3,4,4,6,8]}/><Metric icon="shield" label={realMode?'Mitigation verified by us':'Confirmed in fixture'} value={realMode?'—':String(insights).padStart(2,'0')} change={realMode?'not assessed':'not physical proof'} variant="violet" trail={[2,2,3,4,3,5,5]}/><div className="period-card"><Icon name="calendar" size={21}/><div><select aria-label="Observation date range" value={range} onChange={e=>setRange(e.target.value)}><option>All observations</option><option>1 year</option><option>30 days</option></select><small>{realMode?'Filter by observation date':'No dated demo observations'}</small></div><Icon name="chevron" size={14}/></div></div>
        <div className="main-grid">
          <section id="explorer" className={`panel map-panel ${expandedMap?'expanded-map':''}`}><CardHeader title="Global Methane Activity" subtitle={realMode ? `UNEP MARS · ${realDatasetLabel}` : 'Real draggable world map · synthetic source markers until UNEP data imported'} action={<div className="map-controls"><select className="map-style-selector" aria-label="Map basemap style" value={mapTheme} onChange={e=>setMapTheme(e.target.value as MapTheme)}><option value="satellite">Satellite · natural color</option><option value="grayscale">Satellite · grayscale</option><option value="street">Street map</option><option value="dark">Dark map</option></select>{mapTheme==='grayscale' && <label className="map-gray-control"><span>Grayscale <output>{mapGrayPercent}%</output></span><input aria-label="Grayscale amount" type="range" min="0" max="100" step="5" value={mapGrayPercent} onChange={e=>setMapGrayPercent(Number(e.target.value))}/><small><span>Color</span><span>Monochrome</span></small></label>}<button type="button" className={`mini-btn projection-toggle ${mapProjection==='globe'?'projection-active':''}`} aria-label={globeSupported?'Toggle globe projection':'Globe projection unavailable in this browser'} aria-pressed={mapProjection==='globe'} title={globeSupported?'Toggle globe projection':'Globe view requires hardware-accelerated WebGL'} disabled={!globeSupported} onClick={()=>{setProjectionNotice(null);setMapProjection(v=>v==='globe'?'flat':'globe')}}>{mapProjection==='globe'?'Globe':'Flat'}</button><button className={`mini-btn ${filtersOpen?'mini-active':''}`} onClick={()=>setFiltersOpen(v=>!v)}><Icon name="filter" size={13}/> Filters</button><button className="mini-btn square" aria-label={expandedMap?'Close fullscreen map':'Open fullscreen map'} onClick={()=>setExpandedMap(v=>!v)}><Icon name={expandedMap?'close':'zoom'} size={15}/></button></div>}/>
            {projectionNotice && <div className="map-render-notice" role="status"><span>{projectionNotice}</span><button type="button" aria-label="Dismiss map rendering notice" onClick={()=>setProjectionNotice(null)}>Dismiss</button></div>}
            <div className="real-world-map"><MapPanelErrorBoundary><Suspense fallback={<div className="map-loading" role="status">Loading interactive map…</div>}><MapPanel key={mapRecoveryVersion} sources={filteredSources} selectedId={selectedId} onSelect={pickSource} onProjectionFallback={()=>{setGlobeRuntimeFailed(true);setMapProjection('flat');setGlobeSupported(false);setProjectionNotice('Globe view could not be rendered on this device; the map returned to flat view.');setMapRecoveryVersion(version=>version+1)}} onGlobeSupportChange={supported=>{if(globeRuntimeFailed)return;setGlobeSupported(supported);if(!supported)setProjectionNotice('Globe view requires hardware-accelerated WebGL; the current renderer is unavailable or software-based.')}} theme={mapTheme} grayPercent={mapGrayPercent} projection={mapProjection} focusOnly={onlySelected} expanded={expandedMap}/></Suspense></MapPanelErrorBoundary>
            {filtersOpen && <div className="real-map-filter"><strong><Icon name="filter" size={14}/> Source filters</strong><label>Region<select aria-label="Filter by region" value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option>All regions</option>{regions.map(item=><option key={item}>{item}</option>)}</select></label><label>Sector<select aria-label="Filter by sector" value={sectorFilter} onChange={e=>setSectorFilter(e.target.value)}><option>All sectors</option>{sectors.map(item=><option key={item}>{item}</option>)}</select></label><label><input type="checkbox" checked={onlySelected} onChange={e=>setOnlySelected(e.target.checked)}/> Show only selected source</label><small>{filteredSources.length.toLocaleString()} of {sources.length.toLocaleString()} mapped sources · {realMode ? 'UNEP casebook/snapshot' : 'synthetic fixtures'}</small><button className="text-link" onClick={()=>{setCountryFilter('All regions');setSectorFilter('All sectors');setRange('All observations');setOnlySelected(false);}}>Clear filters</button></div>}
            {source && <div className="real-map-selection"><small>{realMode?'UNEP MARS SOURCE':'SYNTHETIC DEMO SOURCE'}</small><strong>{source.sourceId}</strong><span>{source.region}{source.lastObserved ? ` · ${source.lastObserved.slice(0,10)}` : ''}</span><button onClick={()=>{setExpandedMap(false);document.getElementById('case')?.scrollIntoView({behavior:'smooth'});}}>Inspect source <Icon name="arrowRight" size={13}/></button></div>}
            </div><div className="map-data-footer"><span>Map tiles: OpenFreeMap / Esri · Source data: {realMode?'UNEP IMEO (CC BY-NC-SA 4.0)':'synthetic demo'}</span><span>{realMode?'Density shading is illustrative, not methane concentration or plume shape · imported provenance not independently authenticated':'Import official GeoJSON to view observations · density shading is illustrative'}</span></div>
          </section>
          <section className="panel activity-panel"><CardHeader title={realMode?"Latest recorded observations":"Recent Activity"} subtitle={realMode?`From ${realDatasetLabel}`:"Synthetic demo fixtures"} action={<button className="text-link" onClick={()=>setShowNotice(true)}>View all <Icon name="arrowRight" size={13}/></button>}/><div className="activity-list">
            {(realMode ? [...sources].filter(s=>s.lastObserved).sort((a,b)=>(b.lastObserved||'').localeCompare(a.lastObserved||'')).slice(0,5).map(s=>({icon:'flame' as IconName,cls:'orange',title:s.sourceId,desc:s.region,time:(s.lastObserved||'').slice(0,10)})) : [{icon:'flame' as IconName,cls:'orange',title:'Illustrative plume identified',desc:'Synthetic observations',time:'Sample event'}, {icon:'people' as IconName,cls:'teal',title:'Notification evidence added',desc:'DEMO-001 · synthetic fixture',time:'Sample event'}, {icon:'file' as IconName,cls:'violet',title:'Reference attached',desc:'DEMO-002 · synthetic evidence',time:'Sample event'}, {icon:'sparkles' as IconName,cls:'blue',title:'Audit workflow available',desc:'Rule-based baseline',time:'Try it now'}, {icon:'shield' as IconName,cls:'teal',title:'Verification module ready',desc:'Requires Sepolia configuration',time:'Not anchored'}]).map((item,i)=><button key={i} className="activity-row" onClick={()=>{ if(realMode) pickSource(item.title); const t = realMode?'case':i===3?'auditor':i===4?'blockchain':'case';document.getElementById(t)?.scrollIntoView({behavior:'smooth'}) }}><span className={`activity-image ${item.cls}`}><Icon name={item.icon} size={19}/></span><span className="activity-text"><strong>{item.title}</strong><small>{item.desc}</small></span><span className="activity-time">{item.time}</span></button>)}
          </div><div className="activity-bottom"><span className="live-dot"/> {realMode ? 'Source: UNEP official snapshot · not live' : `API status: ${isError?'offline fallback':'connected to demo API'}`}</div></section>
        </div>
        <div className="details-grid">
          <section id="case" className="panel case-panel"><CardHeader title="Source & Case Analysis" action={<button className="text-link" onClick={()=>setShowReport(true)}>View case <Icon name="arrowRight" size={13}/></button>}/><div className="case-headline"><h2>{source?.sourceId || 'DEMO-001'}</h2><Chip tone={realMode?"teal":"orange"}>{caseSourceBadge}</Chip><Chip tone="teal">{realMode?"Unassessed":"Open review"}</Chip></div><div className="case-location"><Icon name="pin" size={13}/>{local(source)} <span className="dot-divide">·</span> {realMode?(source.sector || "Sector not listed"):"Illustrative facility"} <span className="dot-divide">·</span> {source?.lat.toFixed(2)}°, {source?.lon.toFixed(2)}°</div><div className="case-tabs">{['Overview','Observations','Evidence','Timeline'].map(t=><button key={t} className={caseTab===t?'tab-active':''} onClick={()=>setCaseTab(t)}>{t}</button>)}</div>
            {caseTab==='Overview' && <div className="source-overview"><div className="site-image"><img src={`${assets}site-demo.webp`} alt="Synthetic facility concept imagery"/><span>{realMode?"ILLUSTRATION ONLY":"DEMO SITE ART"}</span></div><div className="source-facts"><div><span>Source ID</span><strong>{source.sourceId}</strong></div><div><span>Facility</span><strong>{source.name}</strong></div><div><span>Sector</span><strong>{realMode?(source.sector||"Not reported"):"Illustrative energy"}</strong></div><div><span>Observations</span><strong>{realMode?`${source.plumeCount ?? source.observations?.length ?? 0} recorded plume(s)`:"Sample records only"}</strong></div><div><span>Last observed</span><strong>{realMode?(source.lastObserved?.slice(0,10)||"Not reported"):"Fixture only"}</strong></div><div><span>MARS notified / feedback · source-level</span><strong>{realMode?`Notified ${source.notified||'Not reported'} · feedback ${source.feedback||'Not reported'}`:'Synthetic fixture records'}</strong></div><div><span>Feedback reporters · source-level</span><strong>{realMode?`Operator ${source.feedbackOperator||'Not reported'} · government ${source.feedbackGovernment||'Not reported'}`:'Synthetic fixture records'}</strong></div><div><span>Casebook provenance · license</span><strong title={sourceArchiveHash}>{realMode?`${sourceRetrievedAt?.slice(0,10)||'Date not reported'} · ${sourceLicense||'License not reported'} · SHA ${sourceArchiveHash?.slice(0,12)||'not recorded'}`:'Synthetic data only'}</strong></div><div><span>Verification</span><strong>Not independently certified</strong></div></div></div>}
            {caseTab==='Observations' && <div className="case-detail-list"><p>{realMode?`Actual satellite-detection records in the ${realDatasetLabel}. An absence of detections does not establish mitigation.`:"Illustrative observations and locations; these are not actual satellite detections."}</p>{sourceEvidence.filter(e=>e.kind==='detection').map(e=><div key={e.id}><Icon name="activity" size={14}/><b>{e.title}</b><small>{e.date}</small></div>)}</div>}
            {caseTab==='Evidence' && <div className="case-detail-list"><p>{realMode?"Plume references are satellite observations only—not operator repairs or physical mitigation certifications.":"Evidence attached to the deterministic test fixture."}</p>{sourceEvidence.map(e=><div key={e.id}><Icon name="file" size={14}/><b>{e.title}</b><small>{e.kind.replaceAll('_',' ')}</small></div>)}</div>}
            {caseTab==='Timeline' && <div className="case-detail-list"><p>{realMode?"Dated observations, not a continuous emission or operator-action timeline.":"Sorted fixture chronology—not an operator action history."}</p>{[...sourceEvidence].sort((a,b)=>(a.date || '').localeCompare(b.date || '')).map(e=><div key={e.id}><Icon name="clock" size={14}/><b>{e.date || 'Date not reported'}</b><small>{e.title}</small></div>)}</div>}
            <div className="status-timeline"><strong>Evidence progression <span>{realMode?"OBSERVATIONS ONLY":"DEMO"}</span></strong><div className="timeline-steps">{(realMode ? [{title:"Observed",sub:source.lastObserved?.slice(0,10)||"Recorded",tone:"teal"},{title:"Notified",sub:source.notified||"Unknown",tone:"blue"},{title:"Feedback",sub:source.feedback||"Unknown",tone:"orange"},{title:"Mitigation",sub:"Not assessed",tone:"muted"}] : [{title:"Detected",sub:"Fixture observation",tone:"teal"},{title:"Notified",sub:"If documented",tone:"blue"},{title:"Reviewed",sub:"Audit available",tone:"orange"},{title:"Verified",sub:"Requires proof",tone:"muted"}]).map((t,i)=><div className={`timeline-step step-${t.tone}`} key={t.title}><div className="timeline-point"/><b>{t.title}</b><small>{t.sub}</small></div>)}</div></div>
          </section>
          <div className="middle-stack"><section className="panel chart-panel"><CardHeader title={realMode?'Methane Flux Observations':'Emissions Trend'} action={realMode?<span className="micro-label">OBSERVED POINTS · kg/h</span>:<select className="small-select" aria-label="Chart range" value={range} onChange={e=>setRange(e.target.value)}><option>6 months</option><option>30 days</option></select>}/>{realMode?<ObservationChart source={source}/>:<TrendChart range={range}/>}</section><section className="panel gallery-panel"><CardHeader title="Observation Gallery" action={<span className="micro-label">ILLUSTRATIVE THUMBNAILS</span>}/><div className="gallery-row">{[1,2,3,4,5].map((n)=><button key={n} className={`gallery-thumb ${docIndex%5===n-1?'picked':''}`} onClick={()=>setDocIndex(n-1)}><img src={`${assets}observation-${n}.webp`} alt={`Synthetic thumbnail ${n}`}/><span>Sample {n}</span></button>)}</div><span className="gallery-disclaimer">{realMode?"These thumbnails are decorative. Use the source metadata/chart for actual UNEP observations.":"Generated visual references—not real satellite imagery."}</span></section></div>
          <section id="auditor" className="panel auditor-panel">
            <CardHeader title="Evidence Auditor" icon="sparkles" action={<Chip tone="teal">RULES BASELINE · NO MODEL</Chip>}/>
            <p className="module-intro">{realMode ? 'The deterministic baseline checks the selected claim against the pinned MARS case fields. It does not read linked report contents or certify physical repair.' : 'The synthetic fixture exercises the same deterministic evidence-coverage rules. No hosted model is connected.'}</p>
            <label htmlFor="claim" className="field-small">CLAIM TO EVALUATE</label>
            <select className="claim-select" id="claim" value={claim} onChange={e=>{setClaim(e.target.value as ClaimType);setAudit(null);}}>{(Object.keys(claimLabels) as ClaimType[]).map(type=><option value={type} key={type}>{claimLabels[type]}</option>)}</select>
            <button className="primary-btn run-btn" disabled={auditMutation.isPending || !sourceCanBeAudited} onClick={()=>auditMutation.mutate({sourceId: source.sourceId, claimType:claim})}><Icon name={auditMutation.isPending?'refresh':'sparkles'} size={15}/>{auditMutation.isPending?'Checking...':'Run evidence audit'}<Icon name="arrow" size={15}/></button>
            <p className="claim-hint">{claimDescriptions[claim]} {sourceCanBeAudited ? 'The result applies only to this claim category and the cited records.' : 'This imported source is not one of the reviewed casebook cases.'}</p>
            {auditMutation.isError && <div className="inline-error">The API could not save or evaluate this audit. Check the API connection and storage status.</div>}
            <div className={`auditor-result ${verdictTone}`}><div className="result-top"><Icon name={audit?.result==='supported'?'check':'warning'} size={21}/><span>{audit?warning:'Awaiting audit'}</span></div><p>{alertText}</p><span className="result-foot">{audit ? 'DETERMINISTIC BASELINE RESULT' : 'AUDIT NOT RUN'} · {audit?.anchored?'ON CHAIN':'NOT ANCHORED'}</span></div>
            {audit && <div className="audit-citations" aria-live="polite"><strong>Evidence cited · revision {audit.revision}</strong>{audit.bundle.citedEvidence.length ? audit.bundle.citedEvidence.map(item=><div key={item.id}><span>{item.kind.replaceAll('_',' ')}</span><a href={item.reference} target="_blank" rel="noreferrer">{item.title} ↗</a><small>{item.id}{item.date ? ` · ${item.date}` : ' · date not reported'}</small></div>) : <p>No evidence of the required type is available in this bundle. A linked report title is not treated as reviewed report content.</p>}{audit.bundle.externalEvidence.map(item=><div key={item.url}><span>external report · link only</span><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a><small>{item.publisher || 'Publisher not stated'} · {item.reportDate || 'date not reported'} · {item.license}</small></div>)}</div>}
            <div className="audit-counts"><div><strong>{sourceEvidence.filter(e=>e.kind==='detection').length}</strong><span>Observation records</span></div><div><strong>{sourceEvidence.filter(e=>e.kind==='notification').length}</strong><span>Notification records</span></div><div><strong>{sourceEvidence.filter(e=>e.kind==='contradiction').length}</strong><span>Explicit contradictions</span></div></div>
          </section>
          <div className="verification-stack">
            <section id="documents" className="panel documents-panel">
              <CardHeader title={realMode ? 'Official MARS case links' : 'Demo evidence references'} action={<Chip tone={realMode?'teal':'orange'}>{realMode ? 'LINKS · REPORTS NOT COPIED' : 'SYNTHETIC'}</Chip>}/>
              <div className="case-detail-list">
                {source.externalEvidence?.length ? source.externalEvidence.map(item=><div key={item.url}><Icon name="file" size={14}/><b>{item.title}</b><small>{item.publisher || 'Publisher not stated'} · {item.reportDate || 'date not reported'}</small><a href={item.url} target="_blank" rel="noreferrer">Open official record ↗</a><small>License: {item.license}. Report content is not embedded or independently reviewed.</small></div>) : <p>No external case report is linked to this source.</p>}
                {sourceEvidence.map(item=><div key={item.id}><Icon name="activity" size={14}/><b>{item.title}</b><small>{item.id}{item.date ? ` · ${item.date}` : ' · date not reported'}</small><a href={item.reference} target="_blank" rel="noreferrer">Open dataset reference ↗</a></div>)}
              </div>
              <div className="document-footer"><Icon name="info" size={12}/> Case links are metadata; no third-party report text or satellite image is reproduced here.</div>
            </section>
            <section id="blockchain" className="panel chain-panel">
              <CardHeader title="Blockchain Verification" action={<Chip tone={audit?.anchored?'teal':'orange'}>{audit?.anchored?'Anchored':'Not anchored'}</Chip>}/>
              <div className="chain-status"><Icon name="shield" size={18}/><div><strong>{audit?.anchored?'Receipt recorded':'No chain receipt'}</strong><span>{audit?.anchored?'A transaction and matching registry event are saved with this audit revision.':'No public testnet transaction is claimed for this audit.'}</span></div></div>
              <div className="chain-detail"><div><span>Bundle SHA-256</span><strong className="mono">{audit?.bundleHash || 'Not generated'}</strong></div><div><span>Network</span><strong>Sepolia · optional</strong></div><div><span>Receipt version</span><strong>{audit?.receipt?.version ?? '—'}</strong></div><div><span>Issuer</span><strong className="mono">{audit?.receipt?.issuer || '—'}</strong></div><div><span>Block</span><strong>{audit?.receipt?.blockNumber || '—'}</strong></div><div><span>Verification</span><strong>{verification||'Not checked'}</strong></div></div>
              {audit?.chainTxHash && <a className="chain-explorer-link" href={`https://sepolia.etherscan.io/tx/${audit.chainTxHash}`} target="_blank" rel="noreferrer">View transaction on Sepolia ↗</a>}
              <div className="chain-actions"><button onClick={copyHash} disabled={!audit}><Icon name={copied?'check':'copy'} size={13}/>{copied?'Copied':'Copy hash'}</button><button onClick={()=>audit&&verifyMutation.mutate(audit.auditId)} disabled={!audit?.anchored||verifyMutation.isPending}><Icon name="shield" size={13}/>{verifyMutation.isPending?'Checking':'Verify receipt'}</button></div>
              <small className="chain-limitation">A receipt verifies the stored digest and version chronology; it does not prove methane mitigation.</small>
            </section>
          </div>
          <section id="reports" className="panel report-panel"><CardHeader title="Audit Report" action={<button className="mini-btn" onClick={()=>setShowReport(true)}><Icon name="external" size={13}/></button>}/><div className="report-doc-icon"><Icon name="file" size={24}/><div><strong>Evidence Assessment</strong><span>{source.sourceId}</span></div></div><div className={`report-verdict ${verdictTone}`}><Icon name={audit?.result==='supported'?'check':'info'} size={16}/>{audit?warning:'Pending audit'}</div><div className="report-summary-label">EXECUTIVE SUMMARY</div><p className="report-summary">{audit ? audit.reason : realMode ? 'UNEP MARS records historical detections and source-level response fields. Physical mitigation has not been independently established by this prototype.' : 'Run the deterministic baseline against a synthetic fixture. Missing confirmation is not proof of physical non-mitigation.'}</p><div className="report-summary-label">CURRENT FINDINGS</div><div className="findings"><div><Icon name="check" size={14}/><span>{sourceEvidence.length} {realMode?'MARS evidence records':'fixture evidence records'}</span></div><div><Icon name="info" size={14}/><span>{realMode?'Historical MARS casebook':'Data marked synthetic'}</span></div><div><Icon name="warning" size={14}/><span>Mitigation outcome not independently established</span></div><div><Icon name="shield" size={14}/><span>{audit?.anchored?'Receipt can be checked':'On-chain verification not assumed'}</span></div></div><button className="download-report" onClick={exportReport}><Icon name="download" size={14}/> Download JSON report</button></section>
        </div>
        <footer className="footer"><span>© 2026 MethaneResponse · Research prototype · No UNEP/IEEE affiliation</span><span>Built for transparent evidence, not unsupported climate claims <Icon name="shield" size={13}/></span></footer>
      </main>
    </div>
    {showNotice && <div className="modal-overlay" onMouseDown={()=>setShowNotice(false)}><div className="info-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setShowNotice(false)}><Icon name="close"/></button><div className="modal-kicker">PROTOTYPE DISCLOSURE</div><h2>Designed for evidence integrity</h2><p>This UI uses a real draggable geospatial basemap (OpenFreeMap or Esri). In demonstration mode all methane sources and charts are synthetic. Imported official UNEP MARS GeoJSON is historical snapshot data, not live monitoring. Only the three curated MARS casebook sources can be audited; full-snapshot imports are map-only. Audits use a deterministic rules baseline, not an AI model. Audit results persist through the configured API store. No public Sepolia transaction is claimed unless a registry is configured and a receipt is independently verified.</p><button className="primary-btn" onClick={()=>setShowNotice(false)}>Understood <Icon name="check" size={15}/></button></div></div>}
    {showReport && <div className="modal-overlay" onMouseDown={()=>setShowReport(false)}><div className="report-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><div className="modal-kicker">METHANE RESPONSE / AUDIT PREVIEW</div><h2>Evidence report · {selectedId}</h2></div><button className="modal-x" onClick={()=>setShowReport(false)}><Icon name="close"/></button></div><div className="report-modal-info"><div><small>Selected facility</small><strong>{source.name}</strong></div><div><small>Claim</small><strong>{claimLabels[claim]}</strong></div><div><small>Result</small><strong>{audit ? warning : 'Not yet evaluated'}</strong></div><div><small>Blockchain</small><strong>{audit?.anchored?'Receipt submitted':'Not anchored'}</strong></div></div><p className="report-modal-note">{realMode?'Actual UNEP observations have been imported. No independent audit or mitigation confirmation has been performed for this real source.':audit?.reason || 'Run an evidence audit to generate an actual API result. This report currently contains only synthetic fixtures.'}</p><h3>Evidence references</h3><div className="modal-evidences">{sourceEvidence.map(e=><div key={e.id}><Icon name="file" size={15}/><span>{e.title}<small>{e.id} · {e.date}</small></span><Chip tone={realMode?"teal":"orange"}>{realMode?"MARS PLUME":"SYNTHETIC"}</Chip></div>)}</div><div className="modal-bottom"><span>No physical methane mitigation is certified by this report.</span><button className="primary-btn" onClick={exportReport}><Icon name="download" size={15}/> Export report JSON</button></div></div></div>}
  </div>;
}
