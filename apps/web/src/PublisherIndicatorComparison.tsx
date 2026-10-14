export type PublisherIndicatorComparisonData = {
  schemaVersion: 1;
  status: 'available' | 'not_available';
  datasetSnapshotId: string | null;
  inputFileSha256: string | null;
  asOfDate: string | null;
  target: string;
  horizonDays: number;
  modelVersion: string | null;
  realSourceCount: number;
  recurrencePredictionCount: number;
  invalidPredictionCount: number;
  persistencyCoverage: {
    numericReportedCount: number;
    missingCount: number;
    invalidCount: number;
    categoryReportedCount: number;
    categoryMissingCount: number;
    emissionStatusReportedCount: number;
    emissionStatusMissingCount: number;
  };
  probabilityByPersistencyCategory: {
    category: string;
    sourceCount: number;
    scoredSourceCount: number;
    medianProbability: number | null;
  }[];
  numericPersistencyComparison: {
    status: 'available' | 'not_available';
    reason: string | null;
    method: string;
    matchedSourceCount: number;
    spearmanRho: number | null;
    topDecileAgreement: {
      fraction: number;
      comparedSourceCount: number;
      selectedPerRanking: number;
      overlapCount: number;
      recurrenceOnlyCount: number;
      persistencyOnlyCount: number;
      tieBreak: string;
    } | null;
  };
  limitations: string[];
};

function count(value: number) {
  return value.toLocaleString('en-US');
}

export default function PublisherIndicatorComparison({
  comparison,
}: {
  comparison: PublisherIndicatorComparisonData;
}) {
  const coverage = comparison.persistencyCoverage;
  const rankComparison = comparison.numericPersistencyComparison;
  const topDecile = rankComparison.topDecileAgreement;

  return <section className="intel-publisher-comparison" aria-label="UNEP indicator cross-check">
    <header className="intel-publisher-heading">
      <div><small>SNAPSHOT-WIDE COMPARISON</small><h3>UNEP indicator cross-check</h3></div>
      <span>{comparison.status === 'available' ? 'DESCRIPTIVE' : 'NOT AVAILABLE'}</span>
    </header>
    <p className="intel-publisher-target">
      Later linked MARS archive-record estimate · {comparison.horizonDays}-day horizon · as of {comparison.asOfDate || 'date unavailable'} · snapshot {comparison.datasetSnapshotId || 'unavailable'}.
    </p>
    <div className="intel-publisher-coverage">
      <span><b>{count(coverage.numericReportedCount)} / {count(comparison.realSourceCount)}</b><small>numeric persistency values</small></span>
      <span><b>{count(coverage.categoryReportedCount)} / {count(comparison.realSourceCount)}</b><small>persistency categories</small></span>
      <span><b>{count(coverage.emissionStatusReportedCount)} / {count(comparison.realSourceCount)}</b><small>emission-status values reported</small></span>
    </div>
    {comparison.status === 'available' && rankComparison.status === 'available' && topDecile
      ? <div className="intel-publisher-rank" role="status">
        <b>Spearman rank association {rankComparison.spearmanRho?.toFixed(3)} across {count(rankComparison.matchedSourceCount)} matched sources</b>
        <span>Top-decile overlap {count(topDecile.overlapCount)} / {count(topDecile.selectedPerRanking)} · {count(topDecile.recurrenceOnlyCount)} recurrence-only · {count(topDecile.persistencyOnlyCount)} persistency-only.</span>
      </div>
      : <p className="intel-publisher-unavailable" role="status">Comparison unavailable: {rankComparison.reason || 'The pinned recurrence estimate did not pass validation.'}</p>}
    <details className="intel-publisher-categories">
      <summary>Median archive-record estimate by reported persistency category</summary>
      {comparison.probabilityByPersistencyCategory.length > 0
        ? <div className="intel-publisher-table-wrap"><table>
          <thead><tr><th scope="col">UNEP category</th><th scope="col">Sources</th><th scope="col">Scored</th><th scope="col">Median estimate</th></tr></thead>
          <tbody>{comparison.probabilityByPersistencyCategory.map(row => <tr key={row.category}>
            <th scope="row">{row.category}</th><td>{count(row.sourceCount)}</td><td>{count(row.scoredSourceCount)}</td>
            <td>{row.medianProbability === null ? 'Not available' : `${(row.medianProbability * 100).toFixed(1)}%`}</td>
          </tr>)}</tbody>
        </table></div>
        : <p>No reported persistency categories are available in this snapshot.</p>}
    </details>
    <p className="intel-publisher-limit">UNEP persistency is publisher metadata, not ground truth for a future leak or emissions outcome. Missing or invalid persistency is excluded from the comparison; missing emission status is unknown, not zero emissions.</p>
    <p className="intel-publisher-limit">This descriptive comparison is not independent model validation. The estimate concerns a later linked archive record only, not methane presence, future flux, repair, or mitigation.</p>
  </section>;
}
