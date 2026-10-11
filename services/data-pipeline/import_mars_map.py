#!/usr/bin/env python3
"""Normalize a downloaded official UNEP MARS ZIP/CSV/GeoJSON for the interactive map.

No observations are invented. This is a historical snapshot, not a live feed.

Usage:
  python3 services/data-pipeline/import_mars_map.py /path/to/unep_methanedata_detected_plumes_csv.zip
  python3 services/data-pipeline/import_mars_map.py /path/to/unep_methanedata_detected_plumes_geojson.zip

Writes apps/web/public/data/mars-snapshot.json. Python standard library only.
Attribution: UNEP IMEO Eye on Methane / MARS, CC BY-NC-SA 4.0.
"""
from __future__ import annotations
import argparse
import csv
import io
import json
import math
import pathlib
import re
import sys
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

PROJECT = pathlib.Path(__file__).resolve().parents[2]
DESTINATION = PROJECT / 'apps/web/public/data/mars-snapshot.json'
OFFICIAL_URL = 'https://methanedata.unep.org/download-dataset'


def number(v):
    try:
        if v is None or str(v).strip() == '':
            return None
        n = float(v)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def value(row, *keys):
    for key in keys:
        val = row.get(key)
        if val is not None and str(val).strip() != '':
            return str(val).strip()
    return ''


def input_rows(path):
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            names = [i.filename for i in archive.infolist() if not i.is_dir() and not i.filename.startswith('__MACOSX/')]
            for name in sorted(names, key=lambda x: 0 if 'source' in x.lower() else 1):
                if name.lower().endswith('.csv'):
                    with archive.open(name) as file, io.TextIOWrapper(file, encoding='utf-8-sig', errors='replace', newline='') as text:
                        for row in csv.DictReader(text):
                            yield row
                elif name.lower().endswith(('.geojson', '.json')):
                    with archive.open(name) as f:
                        yield from features_to_rows(json.load(f))
    elif str(path).lower().endswith('.csv'):
        with open(path, newline='', encoding='utf-8-sig') as f:
            yield from csv.DictReader(f)
    elif str(path).lower().endswith(('.geojson', '.json')):
        with open(path, encoding='utf-8-sig') as f:
            yield from features_to_rows(json.load(f))
    else:
        raise ValueError('Expected a UNEP CSV, GeoJSON or ZIP archive')


def features_to_rows(doc):
    if not isinstance(doc, dict) or doc.get('type') != 'FeatureCollection':
        raise ValueError('JSON must be GeoJSON FeatureCollection')
    for f in doc.get('features') or []:
        props = dict(f.get('properties') or {})
        geometry = f.get('geometry') or {}
        if geometry.get('type') == 'Point':
            lon, lat = geometry.get('coordinates', [None, None])[:2]
            props.setdefault('lon', lon)
            props.setdefault('lat', lat)
        yield props


def normalize(input_path: pathlib.Path, max_sources: int = 8000):
    grouped = {}
    obs_ids = defaultdict(set)
    total_rows = 0
    for row in input_rows(input_path):
        total_rows += 1
        source_id = value(row, 'source_name', 'source_id')
        if not re.fullmatch(r'[A-Z]{3}_S_\d+', source_id):
            continue
        lat = number(value(row, 'lat', 'latitude'))
        lon = number(value(row, 'lon', 'longitude'))
        if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        country = value(row, 'country')
        sector = value(row, 'sector')
        source = grouped.setdefault(source_id, {
            'sourceId': source_id, 'name': source_id, 'region': country or 'Region not specified',
            'lat': lat, 'lon': lon, 'country': country, 'sector': sector,
            'synthetic': False, 'evidence': [], 'observations': [], 'plumeCount': 0,
            'notified': '', 'feedback': '', 'lastObserved': '', 'maxFluxKgHr': None,
        })
        if country:
            source['country'] = country
            source['region'] = country
        if sector:
            source['sector'] = sector
        source['notified'] = source['notified'] or value(row, 'notified')
        source['feedback'] = source['feedback'] or value(row, 'feedback')
        date = value(row, 'tile_date', 'last_plume_date')
        if date and date > source['lastObserved']:
            source['lastObserved'] = date
        plume_id = value(row, 'id_plume')
        flux = number(value(row, 'ch4_fluxrate'))
        if flux is not None:
            source['maxFluxKgHr'] = max(source['maxFluxKgHr'] or 0, flux)
        declared = number(value(row, 'n_plumes_detected'))
        if declared is not None:
            source['plumeCount'] = max(source['plumeCount'], int(declared))
        if plume_id and plume_id not in obs_ids[source_id]:
            obs_ids[source_id].add(plume_id)
            source['plumeCount'] = max(source['plumeCount'], len(obs_ids[source_id]))
            observation = {'id': plume_id, 'date': date, 'fluxKgHr': flux,
                           'uncertaintyKgHr': number(value(row, 'ch4_fluxrate_std')),
                           'satellite': value(row, 'satellite')}
            source['observations'].append(observation)
            source['evidence'].append({'id': plume_id, 'kind': 'detection',
                    'title': 'UNEP MARS satellite plume observation',
                    'reference': OFFICIAL_URL + '#' + source_id,
                    'date': date, 'synthetic': False})
    if not grouped:
        raise ValueError('No source IDs with WGS84 latitude/longitude found; inspect UNEP archive.')
    sources = sorted(grouped.values(), key=lambda s: (s['lastObserved'], s['sourceId']), reverse=True)
    latest = max((s['lastObserved'] for s in sources), default='')
    count = len(sources)
    for s in sources:
        s['observations'] = sorted(s['observations'], key=lambda o:o['date'])[-60:]
        s['evidence'] = sorted(s['evidence'], key=lambda o:o['date'], reverse=True)[:40]
        if not s['lastObserved']:
            s['lastObserved'] = None
    return {
        'dataset': 'UNEP MARS',
        'sourceUrl': OFFICIAL_URL,
        'license': 'CC BY-NC-SA 4.0',
        'importedAt': datetime.now(timezone.utc).isoformat(),
        'lastObserved': latest or None,
        'originalSourceCount': count,
        'truncated': count > max_sources,
        'sources': sources[:max_sources],
    }, total_rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=pathlib.Path, help='Official UNEP downloaded archive or extracted file')
    parser.add_argument('--output', type=pathlib.Path, default=DESTINATION)
    parser.add_argument('--max-sources', type=int, default=8000)
    args = parser.parse_args()
    if args.max_sources < 1:
        parser.error('--max-sources must be >=1')
    try:
        result, rows = normalize(args.input, args.max_sources)
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as error:
        sys.exit(f'Import failed: {error}')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
    print(f"Parsed {rows:,} rows; {result['originalSourceCount']:,} valid sources; wrote {len(result['sources']):,} map locations to {args.output}")
    print(f"Latest observation in this snapshot: {result['lastObserved'] or 'unknown'}")
    print('This is historical satellite data, not real-time leak monitoring or mitigation verification.')


if __name__ == '__main__':
    main()
