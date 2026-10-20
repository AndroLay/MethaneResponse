"""Independent-language conformance on the SAME pinned archive, not a benefit benchmark."""
import argparse
from bisect import bisect_left, bisect_right
from datetime import datetime, timezone
import gzip
import hashlib
import json
from statistics import median


def day(value):
    stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if stamp.tzinfo:
        stamp = stamp.astimezone(timezone.utc)
    return stamp.date().isoformat()


def rank(value, values):
    if value is None:
        return 0
    if len(values) == 1:
        return 100
    return round(100 * (bisect_left(values, value) + bisect_right(values, value) - 1) / 2 / (len(values) - 1), 6)


def allocate(candidates, parameters, strategy):
    pool = [row for row in candidates if row['observationCount'] > 0
            and (not parameters['countries'] or row['country'] in parameters['countries'])
            and (not parameters['sectors'] or row['sector'] in parameters['sectors'])]
    fluxes = sorted(row['medianFluxKgHr'] for row in pool if row['medianFluxKgHr'] is not None)
    dates = sorted(row['distinctDates'] for row in pool)
    weight = parameters['recurrenceWeight'] / 100
    scores = {row['sourceId']: round(rank(row['medianFluxKgHr'], fluxes) * (1 - weight)
                                    + rank(row['distinctDates'], dates) * weight, 6) for row in pool}
    chosen, countries, sectors = [], {}, set()
    remaining = pool[:]
    while len(chosen) < parameters['capacity']:
        possible = [row for row in remaining if countries.get(row['country'], 0) < parameters['maxPerCountry']]
        if not possible:
            break
        def key(row):
            if strategy == 'flux':
                return (-(row['medianFluxKgHr'] if row['medianFluxKgHr'] is not None else -1), row['sourceId'])
            if strategy == 'recurrence':
                return (-row['distinctDates'], row['sourceId'])
            if strategy == 'breadth':
                novelty = int(row['country'] is not None and row['country'] not in countries) + int(row['sector'] is not None and row['sector'] not in sectors)
                return (-novelty, -scores[row['sourceId']], row['sourceId'])
            return (-scores[row['sourceId']], row['sourceId'])
        selected = min(possible, key=key)
        chosen.append(selected)
        remaining.remove(selected)
        countries[selected['country']] = countries.get(selected['country'], 0) + 1
        if selected['sector'] is not None:
            sectors.add(selected['sector'])
    return [row['sourceId'] for row in chosen]


def verify(report, snapshot):
    dataset = report['input']['dataset']
    if dataset['synthetic'] or snapshot['snapshotId'] != dataset['datasetSnapshotId'] or snapshot['provenance']['archiveSha256'] != dataset['archiveSha256']:
        raise ValueError('Snapshot binding mismatch')
    originals = {row['sourceId']: row for row in snapshot['sources']}
    candidates = report['input']['candidates']
    if len({row['sourceId'] for row in candidates}) != len(candidates):
        raise ValueError('Duplicate source ID')
    if dataset['scope'] == 'full_snapshot' and set(originals) != {row['sourceId'] for row in candidates}:
        raise ValueError('Incomplete source projection')
    for row in candidates:
        original = originals[row['sourceId']]
        records = original['observations']
        numeric = [record for record in records if record['fluxKgHr'] is not None]
        uncertainties = [record['uncertaintyKgHr'] for record in numeric if record.get('uncertaintyKgHr') is not None]
        expected = {
            'sourceId': original['sourceId'], 'country': (original.get('country') or '').strip() or None,
            'sector': (original.get('sector') or '').strip() or None,
            'medianFluxKgHr': median([record['fluxKgHr'] for record in numeric]) if numeric else None,
            'medianUncertaintyKgHr': median(uncertainties) if uncertainties else None,
            'distinctDates': len({day(record['date']) for record in records}), 'observationCount': len(records),
            'missingFluxCount': len(records) - len(numeric), 'lastObserved': max((record['date'] for record in records), default=None),
        }
        if row != expected:
            raise ValueError('Source projection mismatch: ' + row['sourceId'])
    p = report['input']['parameters']
    for portfolio in report['portfolios']:
        if portfolio['selectedIds'] != allocate(candidates, p, portfolio['strategy']):
            raise ValueError('Portfolio mismatch: ' + portfolio['strategy'])
    for sensitivity in report['sensitivity']:
        chosen = allocate(candidates, sensitivity['parameters'], 'weighted')
        base = report['portfolios'][0]['selectedIds']
        if sensitivity['addedIds'] != [source for source in chosen if source not in base] or sensitivity['removedIds'] != [source for source in base if source not in chosen]:
            raise ValueError('Sensitivity mismatch')
    return {'sourceCount': len(candidates), 'portfolios': len(report['portfolios']), 'sensitivityScenarios': len(report['sensitivity'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('report')
    parser.add_argument('snapshot')
    args = parser.parse_args()
    with open(args.report, encoding='utf8') as stream:
        report = json.load(stream)
    with open(args.snapshot, 'rb') as stream:
        compressed = stream.read()
    if hashlib.sha256(compressed).hexdigest() != report['input']['dataset']['inputFileSha256']:
        raise ValueError('Normalized input hash mismatch')
    result = verify(report, json.loads(gzip.decompress(compressed)))
    print(json.dumps({'status': 'same_input_conformance', **result, 'limitation': 'Independent implementation, same normalized archive; no real-world benefit or scientific-outcome validation.'}))
