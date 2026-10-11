"""Reproducibly normalize the official UNEP MARS source/plume archive."""
import argparse
import json
from pathlib import Path

from ingest import ingest_mars_archive


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True, help='Locally downloaded official MARS ZIP archive')
    parser.add_argument('--retrieved-at', required=True, help='UTC/offset ISO 8601 time when the archive was downloaded')
    parser.add_argument('--output', type=Path, required=True, help='Path for normalized source and plume JSON')
    parser.add_argument('--manifest', type=Path, required=True, help='Path for the provenance and integrity manifest')
    args = parser.parse_args()

    snapshot, manifest = ingest_mars_archive(args.input, retrieved_at=args.retrieved_at)
    for target, payload in ((args.output, snapshot), (args.manifest, manifest)):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    counts = manifest['counts']
    print(
        f"sources={counts['sources']} plumes={counts['plumes']} "
        f"linked={counts['linkedPlumes']} source_id_missing={counts['sourceIdMissingPlumes']} "
        f"source_record_missing={counts['sourceRecordMissingPlumes']} "
        f"sha256={manifest['provenance']['archiveSha256']}"
    )


if __name__ == '__main__':
    main()
