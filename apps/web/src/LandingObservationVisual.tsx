import { buildLandingObservationChart, formatLandingObservationDate } from './landing-observation-visual';
import type { getLandingEvidenceReview } from './landing-evidence';

type LandingEvidenceReview = ReturnType<typeof getLandingEvidenceReview>;

function formatKgHr(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function LandingObservationVisual({ review }: { review: LandingEvidenceReview }) {
  const chart = buildLandingObservationChart(review.observations);
  const scaleMaximum = chart.axisMaximumKgHr;
  const yForTick = (value: number) => scaleMaximum === null
    ? 206
    : 206 - (value / scaleMaximum) * (206 - 32);

  return <figure className="lp-observation-figure" aria-labelledby="lp-observation-figure-title">
    <header className="lp-observation-figure-head">
      <div>
        <span className="lp-observation-kicker">HISTORICAL MARS OBSERVATIONS</span>
        <h2 id="lp-observation-figure-title">{review.sourceId}<span>{review.country} · {review.sector}</span></h2>
      </div>
      <span className="lp-observation-snapshot">{review.provenance.snapshotId}</span>
    </header>

    {scaleMaximum === null ? <p className="lp-observation-empty" role="status">No linked flux estimates are available to plot for this case.</p> : <>
      <div className="lp-observation-chart-wrap">
        <svg className="lp-observation-chart" viewBox="0 0 640 266" role="img" aria-labelledby="lp-observation-chart-title lp-observation-chart-description">
          <title id="lp-observation-chart-title">Reported historical source flux estimates for {review.sourceId}</title>
        <desc id="lp-observation-chart-description">Separate markers are ordered by date and spaced by record, not by elapsed time. Exact dates are listed below. Vertical bars show the publisher-reported standard deviation. There is no connecting line, and the display is not live.</desc>
          {chart.tickValuesKgHr.map(value => {
            const y = yForTick(value);
            return <g key={value} className="lp-observation-gridline">
              <line x1="90" y1={y} x2="550" y2={y}/>
              <text x="78" y={y + 4} textAnchor="end">{formatKgHr(value)}</text>
            </g>;
          })}
          <line className="lp-observation-axis" x1="90" y1="32" x2="90" y2="206"/>
          <line className="lp-observation-axis" x1="90" y1="206" x2="550" y2="206"/>
          {chart.points.map(point => <g className="lp-observation-point" key={point.plumeId}>
            <title>{`${formatLandingObservationDate(point.date)}: ${formatKgHr(point.valueKgHr)} kg/h${point.uncertaintyKgHr === null ? '' : ` ± ${formatKgHr(point.uncertaintyKgHr)} kg/h standard deviation`}; plume ${point.plumeId}`}</title>
            {point.upperY !== null && point.lowerY !== null && <>
              <line className="lp-observation-error" x1={point.x} y1={point.upperY} x2={point.x} y2={point.lowerY}/>
              <line className="lp-observation-error-cap" x1={point.x - 6} y1={point.upperY} x2={point.x + 6} y2={point.upperY}/>
              <line className="lp-observation-error-cap" x1={point.x - 6} y1={point.lowerY} x2={point.x + 6} y2={point.lowerY}/>
            </>}
            <circle className="lp-observation-dot" cx={point.x} cy={point.y} r="6"/>
          </g>)}
          <text className="lp-observation-axis-label" x="320" y="248" textAnchor="middle">OBSERVATION ORDER · UTC DATES BELOW · NOT TIME-SCALED</text>
          <text className="lp-observation-axis-label" transform="translate(19 119) rotate(-90)" textAnchor="middle">REPORTED FLUX · kg/h</text>
        </svg>
      </div>

      <ol className="lp-observation-values">
        {chart.points.map(point => <li key={point.plumeId}>
          <time dateTime={point.date}>{formatLandingObservationDate(point.date)}</time>
          <strong>{formatKgHr(point.valueKgHr)}{point.uncertaintyKgHr === null ? '' : ` ± ${formatKgHr(point.uncertaintyKgHr)}`} kg/h</strong>
          <small>{review.observations.find(observation => observation.plumeId === point.plumeId)?.satellite || 'Satellite not specified'}</small>
        </li>)}
      </ol>
    </>}

    {(chart.missingFluxCount > 0 || chart.invalidDateCount > 0) && <p className="lp-observation-omissions">
      {chart.missingFluxCount > 0 && `${chart.missingFluxCount} linked record${chart.missingFluxCount === 1 ? '' : 's'} without reported flux not plotted.`}
      {chart.invalidDateCount > 0 && ` ${chart.invalidDateCount} record${chart.invalidDateCount === 1 ? '' : 's'} with invalid observation dates not plotted.`}
    </p>}
    <figcaption className="lp-observation-figure-foot">
      <span>Historical estimates from a pinned UNEP MARS snapshot. Whiskers show reported ±1 standard deviation; horizontal spacing is not elapsed time.</span>
      <span>Not live, not continuous, and not proof of repair or emissions cessation.</span>
    </figcaption>
  </figure>;
}
