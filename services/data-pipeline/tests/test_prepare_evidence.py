import importlib.util
import json
import os
import sys
import textwrap
from pathlib import Path
from subprocess import CompletedProcess

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / 'scripts'
spec = importlib.util.spec_from_file_location('prepare_evidence_module', SCRIPTS / 'prepare_evidence.py')
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


def kwargs(**overrides):
    args = dict(source_id='KAZ_S_159', claim_type='mitigation_confirmed', document_id='private-report',
                title='Authorized sample report', source_url='https://example.org/report.pdf', rights_status='owned')
    args.update(overrides)
    return args


def test_prepares_authorized_text_with_provenance_and_private_default(tmp_path):
    path = tmp_path / 'input.txt'
    path.write_text('Investigation dated 2025-10-11. ' * 8, encoding='utf-8')
    result = mod.prepare_document(path, **kwargs())
    assert result['apiPayload']['consentToExternalProcessing'] is False
    assert result['apiPayload']['consentToPublishCitations'] is False
    assert result['localManifest']['documentSha256'] == mod.sha256(path.read_bytes())
    doc = result['apiPayload']['documents'][0]
    assert doc['originalFileSha256'] == result['localManifest']['documentSha256']
    assert doc['rightsDeclared'] == 'owned'
    assert doc['selectedPages'] == result['localManifest']['selectedPages']
    assert result['localManifest']['sourceAuthenticityChecked'] is False
    private = tmp_path / 'results' / 'private.json'
    mod.write_private_json(private, result)
    assert private.stat().st_mode & 0o777 == 0o600
    assert json.loads(private.read_text(encoding='utf-8')) == result
    with pytest.raises(FileExistsError):
        mod.write_private_json(private, result)


def test_rejects_link_only_rights_and_urls_with_credentials(tmp_path):
    path = tmp_path / 'sample.txt'
    path.write_text('Field evidence statement. ' * 8, encoding='utf-8')
    with pytest.raises(ValueError, match='Link-only'):
        mod.prepare_document(path, **kwargs(rights_status='link_only'))
    with pytest.raises(ValueError, match='HTTPS'):
        mod.prepare_document(path, **kwargs(source_url='https://reviewer:secret@example.org/report'))


def test_refuses_silent_truncation_unsupported_input_and_public_output(tmp_path):
    path = tmp_path / 'long.txt'
    path.write_text('Evidence text exceeds excerpt limit. ' * 400, encoding='utf-8')
    with pytest.raises(ValueError, match='8,000'):
        mod.prepare_document(path, **kwargs())
    image = tmp_path / 'image.png'
    image.write_bytes(b'not a text document')
    with pytest.raises(ValueError, match='Only UTF-8'):
        mod.prepare_document(image, **kwargs())
    with pytest.raises(ValueError, match='public'):
        mod.write_private_json(tmp_path / 'apps' / 'web' / 'public' / 'excerpt.json', {})


def test_extracts_only_selected_pdf_pages_with_local_poppler(tmp_path, monkeypatch):
    path = tmp_path / 'report.pdf'
    path.write_bytes(b'%PDF-test-placeholder')
    calls = []
    monkeypatch.setattr(mod.shutil, 'which', lambda name: name)

    def run(args, **kwargs):
        calls.append(args)
        if args[0] == 'pdfinfo':
            return CompletedProcess(args, 0, 'Pages: 3\nEncrypted: no\n', '')
        return CompletedProcess(args, 0,
            'The operator reports a completed valve repair after inspecting the listed source. '
            'Independent follow-up methane monitoring is not included.\f', '')

    monkeypatch.setattr(mod.subprocess, 'run', run)
    result = mod.prepare_document(path, **kwargs(pages=(2,)))
    doc = result['apiPayload']['documents'][0]
    assert doc['selectedPages'][0]['page'] == 2
    assert '[Document page 2]' in doc['text']
    assert calls[1][calls[1].index('-f') + 1] == '2'
    assert calls[1][calls[1].index('-l') + 1] == '2'


def _one_page_pdf(text):
    lines = [line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
             for line in textwrap.wrap(text, width=55)]
    commands = ' T* '.join(f'({line}) Tj' for line in lines)
    stream = f'BT /F1 12 Tf 72 720 Td 14 TL {commands} ET'.encode('ascii')
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream',
    ]
    data = bytearray(b'%PDF-1.4\n')
    offsets = [0]
    for number, body in enumerate(objects, 1):
        offsets.append(len(data))
        data.extend(f'{number} 0 obj\n'.encode() + body + b'\nendobj\n')
    xref_offset = len(data)
    data.extend(f'xref\n0 {len(offsets)}\n'.encode())
    data.extend(b'0000000000 65535 f \n')
    for offset in offsets[1:]:
        data.extend(f'{offset:010d} 00000 n \n'.encode())
    data.extend(f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n'.encode())
    return bytes(data)


def require_poppler():
    missing = [name for name in ('pdfinfo', 'pdftotext') if not mod.shutil.which(name)]
    if not missing:
        return
    message = f'Poppler PDF tools are unavailable: {", ".join(missing)}'
    if os.environ.get('CI', '').lower() in {'1', 'true', 'yes'}:
        raise RuntimeError(f'CI requires Poppler for PDF extraction coverage: {", ".join(missing)}')
    pytest.skip(message)


def test_ci_pdf_extraction_gate_fails_if_poppler_is_missing(monkeypatch):
    monkeypatch.setenv('CI', 'true')
    monkeypatch.setattr(mod.shutil, 'which', lambda _name: None)
    with pytest.raises(RuntimeError, match='CI requires Poppler'):
        require_poppler()


def test_real_poppler_extracts_a_selectable_pdf_when_available(tmp_path):
    require_poppler()
    path = tmp_path / 'selectable-report.pdf'
    expected = 'Independent field inspection documented a completed equipment repair; a follow-up methane measurement remains necessary.'
    path.write_bytes(_one_page_pdf(expected))
    result = mod.prepare_document(path, **kwargs())
    excerpt = result['apiPayload']['documents'][0]['text']
    assert ' '.join(expected.split()) in ' '.join(excerpt.split())
    assert result['apiPayload']['documents'][0]['originalFileSha256'] == mod.sha256(path.read_bytes())
