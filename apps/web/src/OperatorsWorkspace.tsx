import { useMemo, useState } from 'react';
import type { MarsSource } from './mars';
import { formatCaseLocation, paginateCases, type CasePageSize } from './case-table';
import { filterOperatorRecords, summarizeOperatorMetadata, type OperatorMetadataFilter } from './operator-metadata';

type Props = {
  sources: MarsSource[];
  datasetLabel: string;
  onOpenCase: (source: MarsSource) => void;
  onReviewEvidence: (source: MarsSource) => void;
};

function metadataValue(value?: string | null) {
  return value?.trim() || 'Not reported';
}

export default function OperatorsWorkspace({ sources, datasetLabel, onOpenCase, onReviewEvidence }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OperatorMetadataFilter>('all');
  const [pageSize, setPageSize] = useState<CasePageSize>(25);
  const [requestedPage, setRequestedPage] = useState(1);
  const summary = useMemo(() => summarizeOperatorMetadata(sources), [sources]);
  const matchingSources = useMemo(() => filterOperatorRecords(sources, query, filter), [sources, query, filter]);
  const page = useMemo(() => paginateCases(matchingSources, requestedPage, pageSize), [matchingSources, requestedPage, pageSize]);

  return <div className="operators-workspace">
    <section className="operator-workflow" aria-labelledby="operator-workflow-title">
      <div><h2 id="operator-workflow-title">Review source-level response metadata</h2><p>{datasetLabel}. This workspace displays applicable status values supplied with source records, including explicit “No” values. “Not Applicable” and “N/A” are excluded from status counts; the original values remain visible in each case. These fields do not verify notice receipt, repair, or emission reduction.</p></div>
      <ol><li>Filter applicable notification or feedback statuses.</li><li>Open a source case to inspect its history.</li><li>Continue to Evidence Auditor to assess a specific claim.</li></ol>
    </section>
    <div className="operator-metadata-stats" aria-label="MARS response metadata counts">
      <div><span>Applicable notification status</span><strong>{summary.withNotificationMetadata.toLocaleString()}</strong><small>includes source-published “No” values</small></div>
      <div><span>Applicable feedback status</span><strong>{summary.withFeedbackMetadata.toLocaleString()}</strong><small>includes source-published “No” values</small></div>
      <div><span>Both statuses applicable</span><strong>{summary.withBoth.toLocaleString()}</strong><small>status fields, not independent verification</small></div>
    </div>
    <section className="panel operator-table-panel" aria-labelledby="operator-table-title">
      <header className="operator-table-heading"><div><h2 id="operator-table-title">Operator and government feedback records</h2><p>{matchingSources.length.toLocaleString()} matching source records</p></div><label>Response field<select value={filter} onChange={event => { setFilter(event.target.value as OperatorMetadataFilter); setRequestedPage(1); }}><option value="all">Any applicable status</option><option value="notification">Notification status</option><option value="feedback">Feedback status</option><option value="both">Both applicable statuses</option></select></label></header>
      <label className="operator-search"><span className="sr-only">Search response records</span><span aria-hidden="true">⌕</span><input value={query} onChange={event => { setQuery(event.target.value); setRequestedPage(1); }} placeholder="Search source ID, region, sector, or metadata"/></label>
      <div className="cases-table-scroll operator-table-scroll"><table className="workspace-table operator-table"><thead><tr><th scope="col">Source / location</th><th scope="col">MARS notification</th><th scope="col">Operator feedback field</th><th scope="col">Government feedback field</th><th scope="col">Next step</th></tr></thead><tbody>
        {page.items.map(source => {
          const location = formatCaseLocation(source);
          return <tr key={source.sourceId}>
            <td><strong>{source.sourceId}</strong><small>{location.area}</small></td>
            <td>{metadataValue(source.notified)}</td>
            <td>{metadataValue(source.feedbackOperator || source.feedback)}</td>
            <td>{metadataValue(source.feedbackGovernment)}</td>
            <td><div className="operator-row-actions"><button className="case-open-action" onClick={() => onOpenCase(source)}>Open case</button><button className="operator-audit-action" onClick={() => onReviewEvidence(source)}>Review claim</button></div></td>
          </tr>;
        })}
        {!page.items.length && <tr><td colSpan={5}><div className="cases-empty-state"><strong>No matching MARS response metadata</strong><span>Change the field filter or search, or inspect source records in Cases.</span></div></td></tr>}
      </tbody></table></div>
      <div className="cases-pagination">
        <label>Rows per page<select aria-label="Operator rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value) as CasePageSize); setRequestedPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
        <span className="cases-page-range">Showing {page.firstItem.toLocaleString()}–{page.lastItem.toLocaleString()} of {matchingSources.length.toLocaleString()}</span>
        <div className="cases-page-buttons"><button aria-label="First page" disabled={page.currentPage <= 1} onClick={() => setRequestedPage(1)}>First</button><button aria-label="Previous page" disabled={page.currentPage <= 1} onClick={() => setRequestedPage(page.currentPage - 1)}>Previous</button><span aria-live="polite">Page {page.currentPage.toLocaleString()} of {page.pageCount.toLocaleString()}</span><button aria-label="Next page" disabled={page.currentPage >= page.pageCount} onClick={() => setRequestedPage(page.currentPage + 1)}>Next</button><button aria-label="Last page" disabled={page.currentPage >= page.pageCount} onClick={() => setRequestedPage(page.pageCount)}>Last</button></div>
      </div>
      <p className="operator-metadata-limit">MARS notification and feedback are shown as publisher-provided metadata. They are not independent proof that a notice was received or that mitigation succeeded.</p>
    </section>
  </div>;
}
