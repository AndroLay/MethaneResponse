#!/usr/bin/env python3
"""Prepare an authorized local TXT or selectable-text PDF excerpt for review.

This utility performs no network or AI calls. It does not verify document
authenticity, license, scientific meaning, or methane mitigation outcomes.
The private JSON should not be committed or copied to a public web directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

CLAIMS = ('source_detected', 'operator_notified', 'mitigation_confirmed')
RIGHTS = ('owned', 'explicit_permission', 'link_only')
IDENTIFIER = re.compile(r'^[a-zA-Z0-9:_-]{1,64}$')
MAX_BYTES = 16 * 1024 * 1024
MAX_TEXT = 8_000
MAX_PAGES = 250
MAX_SELECTED_PAGES = 40


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _valid_https(url: str) -> bool:
    try:
        parts = urlsplit(url)
        return parts.scheme == 'https' and bool(parts.hostname) and not parts.username and not parts.password
    except ValueError:
        return False


def extract_text_pages(raw: bytes, requested_pages: tuple[int, ...] = ()) -> list[tuple[int, str]]:
    if requested_pages and set(requested_pages) != {1}:
        raise ValueError('UTF-8 text files contain only page 1')
    return [(1, raw.decode('utf-8-sig'))]


def extract_pdf_pages(path: Path, requested_pages: tuple[int, ...] = ()) -> list[tuple[int, str]]:
    pdfinfo = shutil.which('pdfinfo')
    pdftotext = shutil.which('pdftotext')
    if not pdfinfo or not pdftotext:
        raise RuntimeError('PDF extraction requires local Poppler tools (pdfinfo and pdftotext); no OCR or upload fallback is used')
    try:
        metadata = subprocess.run([pdfinfo, str(path.resolve())], capture_output=True, text=True, timeout=10, check=True)
    except (OSError, subprocess.SubprocessError) as exc:
        raise ValueError('PDF metadata could not be read locally') from exc
    encrypted = re.search(r'^Encrypted:\s*yes\b', metadata.stdout, re.IGNORECASE | re.MULTILINE)
    page_match = re.search(r'^Pages:\s*(\d+)\s*$', metadata.stdout, re.MULTILINE)
    if encrypted:
        raise ValueError('Encrypted PDFs must be decrypted by their owner first')
    if not page_match:
        raise ValueError('PDF page count could not be determined')
    page_count = int(page_match.group(1))
    if page_count < 1 or page_count > MAX_PAGES:
        raise ValueError('PDF must contain between 1 and 250 pages')
    selected = sorted(set(requested_pages or tuple(range(1, page_count + 1))))
    if len(selected) > MAX_SELECTED_PAGES:
        raise ValueError('Select at most 40 relevant pages')
    if any(page < 1 or page > page_count for page in selected):
        raise ValueError('Requested PDF page is out of bounds')

    # Extract contiguous selected ranges only; arguments are passed without a shell.
    ranges: list[tuple[int, int]] = []
    for page in selected:
        if ranges and page == ranges[-1][1] + 1:
            ranges[-1] = (ranges[-1][0], page)
        else:
            ranges.append((page, page))
    output: dict[int, str] = {}
    for first, last in ranges:
        try:
            result = subprocess.run(
                [pdftotext, '-layout', '-enc', 'UTF-8', '-f', str(first), '-l', str(last), str(path.resolve()), '-'],
                capture_output=True, text=True, encoding='utf-8', timeout=20, check=True,
            )
        except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
            raise ValueError('Selected PDF pages could not be extracted locally') from exc
        if len(result.stdout) > 1_000_000:
            raise ValueError('Selected PDF pages produced too much extracted text')
        pages = result.stdout.split('\f')
        for offset, page in enumerate(range(first, last + 1)):
            output[page] = pages[offset] if offset < len(pages) else ''
    return [(page, output[page]) for page in selected]


def extract_pages(path: Path, raw: bytes, requested_pages: tuple[int, ...] = ()) -> list[tuple[int, str]]:
    suffix = path.suffix.lower()
    if suffix == '.txt':
        return extract_text_pages(raw, requested_pages)
    if suffix == '.pdf':
        return extract_pdf_pages(path, requested_pages)
    else:
        raise ValueError('Only UTF-8 .txt and selectable-text .pdf files are supported')


def prepare_document(path: Path, *, source_id: str, claim_type: str, document_id: str,
                     title: str, source_url: str, rights_status: str,
                     pages: tuple[int, ...] = ()) -> dict:
    if not IDENTIFIER.fullmatch(source_id) or not IDENTIFIER.fullmatch(document_id):
        raise ValueError('Source and document IDs must be short safe identifiers')
    if claim_type not in CLAIMS or rights_status not in RIGHTS:
        raise ValueError('Unrecognized claim or rights classification')
    if not 1 <= len(title) <= 160 or not _valid_https(source_url):
        raise ValueError('Title is invalid or the source URL is not HTTPS')
    if rights_status == 'link_only':
        raise ValueError('Link-only evidence must remain at the publisher; do not extract or transmit text without permission')
    if not path.is_file() or path.stat().st_size > MAX_BYTES:
        raise ValueError('Missing document or document exceeds 16 MiB')
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES:
        raise ValueError('Document exceeds 16 MiB')
    extracted = extract_pages(path, raw, pages)
    sections = [{'page': page, 'text': text.strip()} for page, text in extracted if text.strip()]
    if not sections:
        raise ValueError('Selected pages contain no selectable text; OCR is not performed')
    chunks: list[str] = []
    page_hashes = []
    byte_offset = 0
    for index, section in enumerate(sections):
        separator = '\n\n' if index else ''
        prefix = f'{separator}[Document page {section["page"]}]\n'
        text_bytes = section['text'].encode('utf-8')
        page_start = byte_offset + len(prefix.encode('utf-8'))
        chunks.extend((prefix, section['text']))
        page_hashes.append({
            'page': section['page'],
            'textSha256': sha256(text_bytes),
            'excerptStartByte': page_start,
            'excerptLengthBytes': len(text_bytes),
        })
        byte_offset = page_start + len(text_bytes)
    combined = ''.join(chunks)
    utf16_length = len(combined.encode('utf-16-le')) // 2
    if utf16_length > MAX_TEXT:
        raise ValueError('Selected text exceeds the 8,000-character AI limit; select fewer pages instead of silently truncating')
    if utf16_length < 80:
        raise ValueError('Less than 80 characters; select an adequately detailed evidence excerpt')
    return {
        'apiPayload': {
            'sourceId': source_id,
            'claimType': claim_type,
            # Import never counts as provider or publication consent.
            'consentToExternalProcessing': False,
            'consentToPublishCitations': False,
            'documents': [{
                'id': document_id, 'title': title, 'text': combined, 'sourceUrl': source_url,
                'originalFileSha256': sha256(raw), 'rightsDeclared': rights_status,
                'selectedPages': page_hashes,
            }],
        },
        'localManifest': {
            'formatVersion': 1,
            'originalFilename': path.name, 'documentSha256': sha256(raw),
            'sourceUrl': source_url, 'rightsStatus': rights_status,
            'selectedPages': page_hashes,
            'extractedTextSha256': sha256(combined.encode('utf-8')),
            'sourceAuthenticityChecked': False,
            'scientificClaimVerified': False,
            'note': 'User-supplied origin and rights declaration; verify publisher, license, source relevance, and claim support independently.',
        },
    }


def write_private_json(path: Path, value: dict) -> None:
    resolved = path.resolve()
    if any(part.casefold() in {'public', 'design-reference'} for part in resolved.parts):
        raise ValueError('Evidence excerpt JSON must not be written to a public asset directory')
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(value, handle, indent=2, ensure_ascii=False)
            handle.write('\n')
    except BaseException:
        path.unlink(missing_ok=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('document', type=Path)
    parser.add_argument('--source-id', required=True)
    parser.add_argument('--claim-type', required=True, choices=CLAIMS)
    parser.add_argument('--document-id', required=True)
    parser.add_argument('--title', required=True)
    parser.add_argument('--source-url', required=True, help='Publisher URL, independently checked by the reviewer')
    parser.add_argument('--rights-status', required=True, choices=RIGHTS)
    parser.add_argument('--page', type=int, action='append', default=[], help='PDF page number; may be repeated')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    document = prepare_document(args.document, source_id=args.source_id, claim_type=args.claim_type,
                                document_id=args.document_id, title=args.title, source_url=args.source_url,
                                rights_status=args.rights_status, pages=tuple(args.page))
    write_private_json(args.output, document)
    excerpt = document['apiPayload']['documents'][0]['text']
    print(f'Prepared {len(excerpt)} excerpt characters. No external request was sent. Output: {args.output}')
    print('The browser will require separate explicit consent before AI processing or citation publication.')


if __name__ == '__main__':
    main()
