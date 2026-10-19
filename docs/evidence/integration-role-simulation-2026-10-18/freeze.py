"""Freeze the explicit prior source allowlist plus this increment, never env/state.

Run from repo root after review/checks. Exclusive outputs preserve dated evidence.
The archive contains source files, not node_modules, private state or report bodies.
"""
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import zipfile

PACKET = Path(__file__).resolve().parent
ROOT = PACKET.parents[2]
BASE = ROOT / 'docs/evidence/p5-p6-agent-completion-2026-10-18/manifest.json'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_read(name):
    path = ROOT / name
    if path.is_symlink() or path.resolve() != path.absolute() or not path.resolve().is_relative_to(ROOT):
        raise ValueError('Refused symlink or outside path')
    return path.read_bytes()


def main():
    base = json.loads(BASE.read_text())
    names = set(base['sourceFiles']) | {
        'scripts/run-integration-roles.ts', 'scripts/integration-role-runtime.test.ts',
        str((PACKET / 'production-preview-smoke.ts').relative_to(ROOT)),
    }
    sources = {name: sha(safe_read(name)) for name in sorted(names)}
    runtime_names = [n for n in base['sourceFiles'] if n.startswith(('apps/api/src/', 'apps/web/src/', 'packages/shared/src/'))]
    if any(sources[n] != base['sourceFiles'][n] for n in runtime_names):
        raise ValueError('Application source drift; refresh conclusions and tests before freeze')
    dataset = {name: sha(safe_read(name)) for name in base['datasetFiles']}
    if dataset != base['datasetFiles']:
        raise ValueError('Dataset drift; do not bind old diagnostic assumptions')
    active_docs = {name: sha(safe_read(name)) for name in (
        'docs/release/current-implementation-status.md', 'docs/release/deployment.md',
        'docs/testing/README.md', 'docs/evidence/README.md', 'docs/plans/README.md',
        'docs/plans/2026-10-18-integration-role-simulation.md',
    )}
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as output:
        for name in sorted(sources):
            item = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            item.external_attr = 0o100644 << 16
            output.writestr(item, safe_read(name))
    outputs = ['source.zip', 'source-files.sha256', 'manifest.json', 'checksums.sha256']
    if any((PACKET / name).exists() for name in outputs):
        raise ValueError('Refusing to overwrite a frozen packet')
    packet_paths = sorted(PACKET.rglob('*'))
    if any(p.is_symlink() or '__pycache__' in p.parts or p.suffix == '.pyc' for p in packet_paths):
        raise ValueError('Refusing unexpected symlink or cache in evidence packet')
    materials = {str(p.relative_to(PACKET)): sha(p.read_bytes()) for p in packet_paths if p.is_file()}
    manifest = {
        'schemaVersion': 1, 'frozenAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'agent_role_simulation_actual_local_transports_no_external_integration_completion',
        'baseSourceManifest': {'path': str(BASE.relative_to(ROOT)), 'sha256': sha(BASE.read_bytes())},
        'sourceArchive': {'path': 'source.zip', 'sha256': sha(archive.getvalue()), 'fileCount': len(sources)},
        'sourceFiles': sources, 'datasetFiles': dataset, 'activeDocumentation': active_docs, 'materials': materials,
        'applicationSourceMatchesP56Freeze': True,
        'externalProviderVerified': False, 'publicDeploymentVerified': False, 'sepoliaReceiptVerified': False,
        'limitations': ['Archive excludes dependencies, credentials, private state and third-party report bodies.',
                        'Source hash binds bytes; it is not an independent time or issuer attestation.',
                        'Only focused tests/operations were rerun; earlier full-suite results retain their own manifest.'],
    }
    with (PACKET / 'source.zip').open('xb') as f:
        f.write(archive.getvalue())
    with (PACKET / 'source-files.sha256').open('x') as f:
        f.write(''.join(f'{digest}  {name}\n' for name, digest in sources.items()))
    with (PACKET / 'manifest.json').open('x') as f:
        f.write(json.dumps(manifest, indent=2) + '\n')
    packet_hashes = {str(p.relative_to(PACKET)): sha(p.read_bytes()) for p in sorted(PACKET.rglob('*')) if p.is_file()}
    with (PACKET / 'checksums.sha256').open('x') as f:
        f.write(''.join(f'{digest}  {name}\n' for name, digest in packet_hashes.items()))
    print(json.dumps({'sourceFiles': len(sources), 'datasetFiles': len(dataset), 'packetChecksums': len(packet_hashes)}))


if __name__ == '__main__':
    main()
