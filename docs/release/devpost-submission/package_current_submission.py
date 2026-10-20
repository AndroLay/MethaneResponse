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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Refusing to overwrite a judging attachment')
    base, _ = payload()
    supplement=REPO/'delivery-output/connected-walkthrough-2026-10-20-v2/MethaneResponse-Connected-Workflow-2026-10-20.mp4'
    additions = {name: (supplement if name=='video/technical-walkthrough.mp4' else EVIDENCE / name).read_bytes() for name in EXTRAS}
    if digest(additions['video/technical-walkthrough.mp4'])!=json.loads(additions['proof/technical-video-verification.json'])['sha256']:
        raise ValueError('Technical supplement differs from its verified bytes')
    files = assemble_current(base, additions)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_zip(args.output, files)
    print(json.dumps({'attachment': str(args.output), **validate_archive(args.output),
                      'uploaded': False, 'videoIsHistoricalPresentation': True}))


if __name__ == '__main__':
    main()
