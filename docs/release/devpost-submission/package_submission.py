#!/usr/bin/env python3
"""Build an allowlisted local judging attachment; never upload or overwrite it."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = REPO / 'delivery-output/devpost-submission-2026-10-19'
ARCHIVE = 'MethaneResponse-Devpost-Judging-Pack.zip'
CAPTURE = REPO / 'delivery-output/story-v10/capture-master'
CAPTURE_SHA256 = '3de8dc98ffd4cb0e9aaf00f3a1b8838949cc84e7a04bce9257af3e0a0a4a2b98'
HEADINGS = [
    'Inspiration', 'What it does', 'How we built it', 'Challenges we ran into',
    "Accomplishments that we're proud of", 'What we learned',
    "What's next for Methane Response",
]
GALLERY = [
    ('source', '01-historical-source.png', 'A real historical source',
     'KAZ_S_159 with source metadata and location context. Historical UNEP records; basemap imagery is geographic context.'),
    ('observations', '02-dated-observations.png', 'Inspect the observation history',
     'Dated satellite estimates retain uncertainty. Missing dates are not zero emissions.'),
    ('audit', '03-baseline-result.png', 'Check the available references',
     'The rules baseline finds insufficient reference coverage for the selected review; this does not contradict UNEP or establish failed mitigation.'),
    ('casework', '04-evidence-request.png', 'Turn the gap into a next step',
     'Record the exact action date and follow-up evidence to request. These notes are saved locally; no operator is contacted.'),
    ('tamper', '05-changed-report-rejected.png', 'Detect a controlled change',
     'The actual browser verifier rejects the intentionally altered report copy.'),
    ('original', '06-original-report-verified.png', 'Recheck the untouched original',
     'Bundle and export-context checks match for the original. This verifies local consistency, not issuer identity or physical repair.'),
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()


def validate_fields(fields, story):
    if not 1 <= len(fields['projectName']) <= 44:
        raise ValueError('Name exceeds the conservative displayed character allowance')
    if not 1 <= len(fields['elevatorPitch']) <= 200:
        raise ValueError('Pitch must fit 200 characters')
    tags = fields['builtWith']
    if not 1 <= len(tags) <= 25 or len(set(t.lower() for t in tags)) != len(tags):
        raise ValueError('Invalid or duplicate Built with tags')
    if re.findall(r'^## (.+)$', story, re.M) != HEADINGS:
        raise ValueError('Story must retain the seven requested headings in order')
    if not 180 <= fields['video']['durationSeconds'] <= 300:
        raise ValueError('Video does not fit the official 3–5 minute window')
    if fields['track'] != 'Climate Data & Environmental Monitoring':
        raise ValueError('Unexpected track')


def diff_paths(a, b, path=''):
    if isinstance(a, dict) and isinstance(b, dict):
        return [p for k in sorted(set(a) | set(b))
                for p in diff_paths(a.get(k), b.get(k), path + '/' + k)]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [p for i, value in enumerate(a) for p in diff_paths(value, b[i], path + '/' + str(i))]
    return [] if a == b else [path]


def reject_private_fields(value):
    banned = {'authorization', 'accesstoken', 'privatekey', 'apikey', 'password'}
    if isinstance(value, dict):
        for key, child in value.items():
            if re.sub(r'[^a-z]', '', key.lower()) in banned:
                raise ValueError('Private credential field cannot enter attachment')
            reject_private_fields(child)
    elif isinstance(value, list):
        for child in value:
            reject_private_fields(child)


def validate_examples(original, changed):
    expected = ['/exportIntegrity/sha256', '/latestAudit/bundle/reason', '/latestAudit/reason']
    differences = diff_paths(original, changed)
    if differences != expected:
        raise ValueError('Expected one mirrored reason change and a recalculated export checksum')
    for example in [original, changed]:
        if example['latestAudit']['reason'] != example['latestAudit']['bundle']['reason']:
            raise ValueError('Reason projection differs from the hashed bundle field')
    if original['latestAudit']['bundleHash'] != changed['latestAudit']['bundleHash']:
        raise ValueError('Controlled test must retain the original stored bundle hash')
    return differences


def payload():
    fields = json.loads((HERE / 'fields.json').read_text())
    story = (HERE / 'project-story.md').read_text()
    validate_fields(fields, story)
    capture = json.loads((CAPTURE / 'capture.json').read_text())
    if capture['sha256'] != CAPTURE_SHA256 or digest((CAPTURE / 'actual-ui.webm').read_bytes()) != CAPTURE_SHA256:
        raise ValueError('Retained actual capture identity changed')
    if capture['sourceId'] != 'KAZ_S_159' or capture['snapshotId'] != 'unep-mars-675417694883':
        raise ValueError('Unexpected source or dataset snapshot')
    video = REPO / fields['video']['localPath']
    if digest(video.read_bytes()) != fields['video']['sha256']:
        raise ValueError('Video file differs from the declared local final cut')
    original = json.loads((CAPTURE / 'original-report.json').read_text())
    changed = json.loads((CAPTURE / 'altered-report.json').read_text())
    for example in [original, changed]:
        reject_private_fields(example)
    differences = validate_examples(original, changed)

    files = {name: (HERE / name).read_bytes() for name in [
        'README.md', 'fields.json', 'project-story.md', 'judges-guide.md', 'rules-check.md', 'source-links.md',
    ]}
    copies = {
        'evidence/original-report.json': CAPTURE / 'original-report.json',
        'evidence/changed-report.json': CAPTURE / 'altered-report.json',
        'evidence/local-checks-18-Oct.json': REPO / 'docs/evidence/product-value-2026-10-18/verification.json',
        'evidence/video-verification-v12.json': REPO / 'docs/demo/delivery-2026-10-19-final-v12/verification.json',
        'LICENSE.txt': REPO / 'LICENSE',
        'THIRD-PARTY-NOTICE.txt': REPO / 'NOTICE',
        'data-provenance.md': REPO / 'data/real/README.md',
    }
    files.update({name: path.read_bytes() for name, path in copies.items()})
    gallery = []
    for sid, name, title, caption in GALLERY:
        path = CAPTURE / f'{sid}-end.png'
        if path.stat().st_size >= 5_000_000:
            raise ValueError('Gallery image exceeds conservative 5 MB limit')
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            width, height = im.size
        files['gallery/' + name] = path.read_bytes()
        gallery.append({'file': name, 'title': title, 'caption': caption,
                        'width': width, 'height': height, 'actualCapture': True,
                        'modifiedPixels': False, 'source': str(path.relative_to(REPO))})
    files['gallery-captions.json'] = json_bytes(gallery)
    manifest = {
        'schemaVersion': 1, 'preparedDate': '2026-10-19',
        'purpose': 'Local Devpost judging attachment; not a complete repository or submitted entry',
        'sourceId': capture['sourceId'], 'snapshotId': capture['snapshotId'],
        'actualCaptureSha256': CAPTURE_SHA256,
        'galleryPixelsModified': False,
        'galleryAspectRatio': '16:9 native UI; 3:2 is a form recommendation',
        'controlledChangePaths': differences,
        'controlledChangeMeaning': 'One reason is changed in the hashed bundle and its display projection; export-context checksum is recalculated, stored bundle hash is retained',
        'publicDeploymentVerified': False, 'videoUploaded': False,
        'privateStateIncluded': False, 'videoIncluded': False,
        'historicalFullGateDate': '2026-10-18',
        'videoSource': fields['video'],
        'files': {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in sorted(files.items())},
    }
    files['manifest.json'] = json_bytes(manifest)
    files['checksums.sha256'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(files.items())).encode()
    return files, gallery


def write_zip(path, files):
    with zipfile.ZipFile(path, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 19, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compresslevel=9)


def validate_archive(path):
    if path.stat().st_size >= 35_000_000:
        raise ValueError('Attachment exceeds conservative 35 MB form limit')
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP CRC verification failed')
        names = archive.namelist()
        if len(names) != len(set(names)) or any(n.startswith('/') or '..' in Path(n).parts for n in names):
            raise ValueError('Unsafe or duplicate archive member')
        sums = archive.read('checksums.sha256').decode().splitlines()
        for line in sums:
            expected, name = line.split('  ', 1)
            if digest(archive.read(name)) != expected:
                raise ValueError('Attachment checksum mismatch')
        listed = {line.split('  ', 1)[1] for line in sums}
        if listed | {'checksums.sha256'} != set(names):
            raise ValueError('Unlisted archive member')
        manifest = json.loads(archive.read('manifest.json'))
        if set(manifest['files']) != set(names) - {'manifest.json', 'checksums.sha256'}:
            raise ValueError('Manifest coverage mismatch')
        for name, info in manifest['files'].items():
            data = archive.read(name)
            if digest(data) != info['sha256'] or len(data) != info['bytes']:
                raise ValueError('Manifest mismatch')
    return {'zipBytes': path.stat().st_size, 'zipSha256': digest(path.read_bytes()), 'members': len(names)}


def main():
    files, gallery = payload()
    OUT.mkdir(parents=True, exist_ok=False)
    for name in ['README.md', 'project-story.md', 'judges-guide.md', 'fields.json', 'gallery-captions.json']:
        (OUT / name).write_bytes(files[name])
    (OUT / 'gallery').mkdir()
    for item in gallery:
        (OUT / 'gallery' / item['file']).write_bytes(files['gallery/' + item['file']])
    destination = OUT / ARCHIVE
    write_zip(destination, files)
    result = {'attachment': str(destination.relative_to(REPO)), **validate_archive(destination),
              'pitchCharacters': len(json.loads(files['fields.json'])['elevatorPitch']),
              'galleryImages': len(gallery), 'imagesBelowFiveMB': True,
              'pendingPublicURLs': ['Live prototype', 'Video demo'], 'uploaded': False}
    (OUT / 'package-validation.json').write_bytes(json_bytes(result))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
