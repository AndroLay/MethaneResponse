"""Reproducible allowlisted source archive. Local files only; no publication."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
ROOT_NAMES = {'README.md', 'AGENTS.md', 'LICENSE', 'NOTICE', 'package.json', 'bun.lock',
              'render.yaml', 'playwright.config.ts', '.gitignore', '.env.example', '.bun-version', '.editorconfig', 'tsconfig.e2e.json',
              'tsconfig.agent-lab.json', 'playwright.agent-lab.config.ts',
              'playwright.agent-lab-r12.config.ts', 'playwright.agent-lab-run-r12.config.ts',
              'playwright.agent-lab-run.config.ts', 'playwright.agent-lab-smoke.config.ts'}
TREES = ('apps/', 'packages/', 'scripts/', 'e2e/', 'contracts/', 'services/data-pipeline/', 'docs/',
         'data/fixtures/', 'data/real/', 'data/processed/', '.github/')
EXCLUDED_PARTS = {'node_modules', '.git', '.venv', '__pycache__', '.pytest_cache', '.cache',
                  'dist', 'out', 'cache', 'broadcast', '.playwright-cli', 'state', 'uploads',
                  'credentials', 'secrets', 'coverage', 'tmp', 'temp'}
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|AWS_SECRET_ACCESS_KEY\s*[:=]\s*[\x22\x27]?[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])|\bAIza[A-Za-z0-9_-]{35}\b|(?:CLIENT_SECRET|GOOGLE_API_KEY|OPENAI_API_KEY|AI_API_KEY)\s*[:=]\s*[\x22\x27]?[A-Za-z0-9_+/=-]{32,}|SEPOLIA_PRIVATE_KEY[ \t]*[:=][ \t]*[\x22\x27]?(?:0x)?[a-fA-F0-9]{64}\b')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + '\n').encode()


def select_source_paths(names):
    result = set()
    for name in names:
        path = PurePosixPath(name)
        if not name or path.is_absolute() or '\\' in name or '..' in path.parts or str(path) != name:
            continue
        if name not in ROOT_NAMES and not name.startswith(TREES):
            continue
        if any(part in EXCLUDED_PARTS for part in path.parts):
            continue
        if any(part.startswith('.') and part not in {'.github', '.env.example', '.gitignore', '.bun-version', '.editorconfig'} for part in path.parts):
            continue
        if name.startswith(('data/state/', 'data/raw/', 'apps/web/public/assets/')):
            continue
        if path.name.startswith('.env') and path.name != '.env.example':
            continue
        if path.suffix.lower() in {'.key', '.pem', '.p12', '.pfx', '.mp4', '.webm', '.pyc'}:
            continue
        if name.startswith('docs/design-reference/') and path.suffix.lower() != '.md':
            continue
        result.add(name)
    return sorted(result)


def source_payload(root, names, baseline):
    root = root.resolve()
    files = {}
    for name in select_source_paths(names):
        path = root / name
        if path.is_symlink() or path.resolve() != path:
            raise ValueError('Symlink source is not allowed: ' + name)
        if not path.is_file() or path.stat().st_size > 20_000_000:
            raise ValueError('Missing or oversized source: ' + name)
        data = path.read_bytes()
        if SECRET.search(data):
            raise ValueError('Recognizable credential material in source: ' + name)
        files[name] = data
    if not files:
        raise ValueError('Empty source allowlist')
    manifest = {'schemaVersion': 1, 'preparedDate': '2026-10-20', 'baselineCommit': baseline,
                'scope': 'Working-tree source bytes, including uncommitted implementation; no Git history or private runtime state.',
                'publicDeploymentVerified': False,
                'files': {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in files.items()}}
    files['source-manifest.json'] = encoded(manifest)
    files['checksums.sha256'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(files.items())).encode()
    return files


def write_archive(path, files):
    with zipfile.ZipFile(path, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 20, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compresslevel=9)


def verify_archive(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or archive.testzip() is not None:
            raise ValueError('Archive has duplicate members or invalid CRC')
        if any(PurePosixPath(name).is_absolute() or '..' in PurePosixPath(name).parts for name in names):
            raise ValueError('Unsafe archive path')
        manifest = json.loads(archive.read('source-manifest.json'))
        expected = set(manifest['files']) | {'source-manifest.json', 'checksums.sha256'}
        if set(names) != expected:
            raise ValueError('Archive manifest coverage mismatch')
        checksums = dict((name, sha) for sha, name in (line.split('  ', 1) for line in archive.read('checksums.sha256').decode().splitlines()))
        if set(checksums) != expected - {'checksums.sha256'}:
            raise ValueError('Archive checksum coverage mismatch')
        for name in checksums:
            data = archive.read(name)
            if digest(data) != checksums[name] or name in manifest['files'] and (len(data) != manifest['files'][name]['bytes'] or digest(data) != manifest['files'][name]['sha256']):
                raise ValueError('Archive content hash mismatch')
    return {'bytes': path.stat().st_size, 'sha256': digest(path.read_bytes()), 'members': len(names)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Refusing to replace existing source archive')
    names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    baseline = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip()
    files = source_payload(ROOT, names, baseline)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    write_archive(args.output, files)
    print(json.dumps({'sourceArchive': str(args.output), **verify_archive(args.output), 'uploaded': False}))


if __name__ == '__main__':
    main()
