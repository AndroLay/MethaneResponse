"""Freeze an explicit source allowlist and this local evidence packet, exclusively."""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import zipfile

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(name):
    path = ROOT / name
    if path.is_symlink() or path.resolve() != path.absolute() or not path.resolve().is_relative_to(ROOT):
        raise ValueError('Refused symlink or outside path')
    return path.read_bytes()


def main():
    base = json.loads(read('docs/evidence/integration-role-simulation-2026-10-18/manifest.json'))
    names = set(base['sourceFiles']) | {
        'apps/web/src/assessment-scope.ts', 'scripts/product-value-evaluation.ts',
        'scripts/product-value-evaluation.test.ts',
        str((PACKET / 'export-case-reports.ts').relative_to(ROOT)),
        str((PACKET / 'analyze-format-sensitivity.ts').relative_to(ROOT)),
        str((PACKET / 'freeze.py').relative_to(ROOT)),
    }
    sources = {name: sha(read(name)) for name in sorted(names)}
    dataset = {name: sha(read(name)) for name in base['datasetFiles']}
    if dataset != base['datasetFiles']:
        raise ValueError('Dataset changed from previous evidence')
    freeze = json.loads((PACKET / 'input-freeze.json').read_text())
    for name, digest in freeze['productionFiles'].items():
        if sha(read(name)) != digest:
            raise ValueError(f'Comparison production source drift: {name}')
    for name, digest in freeze['files'].items():
        if sha((PACKET / name).read_bytes()) != digest:
            raise ValueError(f'Comparison input drift: {name}')
    if sha(read(freeze['casebook']['path'])) != freeze['casebook']['sha256']:
        raise ValueError('Casebook drift')
    if sha(read('scripts/product-value-evaluation.ts')) != freeze['harnessSha256']:
        raise ValueError('Comparison harness drift')
    docs = {name: sha(read(name)) for name in (
        'docs/plans/2026-10-18-product-value-strengthening.md', 'docs/plans/README.md',
        'docs/release/current-implementation-status.md', 'docs/product/user-workflow.md',
        'docs/research/three-historical-decision-cases-2026-10-18.md', 'docs/research/README.md',
        'docs/evidence/README.md', 'docs/testing/README.md',
    )}
    outputs = ['source.zip', 'source-files.sha256', 'manifest.json', 'checksums.sha256']
    if any((PACKET / name).exists() for name in outputs):
        raise ValueError('Refusing to overwrite frozen evidence')
    paths = sorted(PACKET.rglob('*'))
    if any(path.is_symlink() or '__pycache__' in path.parts or path.suffix == '.pyc' for path in paths):
        raise ValueError('Unexpected symlink/cache')
    materials = {str(path.relative_to(PACKET)): sha(path.read_bytes()) for path in paths if path.is_file()}
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for name in sorted(sources):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, read(name))
    content = archive.getvalue()
    (PACKET / 'source.zip').write_bytes(content)
    (PACKET / 'source-files.sha256').write_text(''.join(f'{digest}  {name}\n' for name, digest in sources.items()))
    manifest = {
        'frozenAt': datetime.now(timezone.utc).isoformat(), 'baseHead': 'a82e2eee99bb79327f859f304f2f5d5939f07041',
        'workingTreeIncluded': True, 'sourceFiles': sources, 'datasetFiles': dataset, 'activeDocs': docs,
        'materials': materials, 'sourceArchiveSha256': sha(content),
        'limitations': ['Local proof of concept', 'Agent functional comparison, not human research',
                        'No external deployment/provider/Sepolia claim', 'Hashes do not authenticate issuer or establish physical truth'],
    }
    (PACKET / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    checks = {**materials, **{name: sha((PACKET / name).read_bytes()) for name in outputs if name != 'checksums.sha256'}}
    (PACKET / 'checksums.sha256').write_text(''.join(f'{digest}  {name}\n' for name, digest in sorted(checks.items())))
    print(json.dumps({'sources': len(sources), 'datasetFiles': len(dataset), 'checksums': len(checks), 'sourceArchiveSha256': sha(content)}))


if __name__ == '__main__':
    main()
