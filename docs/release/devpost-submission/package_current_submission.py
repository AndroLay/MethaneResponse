#!/usr/bin/env python3
"""Current judging attachment, retaining the historical v12 demo and older package."""
import argparse
import json
from pathlib import Path
from package_submission import payload, digest, json_bytes, validate_archive, write_zip, REPO

EVIDENCE = REPO / 'docs/evidence/p2-delivery-2026-10-20'
EXTRAS = [
    'README.md', 'checks.json', 'source-bindings.json', 'artifact-manifest.json',
    'snapshot/download-manifest.json', 'snapshot/manifest.json',
    'snapshot/replay-verification.json', 'snapshot/report.json', 'snapshot/candidate.json.gz',
    'proof/evidence-overlap.json', 'proof/anvil.json',
    'proof/technical-video-verification.json', 'video/technical-walkthrough.mp4',
    'screenshots/evidence-overlap-desktop.png', 'screenshots/evidence-overlap-mobile.png',
    'screenshots/decision-desktop.png',
]
COMPLETION_EVIDENCE = REPO / 'docs/evidence/non-render-completion-2026-10-20'
COMPLETION_EXTRAS = [
    'README.md', 'checks.json', 'source-bindings.json', 'artifact-manifest.json',
    'proof/anvil.json', 'proof/sepolia-readiness.json',
    'screenshots/active-plan-globe-desktop.png', 'screenshots/active-plan-queue-mobile.png',
]


def assemble_current(files, additions):
    files = dict(files)
    old = json.loads(files.pop('manifest.json'))
    files.pop('checksums.sha256')
    if set(additions) != set(EXTRAS):
        raise ValueError('Current proof allowlist is incomplete')
    for name, data in additions.items():
        if not isinstance(data, bytes) or len(data) > (20_000_000 if name.endswith('.mp4') else 8_000_000):
            raise ValueError('Invalid or oversized current proof')
        files['current-proof/' + name] = data
    old.update({'preparedDate': '2026-10-20',
                'purpose': 'Current local judging attachment with a separately dated historical v12 video',
                'currentProof': 'current-proof/checks.json',
                'videoIsHistoricalPresentation': True,
                'videoIncluded': True, 'includedVideoPurpose': 'Current technical supplement; main narrated v12 is separate',
                'publicDeploymentVerified': False, 'videoUploaded': False})
    old['files'] = {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in sorted(files.items())}
    files['manifest.json'] = json_bytes(old)
    files['checksums.sha256'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(files.items())).encode()
    return files


def assemble_completion(files, additions):
    """Append exact completion proof without replacing any dated P2 payload."""
    if set(additions) != set(COMPLETION_EXTRAS):
        raise ValueError('Completion proof allowlist is incomplete')
    if any(not isinstance(data, bytes) or len(data) > 8_000_000 for data in additions.values()):
        raise ValueError('Invalid or oversized completion proof')
    files = dict(files)
    manifest = json.loads(files.pop('manifest.json'))
    files.pop('checksums.sha256', None)
    for name, data in additions.items():
        target = 'completion-proof/' + name
        if target in files:
            raise ValueError('Refusing to replace existing completion proof')
        files[target] = data
    manifest.update({'currentProof': 'completion-proof/checks.json',
                     'earlierCurrentProof': 'current-proof/checks.json',
                     'publicDeploymentVerified': False, 'videoUploaded': False,
                     'blockchainAcceptanceTarget': 'local_anvil_31337',
                     'liveLunaVerified': False})
    manifest['files'] = {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in sorted(files.items())}
    files['manifest.json'] = json_bytes(manifest)
    files['checksums.sha256'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(files.items())).encode()
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--include-non-render-completion', action='store_true')
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Refusing to overwrite a judging attachment')
    base, _ = payload()
    supplement=REPO/'delivery-output/connected-walkthrough-2026-10-20-v2/MethaneResponse-Connected-Workflow-2026-10-20.mp4'
    additions = {name: (supplement if name=='video/technical-walkthrough.mp4' else EVIDENCE / name).read_bytes() for name in EXTRAS}
    if digest(additions['video/technical-walkthrough.mp4'])!=json.loads(additions['proof/technical-video-verification.json'])['sha256']:
        raise ValueError('Technical supplement differs from its verified bytes')
    files = assemble_current(base, additions)
    if args.include_non_render_completion:
        files = assemble_completion(files, {name: (COMPLETION_EVIDENCE / name).read_bytes() for name in COMPLETION_EXTRAS})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_zip(args.output, files)
    print(json.dumps({'attachment': str(args.output), **validate_archive(args.output),
                      'uploaded': False, 'videoIsHistoricalPresentation': True}))


if __name__ == '__main__':
    main()
