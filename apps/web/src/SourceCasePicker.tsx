import { useMemo, useState } from 'react';
import type { MarsSource } from './mars';
import { formatCaseLocation, searchSourceCases } from './case-table';

type SourceCasePickerProps = {
  sources: readonly MarsSource[];
  selectedSource: MarsSource;
  onSelectSource: (sourceId: string) => void;
};

export default function SourceCasePicker({ sources, selectedSource, onSelectSource }: SourceCasePickerProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchSourceCases(sources, query), [sources, query]);
  const selectedArea = formatCaseLocation(selectedSource).area;
  const hasQuery = query.trim().length > 0;
  const status = !hasQuery
    ? `Search ${sources.length.toLocaleString()} source cases by ID, country, region or sector.`
    : results.totalMatches === 0
      ? 'No source cases match this search.'
      : results.totalMatches > results.items.length
        ? `Showing ${results.items.length} of ${results.totalMatches.toLocaleString()} matches.`
        : `${results.totalMatches} matching source case${results.totalMatches === 1 ? '' : 's'}.`;

  return (
    <div className="claim-case-picker">
      <span>SOURCE CASE</span>
      <div className="claim-case-current" aria-live="polite">
        <strong>{selectedSource.sourceId}</strong>
        <small>{selectedArea}</small>
      </div>
      <input
        type="search"
        aria-label="Search source cases for evidence audit"
        aria-describedby="evidence-audit-source-search-status"
        autoComplete="off"
        placeholder="Search ID, country or sector…"
        value={query}
        onChange={event => setQuery(event.currentTarget.value)}
      />
      {hasQuery && results.items.length > 0 && (
        <select
          aria-label="Matching source cases for evidence audit"
          value=""
          onChange={event => {
            const sourceId = event.currentTarget.value;
            if (!sourceId) return;
            onSelectSource(sourceId);
            setQuery('');
          }}
        >
          <option value="" disabled>Choose a matching source case…</option>
          {results.items.map(option => (
            <option key={option.sourceId} value={option.sourceId}>
              {option.sourceId} · {formatCaseLocation(option).area}
            </option>
          ))}
        </select>
      )}
      <small id="evidence-audit-source-search-status" aria-live="polite">{status}</small>
    </div>
  );
}
