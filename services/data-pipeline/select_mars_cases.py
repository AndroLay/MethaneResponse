"""Create a small reviewed casebook from a normalized UNEP MARS snapshot."""
import argparse
import json
from pathlib import Path

from casebook import build_casebook


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True, help='Normalized MARS snapshot JSON')
    parser.add_argument('--selection', type=Path, required=True, help='Reviewed case ID selection JSON')
    parser.add_argument('--output', type=Path, required=True, help='Path for the selected casebook JSON')
    args = parser.parse_args()

    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8'))
    selection = json.loads(args.selection.read_text(encoding='utf-8'))
    casebook = build_casebook(
        snapshot,
        selection['cases'],
        expected_archive_sha256=selection['archiveSha256'],
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(casebook, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"cases={len(casebook['cases'])} archive_sha256={casebook['provenance']['archiveSha256']}")


if __name__ == '__main__':
    main()
