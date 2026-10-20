"""Opt-in download of the fixed official UNEP MARS CSV archive into a new local stage."""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

URL = 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip'
MAX_BYTES = 32_000_000
FIELDS = ('ETag', 'Content-Length', 'Content-MD5', 'Last-Modified')
ROOT = Path(__file__).resolve().parents[1]


def head():
    with urlopen(Request(URL, method='HEAD', headers={'User-Agent':'MethaneResponse-candidate-intake/1'}), timeout=20) as response:
        if response.geturl() != URL:
            raise ValueError('Publisher HEAD redirected away from the fixed archive URL')
        return dict(response.headers.items())


def content():
    return urlopen(Request(URL, headers={'User-Agent':'MethaneResponse-candidate-intake/1', 'Accept-Encoding':'identity'}), timeout=60)


def headers(values):
    normalized = {str(k).lower():str(v).strip() for k,v in values.items()}
    result = {name:normalized.get(name.lower(),'') for name in FIELDS}
    if any(not value for value in result.values()):
        raise ValueError('Required publisher headers are missing')
    try:
        size=int(result['Content-Length'])
        md5=base64.b64decode(result['Content-MD5'], validate=True)
    except (ValueError, TypeError) as error:
        raise ValueError('Invalid publisher size or content digest') from error
    if not 0 < size <= MAX_BYTES or len(md5)!=16:
        raise ValueError('Publisher archive exceeds bounds or lacks a valid content digest')
    return result


def fetch_candidate(output, approved, head_request=head, content_request=content):
    output=Path(output)
    if approved is not True:
        raise ValueError('Explicit download approval is required')
    resolved = output.resolve()
    protected = [ROOT/name for name in ('apps','packages','scripts','contracts','services','data','docs','.git')]
    if any(resolved.is_relative_to(parent) for parent in protected):
        raise ValueError('Download output is inside a protected source, active or frozen tree')
    if not any(resolved.is_relative_to(parent) and resolved != parent for parent in ((ROOT/'delivery-output').resolve(),Path('/tmp'))):
        raise ValueError('Download output must be an isolated delivery-output or /tmp stage')
    if output.exists():
        raise FileExistsError('Refusing an existing download directory')
    expected=headers(head_request())
    output.mkdir(mode=0o700)
    sha=hashlib.sha256()
    md5=hashlib.md5(usedforsecurity=False)
    size=0
    with content_request() as response, (output/'unep-mars-csv.zip').open('xb') as target:
        if response.geturl()!=URL:
            raise ValueError('Archive redirected away from the fixed publisher URL')
        if response.status!=200 or headers(response.headers)!=expected:
            raise ValueError('Publisher release changed before download')
        while chunk:=response.read(min(1_048_576,MAX_BYTES-size+1)):
            size+=len(chunk)
            if size>MAX_BYTES:
                raise ValueError('Archive exceeds 32 MB bound')
            sha.update(chunk)
            md5.update(chunk)
            target.write(chunk)
    if size!=int(expected['Content-Length']) or base64.b64encode(md5.digest()).decode()!=expected['Content-MD5'] or headers(head_request())!=expected:
        raise ValueError('Archive bytes or final release headers changed; partial candidate is not ready')
    manifest={'schemaVersion':1,'policyVersion':'mars-candidate-download/1','sourceUrl':URL,'finalUrl':URL,
              'catalogUrl':'https://methanedata.unep.org/download-dataset','license':'CC BY-NC-SA 4.0',
              'attribution':'UNEP IMEO Eye on Methane / MARS', 'retrievedAt':datetime.now(timezone.utc).isoformat(),
              'publisherHeaders':expected,'sha256':sha.hexdigest(),'bytes':size,'activeSnapshotChanged':False,
              'limitation':'Original dataset bytes, not supporting evidence of a repair. HTTPS/headers are not a publisher signature. Normalize and stage separately before any activation.'}
    with (output/'download-manifest.json').open('x') as file:
        json.dump(manifest,file,indent=2)
        file.write('\n')
    return manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--approve-download',action='store_true')
    args=parser.parse_args()
    print(json.dumps(fetch_candidate(args.output,args.approve_download)))
