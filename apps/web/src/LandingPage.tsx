import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getLandingEvidenceReview } from './landing-evidence';
import { LandingObservationVisual } from './LandingObservationVisual';
import './landing.css';
import './landing-premium.css';
import './landing-evidence-visual.css';

type LandingIcon = 'arrow' | 'arrowUpRight' | 'globe' | 'file' | 'shield' | 'spark' | 'check' | 'alert' | 'map' | 'bars' | 'link' | 'lock' | 'menu' | 'close' | 'play' | 'layers' | 'database' | 'target' | 'external' | 'chevron' | 'clock';
const pathMap: Record<LandingIcon, ReactNode> = {
  arrow: <><path d="M4 12h16m-7-7 7 7-7 7"/></>,
  arrowUpRight: <><path d="M6 18 18 6M7 6h11v11"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/></>,
  shield: <><path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="m8 12 2.5 2.5L16 9"/></>,
  spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17z"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15"/></>,
  bars: <><path d="M4 20V10m5 10V4m5 16V8m5 12V2"/></>,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></>,
  lock: <><rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="M5 5 19 19M19 5 5 19"/>,
  play: <path d="m8 5 11 7-11 7V5z"/>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
};
function I({ name, size = 20, className = '' }: { name: LandingIcon; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{pathMap[name]}</svg>;
}
function formatUtcDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1];
  return `${day} ${monthLabel} ${year} UTC`;
}
function Mark({ compact = false }: { compact?: boolean }) {
  return <span className={`lp-brand ${compact ? 'lp-brand-compact' : ''}`}>
    <span className="lp-brand-logo" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14.5" fill="none" stroke="white" strokeWidth="2.3" strokeDasharray="71 24" transform="rotate(-35 20 20)"/><path d="M8 28C13 17 25 10 34 7c-5 12-13 23-26 21z" fill="#17ead2"/><path d="m10 27 19-15" stroke="#073b3c" strokeWidth="2.2" strokeLinecap="round"/></svg></span>
    <span>Methane<span className="lp-brand-accent">Response</span></span>
  </span>;
}

const features: { icon: LandingIcon; color: string; num: string; title: string; description: string; tag: string; href: string; action: string }[] = [
  { icon: 'globe', color: 'cyan', num: '01', title: 'Explore methane observations worldwide.', description: 'Inspect source IDs, historical plume dates, reported flux and uncertainty from the versioned MARS snapshot. The archive is historical, not live.', tag: 'HISTORICAL MARS DATA', href: '/dashboard/map?sourceId=KAZ_S_159', action: 'Explore the map' },
  { icon: 'bars', color: 'violet', num: '02', title: 'Prioritize what to investigate.', description: 'Review recurrence, anomaly screening and a transparent priority score. It is a heuristic for triage, not a probability of future leakage.', tag: 'EXPLAINABLE TRIAGE · NOT A FORECAST', href: '/dashboard/audit?sourceId=KAZ_S_159', action: 'View investigation analysis' },
  { icon: 'spark', color: 'mint', num: '03', title: 'Check claims against evidence.', description: 'Run the rules baseline on pinned observations. Add an authorized document excerpt for optional AI citations and human review when a provider is configured.', tag: 'RULES AVAILABLE · AI OPTIONAL', href: '/dashboard/audit?sourceId=KAZ_S_159', action: 'Open Evidence Auditor' },
  { icon: 'shield', color: 'violet', num: '04', title: 'Keep audit changes detectable.', description: 'Verify a saved report digest locally. A Sepolia receipt is optional and only appears after a real authorized transaction.', tag: 'SHA-256 · OPTIONAL SEPOLIA', href: '/dashboard/blockchain?sourceId=KAZ_S_159', action: 'Verify an audit' },
  { icon: 'file', color: 'cyan', num: '05', title: 'Bring research into one review.', description: 'Combine source history, provenance, linked references and assessment status, then export a hash-protected JSON report for further analysis.', tag: 'SOURCE LINKS · JSON REPORT', href: '/dashboard/reports?sourceId=KAZ_S_159', action: 'Open report workspace' },
  { icon: 'target', color: 'mint', num: '06', title: 'Separate response from mitigation.', description: 'See detection, notification metadata, operator feedback and independently verified mitigation as distinct states. Missing evidence stays unknown.', tag: 'FOLLOW-UP TRANSPARENCY', href: '/dashboard/cases?sourceId=KAZ_S_159', action: 'Inspect a source case' },
];

const steps = [
  { number: '01', title: 'Observe', content: 'Import public methane observations with source IDs, dates, flux estimates and provenance.', icon: 'globe' as LandingIcon },
  { number: '02', title: 'Connect', content: 'Attach operator responses, official reports and evidence to a specific, reviewable claim.', icon: 'link' as LandingIcon },
  { number: '03', title: 'Evaluate', content: 'Run the available rules baseline. Optional document AI returns exact citations when configured; a human reviewer decides what to publish.', icon: 'target' as LandingIcon },
  { number: '04', title: 'Verify', content: 'Verify an optional testnet receipt when one exists. It establishes record integrity, not physical methane mitigation.', icon: 'shield' as LandingIcon },
];

interface LandingPageProps { onOpenDashboard: () => void }
export default function LandingPage({ onOpenDashboard }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const evidenceReview = getLandingEvidenceReview();
  useEffect(() => {
    const close = () => setMobileMenuOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);
  return <div className="lp-shell" id="top">
    <a className="lp-skip" href="#lp-hero-title">Skip to content</a>
    <div className="lp-announcement"><span className="lp-announcement-dot"/> RESEARCH PROTOTYPE · IEEE CLIMATECHAIN 2026 <span className="lp-announcement-separator">/</span> <span>Evidence matters more than assumptions.</span></div>
    <header className="lp-header">
      <div className="lp-container lp-navbar">
        <a href="#top" aria-label="MethaneResponse homepage" className="lp-brand-link"><Mark/></a>
        <nav className={`lp-navigation ${mobileMenuOpen ? 'lp-navigation-open' : ''}`} aria-label="Website navigation">
          <a href="#platform" onClick={() => setMobileMenuOpen(false)}>Platform</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#methodology" onClick={() => setMobileMenuOpen(false)}>Methodology</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
        </nav>
        <div className="lp-nav-actions"><span className="lp-nav-lab"><span className="lp-live-point"/> Prototype preview</span><button className="lp-btn lp-btn-solid lp-nav-launch" onClick={onOpenDashboard}>Open Dashboard <I name="arrowUpRight" size={17}/></button></div>
        <button className="lp-menu-toggle" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><I name={mobileMenuOpen ? 'close' : 'menu'} size={23}/></button>
      </div>
    </header>

    <main>
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-stars" aria-hidden="true"/>
        <div className="lp-hero-wash" aria-hidden="true"/>
        <div className="lp-container lp-hero-layout">
          <div className="lp-hero-copy">
            <div className="lp-hero-kicker"><span className="lp-kicker-glyph">◈</span> EVIDENCE-BASED CLIMATE INTELLIGENCE <span className="lp-kicker-line"/></div>
            <h1 id="lp-hero-title">From Methane<br/>Observations to<br/><span>Verifiable Action<span className="lp-heading-dot">.</span></span></h1>
            <p className="lp-hero-description">A clearer way to examine methane mitigation claims. Connect satellite observations, documented responses, and independent evidence reviews—then make every audit traceable.</p>
            <div className="lp-hero-buttons"><button className="lp-btn lp-btn-solid lp-btn-large" onClick={onOpenDashboard}>Explore the Dashboard <I name="arrow" size={19}/></button><a className="lp-btn lp-btn-outline lp-btn-large" href="#how-it-works"><span className="lp-play-circle"><I name="play" size={12}/></span> How it Works</a></div>
            <p className="lp-hero-footnote"><I name="shield" size={14}/> Independent prototype · Not affiliated with UNEP or IEEE</p>
            <div className="lp-hero-trust"><span><I name="database" size={19}/> Source-linked data</span><span><I name="spark" size={19}/> Rules-based review</span><span><I name="lock" size={19}/> Receipt verification</span></div>
          </div>
          <div className="lp-hero-observation">
            <LandingObservationVisual review={evidenceReview}/>
          </div>
        </div>
        <a className="lp-scroll-cue" href="#platform"><span/> SCROLL TO EXPLORE <I name="chevron" size={15}/></a>
      </section>

      <div className="lp-proof-ribbon"><div className="lp-container lp-ribbon-inner"><span className="lp-ribbon-label">THE EVIDENCE CHAIN</span><span>Satellite observation</span><I name="arrow" size={16}/><span>Mitigation claim</span><I name="arrow" size={16}/><span>Evidence assessment</span><I name="arrow" size={16}/><span>Optional receipt</span></div></div>

      <section className="lp-section lp-platform-section" id="platform" aria-labelledby="lp-platform-heading">
        <div className="lp-container">
          <div className="lp-section-top"><div><div className="lp-eyebrow">THE PLATFORM <span> / 01</span></div><h2 id="lp-platform-heading">The evidence behind<br/><em>every climate claim.</em></h2></div><p>Detection systems help us see emissions. MethaneResponse is designed to help us examine what happens next—without confusing reports, observations, and proof.</p></div>
          <div className="lp-feature-grid">{features.map(f=><article className={`lp-feature lp-feature-${f.color}`} key={f.num}><div className="lp-feature-top"><span className="lp-feature-symbol"><I name={f.icon} size={25}/></span><span className="lp-feature-number">{f.num} / 06</span></div><div><span className="lp-feature-tag">{f.tag}</span><h3>{f.title}</h3><p>{f.description}</p><a className="lp-feature-action" href={f.href}>{f.action}<I name="arrowUpRight" size={15}/></a></div></article>)}</div>
        </div>
      </section>

      <section className="lp-section lp-product-section" id="workspace" aria-labelledby="lp-workspace-heading"><div className="lp-container lp-product-layout">
        <div className="lp-product-copy"><div className="lp-eyebrow">THE WORKSPACE <span> / 02</span></div><h2 id="lp-workspace-heading">From a data point<br/>to the <em>full story.</em></h2><p>One workspace for exploring observations, interpreting response evidence and checking an audit trail. Follow the reasoning—not just the result.</p><div className="lp-product-list"><div><span><I name="map" size={19}/></span><div><strong>Geospatial context</strong><small>Source, location and observation history</small></div></div><div><span><I name="file" size={19}/></span><div><strong>Reviewable conclusions</strong><small>Evidence citations and explicit uncertainty</small></div></div><div><span><I name="lock" size={19}/></span><div><strong>Integrity checks</strong><small>Cryptographic verification of audit versions</small></div></div></div><button className="lp-inline-link" onClick={onOpenDashboard}>Enter the workspace <I name="arrow" size={19}/></button></div>
        <div className="lp-product-visual">
          <article className="lp-source-reference">
            <header className="lp-source-reference-head">
              <span><I name="database" size={17}/> LINKED PUBLISHER RECORD</span>
              <span>METADATA REVIEW ONLY</span>
            </header>
            <div className="lp-source-reference-body">
              <p>{evidenceReview.report.publisher} · {evidenceReview.sourceId}</p>
              <h3>{evidenceReview.report.title}</h3>
              <p className="lp-source-reference-summary">{evidenceReview.report.publisherSummary}</p>
              <dl>
                <div><dt>Case location</dt><dd>{evidenceReview.country} · {evidenceReview.sourceId}</dd></div>
                <div><dt>Publisher record date</dt><dd>{formatUtcDay(evidenceReview.report.reportDate)}</dd></div>
                <div><dt>Observation snapshot</dt><dd>{evidenceReview.provenance.snapshotId}</dd></div>
                <div><dt>Review scope</dt><dd>Publisher metadata; PDF not independently re-audited</dd></div>
              </dl>
              <a href={evidenceReview.report.url} target="_blank" rel="noreferrer">Open the official UNEP item<I name="external" size={16}/></a>
            </div>
            <footer>Linked source only. A publisher statement and an integrity receipt do not independently establish physical repair or sustained emissions cessation.</footer>
          </article>
        </div>
      </div></section>

      <section className="lp-section lp-how-section" id="how-it-works" aria-labelledby="lp-how-heading"><div className="lp-container"><div className="lp-centered-heading"><div className="lp-eyebrow">HOW IT WORKS <span> / 03</span></div><h2 id="lp-how-heading">A complete trail.<br/><em>No missing steps.</em></h2><p>A transparent, reviewable process from the first observation through the final evidence receipt.</p></div><div className="lp-steps-grid">{steps.map(s=><div className="lp-step" key={s.number}><span className="lp-step-number">{s.number}</span><span className="lp-step-icon"><I name={s.icon} size={25}/></span><h3>{s.title}</h3><p>{s.content}</p><span className="lp-step-dash"/></div>)}</div></div></section>

      <section className="lp-section lp-judgement-section" id="methodology" aria-labelledby="lp-method-heading">
        <div className="lp-container lp-judgement-grid">
          <div className="lp-judgement-intro">
            <div className="lp-eyebrow">BUILT ON SCIENTIFIC HONESTY <span> / 04</span></div>
            <h2 id="lp-method-heading">Evidence with<br/><em>a clear boundary.</em></h2>
            <p>Review what a source actually reports, compare it with the dated MARS observations, and keep publisher statements separate from an independent reassessment.</p>
            <div className="lp-method-points">
              <span><I name="check" size={17}/> Attributable official source</span>
              <span><I name="check" size={17}/> Observation dates, flux and uncertainty</span>
              <span><I name="check" size={17}/> Explicit review limits</span>
            </div>
          </div>

          <article className="lp-case-review" aria-labelledby="lp-case-review-title">
            <header className="lp-case-review-header">
              <span><I name="database" size={16}/> REAL HISTORICAL CASE</span>
              <code>{evidenceReview.sourceId}</code>
            </header>
            <div className="lp-case-review-title">
              <div><h3 id="lp-case-review-title">{evidenceReview.country} · {evidenceReview.sector}</h3><p>UNEP IMEO MARS source record</p></div>
              <span className="lp-case-review-tag">UNEP ITEM · INTERNAL REVIEW ONLY</span>
            </div>
            <div className="lp-case-review-claim">
              <span>REVIEW SCOPE</span>
              <p>{evidenceReview.report.publisherSummary}</p>
            </div>
            <p className="lp-case-review-boundary">This records the publisher’s statement. MethaneResponse has not independently re-audited the linked PDF or verified sustained emissions cessation.</p>

            <section className="lp-case-observations" aria-labelledby="lp-observation-title">
              <div className="lp-case-observation-heading"><h4 id="lp-observation-title">Linked historical observations</h4><span>Reported flux ± standard deviation · kg/h</span></div>
              <ol>
                {evidenceReview.observations.map((observation) => (
                  <li key={observation.plumeId}>
                    <time dateTime={observation.date}>{formatUtcDay(observation.date)}</time>
                    <strong>{observation.fluxKgHr === null ? 'Not reported' : `${observation.fluxKgHr.toLocaleString('en-US')} ± ${observation.uncertaintyKgHr?.toLocaleString('en-US') ?? 'not reported'}`}</strong>
                    <small>{observation.satellite}</small>
                  </li>
                ))}
              </ol>
            </section>

            <div className="lp-case-report">
              <span>OFFICIAL UNEP ITEM · {formatUtcDay(evidenceReview.report.reportDate)}</span>
              <a href={evidenceReview.report.url} target="_blank" rel="noreferrer">{evidenceReview.report.title}<I name="external" size={15}/></a>
              <small>{evidenceReview.report.publisher} · {evidenceReview.report.license} · linked only; PDF not reproduced</small>
            </div>

            <div className="lp-case-review-note"><I name="alert" size={17}/><p>Latest linked record in this pinned casebook: 11 Jul 2026. No later row in this archive does not mean zero emissions.</p></div>

            <footer className="lp-case-review-footer">
              <span title={evidenceReview.provenance.archiveSha256}>Snapshot {evidenceReview.provenance.snapshotId} · archive retrieved {formatUtcDay(evidenceReview.provenance.retrievedAt)} · SHA-256 {evidenceReview.provenance.archiveSha256}</span>
              <a href={`/dashboard/audit?sourceId=${evidenceReview.sourceId}`}>Open in Evidence Auditor<I name="arrowUpRight" size={15}/></a>
            </footer>
          </article>
        </div>
      </section>

      <section className="lp-section lp-about-section" id="about" aria-labelledby="lp-about-heading"><div className="lp-container lp-about-grid"><div><div className="lp-eyebrow">TRANSPARENT BY DESIGN <span> / 05</span></div><h2 id="lp-about-heading">Built to complement<br/><em>existing climate science.</em></h2><p>MethaneResponse does not replace UNEP's Methane Alert and Response System, certify physical repairs, or claim that blockchain can determine scientific truth. It adds a proposed layer for examining published claims and verifying audit integrity.</p><a href="https://methanedata.unep.org/methane-alert-response-system" target="_blank" rel="noreferrer" className="lp-source-link">About UNEP MARS <I name="external" size={16}/></a></div><div className="lp-about-accordions">{[
        { q: 'Is this an official UNEP platform?', a: 'No. MethaneResponse is an independent research prototype. UNEP MARS is a separate system and remains the authoritative source for its own data and mitigation statements.' },
        { q: 'Does blockchain prove that emissions stopped?', a: 'No. A blockchain receipt can help verify the integrity and provenance of an audit record. It cannot validate a physical repair or make a disputed scientific conclusion correct.' },
        { q: 'Is the current dashboard using live methane data?', a: 'No. The dashboard loads a bundled, versioned historical UNEP MARS snapshot when available and falls back to curated MARS cases if it is not. It is not a live feed. The baseline can assess records in the pinned snapshot, while document review requires an authorized excerpt and an enabled server-side provider.' },
      ].map((item,idx)=><div className="lp-faq" key={item.q}><button aria-expanded={faqOpen===idx} onClick={()=>setFaqOpen(faqOpen===idx?null:idx)}><span>{item.q}</span><I name={faqOpen===idx?'close':'arrowUpRight'} size={18}/></button>{faqOpen===idx&&<p>{item.a}</p>}</div>)}</div></div></section>

      <section className="lp-bottom-cta"><div className="lp-container lp-bottom-cta-inner"><div className="lp-cta-aura" aria-hidden="true"/><div className="lp-eyebrow">GO BEYOND THE OBSERVATION</div><h2>Every claim should<br/>have a <em>clear trail.</em></h2><p>Explore the historical MARS workspace, review a source, and verify an audit digest.</p><button className="lp-btn lp-btn-solid lp-btn-large" onClick={onOpenDashboard}>Open Methane Workspace <I name="arrow" size={19}/></button><span>Historical source data · No physical mitigation certified</span></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer-main"><div><a href="#top" aria-label="Back to top"><Mark compact/></a><p>From observations to verifiable evidence.<br/>Research prototype for responsible climate data analysis.</p></div><div className="lp-footer-links"><div><strong>PLATFORM</strong><a href="#platform">Features</a><a href="#workspace">Workspace</a><a href="#how-it-works">How it works</a></div><div><strong>RESOURCES</strong><a href="#methodology">Methodology</a><a href="#about">Limitations</a><a href="https://methanedata.unep.org/methane-alert-response-system" target="_blank" rel="noreferrer">UNEP MARS <I name="external" size={12}/></a></div><div><strong>EXPLORE</strong><button onClick={onOpenDashboard}>Demo dashboard <I name="arrowUpRight" size={12}/></button><a href="#top">Back to top</a></div></div></div><div className="lp-footer-bottom"><span>© 2026 MethaneResponse. Independent research prototype. No affiliation with UNEP or IEEE.</span><span><I name="shield" size={15}/> Evidence before assumptions.</span></div></div></footer>
  </div>;
}
