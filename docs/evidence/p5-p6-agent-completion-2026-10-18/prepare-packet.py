"""Freeze a safe source allowlist; never includes env, state, reports or corpus.

Run after checks, once. Refuses existing outputs. Dataset assets are hashed in
place, not duplicated into the source ZIP. Archive is a dated working-tree copy,
not a clean Git release or a promise of complete visual-asset redistribution.
"""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import zipfile

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main():
    paths = set()
    for folder in ('apps/api/src', 'apps/web/src', 'packages/shared/src', 'contracts/src', 'contracts/test'):
        paths.update(p for p in (ROOT / folder).rglob('*') if p.is_file() and p.suffix in {'.ts', '.tsx', '.css', '.sol'})
    for folder in ('scripts', 'services/data-pipeline', 'services/data-pipeline/tests'):
        paths.update(p for p in (ROOT / folder).glob('*') if p.is_file() and not p.name.startswith('.') and p.suffix in {'.ts', '.py', '.sh'})
    for name in ('AGENTS.md', 'package.json', 'bun.lock', 'tsconfig.e2e.json', 'scripts/tsconfig.evaluation.json',
                 'apps/api/package.json', 'apps/api/tsconfig.json', 'apps/web/package.json', 'apps/web/tsconfig.json',
                 'apps/web/tsconfig.node.json', 'apps/web/vite.config.ts', 'apps/web/index.html',
                 'packages/shared/package.json', 'services/data-pipeline/pyproject.toml', 'services/data-pipeline/uv.lock',
                 'contracts/foundry.toml'):
        path = ROOT / name
        if path.is_file():
            paths.add(path)
    # No broad repository archive: private ignored files are never traversed.
    for path in paths:
        if path.is_symlink() or path.resolve() != path.absolute() or not path.resolve().is_relative_to(ROOT):
            raise ValueError('Symlink/outside source path refused')
        if path.stat().st_size > 4_000_000:
            raise ValueError('Oversized source file refused')
    source_files = {str(p.relative_to(ROOT)): sha(p.read_bytes()) for p in sorted(paths)}
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for path in sorted(paths):
            item = zipfile.ZipInfo(str(path.relative_to(ROOT)), date_time=(1980, 1, 1, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            item.external_attr = 0o100644 << 16
            output.writestr(item, path.read_bytes())
    dataset_names = ['data/real/mars_casebook_2026-10-15.json', 'apps/web/public/data/mars-snapshot.manifest.json']
    dataset_names.extend(str(p.relative_to(ROOT)) for p in sorted((ROOT / 'apps/web/public/data').rglob('*'))
                         if p.is_file() and p.suffix in {'.json', '.gz'})
    data_files = {name: sha((ROOT / name).read_bytes()) for name in sorted(set(dataset_names)) if (ROOT / name).is_file()}
    code_sha = sha(archive.getvalue())
    materials = {p.name: sha(p.read_bytes()) for p in sorted(PACKET.glob('*'))
                 if p.is_file() and p.suffix in {'.md', '.json', '.ts', '.py'} and p.name not in {'manifest.json'}}
    samples = {str(p.relative_to(PACKET)): sha(p.read_bytes()) for p in sorted((PACKET / 'p5-artifacts').rglob('*')) if p.is_file()}
    active_docs = {name: sha((ROOT / name).read_bytes()) for name in (
        'README.md', 'docs/development/local-setup.md', 'docs/evidence/README.md', 'docs/plans/README.md',
        'docs/plans/2026-10-17-six-package-completion.md', 'docs/plans/2026-10-18-p5-p6-agent-execution.md',
        'docs/release/current-implementation-status.md', 'docs/testing/ai-benchmark-annotation.md')}
    manifest = {
        'schemaVersion': 1, 'frozenAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'post_remediation_source_freeze_and_completed_agent_evaluation_not_human_research',
        'sourceArchive': {'path': 'evaluation-source.zip', 'sha256': code_sha, 'bytes': len(archive.getvalue()), 'fileCount': len(source_files)},
        'sourceFiles': source_files, 'datasetFiles': data_files, 'materials': materials, 'pilotArtifacts': samples, 'activeDocumentation': active_docs,
        'humanSessions': 0, 'humanGoldClaims': 0, 'providerBenchmarkCalls': 0,
        'limitations': ['Source allowlist archive excludes env, private state/corpus and third-party report bodies.',
                        'Data assets are bound by hashes and retained separately under dataset terms.',
                        'This is the post-remediation source archive; p5-freeze.json binds the earlier pilot archive and verifier.',
                        'Two agents ran six repeated sessions; sessions are not six independent human participants.',
                        'P6 authored record references are not independent human gold or natural third-party claims.',
                        'UI screenshots retain any third-party asset terms; this is not a redistribution license for all visual assets.',
                        'Local hashes bind bytes, not independent attestation of freeze time.'],
    }
    for name in ('evaluation-source.zip', 'manifest.json', 'source-files.sha256'):
        if (PACKET / name).exists():
            raise ValueError(f'Refusing to overwrite {name}')
    with (PACKET / 'evaluation-source.zip').open('xb') as f:
        f.write(archive.getvalue())
    with (PACKET / 'source-files.sha256').open('x') as f:
        f.write(''.join(f'{digest}  {name}\n' for name, digest in source_files.items()))
    with (PACKET / 'manifest.json').open('x') as f:
        f.write(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'sourceFiles': len(source_files), 'dataAssetsBound': len(data_files), 'humanSessions': 0, 'providerCalls': 0}))


if __name__ == '__main__':
    main()
