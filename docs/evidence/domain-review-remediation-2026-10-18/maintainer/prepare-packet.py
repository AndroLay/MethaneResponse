"""Build/check the local P4 preparation packet; no network, contacts or app writes."""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit
import zipfile

PACKET = Path(__file__).resolve().parents[1]
ROOT = PACKET.parents[2]
VERSION = "P4-2026-10-18-v2"
V1 = ROOT / "docs/evidence/domain-review-preparation-2026-10-18/checksums.sha256"
REVIEW_DOCS = sorted((PACKET / "reviewer").glob("*.md"))
REVIEW_FILES = [p.name for p in REVIEW_DOCS] + [
    "cases.json", "06-method-excerpts.txt", "LICENSE-DATA.txt", "07-version.json", "index.html"
]
COMPARISON_FILES = ["comparison-readme.md", "baseline-observations.json", "research-remediation.md"]
DOCS = [
    "docs/testing/domain-expert-review.md", "docs/testing/README.md",
    "docs/product/data-and-claims.md", "docs/product/mars-response-workflow.md",
    "docs/release/current-implementation-status.md", "docs/plans/README.md",
    "docs/plans/2026-10-17-six-package-completion.md", "docs/research/README.md",
    "docs/evidence/README.md",
]
SOURCES = [
    "apps/api/src/audit.ts", "apps/api/src/casebook.ts", "apps/api/src/scoped-source.ts",
    "apps/api/src/human-assessment.ts", "apps/api/src/reviewer-directory.ts",
    "apps/api/src/evidence-check.ts", "apps/api/src/publication.ts",
    "apps/api/src/store.ts", "apps/api/src/app.ts", "apps/api/tsconfig.json",
    "packages/shared/src/index.ts", "packages/shared/src/trust.ts",
    "apps/web/src/EvidenceAuditorWorkflow.tsx", "apps/web/src/HumanAssessmentPanel.tsx",
    "apps/web/src/AssessmentTrustPanel.tsx", "apps/web/src/TransparencyPanel.tsx",
    "data/real/mars_casebook_2026-10-15.json",
    "data/real/UNEP-MARS-LICENSE-CC-BY-NC-SA-4.0.txt",
    str(V1.relative_to(ROOT)),
] + DOCS
SOURCES += [str(p.relative_to(ROOT)) for directory in ("apps/api/src", "apps/web/src", "packages/shared/src") for p in sorted((ROOT / directory).rglob("*")) if p.is_file() and p.suffix in {".ts", ".tsx", ".css"}]
SOURCES += ["e2e/audit-workflow.spec.ts", "e2e/ai-review-workflow.spec.ts", "playwright.config.ts", "scripts/check-local.sh", "scripts/check-web-bundle.ts", "package.json", "bun.lock", "apps/web/tsconfig.json", "scripts/verify-audit.ts", "scripts/verify-audit.test.ts", "docs/research/p4-research-remediation-2026-10-18.md", "docs/plans/2026-10-18-p4-research-remediation.md"]
SOURCES += [str(p.relative_to(ROOT)) for p in sorted((PACKET / "maintainer").iterdir())
            if p.is_file() and p.suffix in {".py", ".ts", ".json", ".md", ".csv"}]
CSS = """
:root{color-scheme:light;--ink:#18342f;--muted:#4a615b;--line:#d6e0da;--paper:#fff;--accent:#145b48}
*{box-sizing:border-box}body{margin:0;background:#f2f5f1;color:var(--ink);font:16px/1.65 system-ui,sans-serif}
.cover,main,footer{max-width:1080px;margin:auto;padding:36px 40px;background:var(--paper)}
.cover{border-top:8px solid var(--accent);padding-bottom:26px}.eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);font-weight:700}
h1,h2,h3{line-height:1.25;scroll-margin-top:24px}h1{font:700 38px/1.15 Georgia,serif;margin:12px 0}h2{font-size:26px}h3{font-size:20px}
.intro{max-width:76ch;color:var(--muted)}.status{padding:14px 18px;background:#f1f6ed;border-left:4px solid #658442}
nav ol{display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;padding-left:22px}a{color:#125c72;text-underline-offset:3px;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #c29025;outline-offset:3px}
section{border-top:1px solid var(--line);padding:20px 0 38px}p,li{max-width:90ch}code{font-size:.88em;overflow-wrap:anywhere}pre{padding:16px;background:#f2f5f3;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--line)}
table{width:100%;border-collapse:collapse;margin:20px 0;font-size:14px}th,td{border:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf3ee}blockquote{margin-left:0;padding-left:18px;border-left:3px solid var(--line)}
footer{border-top:1px solid var(--line);font-size:13px;color:var(--muted)}.back{font-size:13px}
@media(max-width:720px){.cover,main,footer{padding:24px 18px}h1{font-size:30px}nav ol{display:block}nav li{margin:8px 0}table{font-size:12px}th,td{padding:7px 5px}}
@media print{body{background:white;font-size:10pt}.cover,main,footer{max-width:none;padding:12mm 0}.cover{border-top-width:2mm}nav,.back{display:none}section{break-before:page}h2,h3{break-after:avoid}tr,pre{break-inside:avoid}a{color:inherit}th{background:#eee}table{font-size:8pt}}
"""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def sha_lines(files: dict[str, bytes]) -> bytes:
    return "".join(f"{digest(data)}  {name}\n" for name, data in sorted(files.items())).encode()


def offline_html() -> bytes:
    from markdown_it import MarkdownIt
    md = MarkdownIt("commonmark", {"html": False}).enable("table")
    sections = {p.name: "doc-" + p.stem for p in REVIEW_DOCS}
    body = []
    nav = []
    for path in REVIEW_DOCS:
        tokens = md.parse(path.read_text())
        title = next(t.content for t in tokens if t.type == "inline")
        nav.append(f'<li><a href="#{sections[path.name]}">{html.escape(title)}</a></li>')
        for token in tokens:
            if token.type in {"heading_open", "heading_close"}:
                token.tag = "h" + str(min(int(token.tag[1:]) + 1, 6))
            for child in token.children or []:
                if child.type == "link_open" and child.attrGet("href") in sections:
                    child.attrSet("href", "#" + sections[child.attrGet("href")])
        rendered = md.renderer.render(tokens, md.options, {})
        body.append(f'<section id="{sections[path.name]}">{rendered}<a class="back" href="#top">Kembali ke daftar isi</a></section>')
    return (f'<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>MethaneResponse | Review metode P4</title><style>{CSS}</style></head><body>'
            '<header class="cover" id="top"><div class="eyebrow">MethaneResponse · Review independen · 18 Oktober 2026</div>'
            '<h1>Permintaan review metode<br>dan interpretasi bukti</h1>'
            f'<p class="intro">{VERSION} · 6 kasus metadata historis nyata + 6 kasus DEMO · 60–75 menit atau asinkron.</p>'
            '<p class="status"><strong>Paket persiapan.</strong> Belum ada pakar terkonfirmasi atau hasil review manusia. '
            'Kami meminta kritik metode; formulir tetap kosong. Keluaran baseline diberikan terpisah setelah penilaian awal.</p>'
            '<p>Halaman dapat dibaca offline dan dicetak. Isi <a href="04-response-form.md">salinan formulir</a> pada dokumen privat; '
            'halaman ini tidak menyimpan jawaban. Tautan sumber eksternal memerlukan internet.</p>'
            '<nav aria-label="Daftar isi"><h2>Bahan review</h2><ol>' + "".join(nav) + '</ol></nav></header><main>'
            + "".join(body) + '</main><footer>Adaptasi metadata UNEP IMEO / MARS: CC BY-NC-SA 4.0. '
            '<a href="LICENSE-DATA.txt">Notice data</a> · <a href="07-version.json">Versi sumber</a>. '
            'Prototipe independen; tidak menyatakan dukungan UNEP/IEA atau validasi perbaikan fisik.</footer></body></html>\n').encode()


def run_checks() -> list[dict]:
    commands = [
        ["sha256sum", "--check", "--quiet", str((PACKET / "implementation-files.sha256").relative_to(ROOT))],
        ["bun", "--no-env-file", str((PACKET / "maintainer/reproduce-cases.ts").relative_to(ROOT)), "--check"],
        ["bun", "run", "tsc", "--project", str((PACKET / "maintainer/tsconfig.json").relative_to(ROOT))],
        ["python", "-c", "import hashlib,pathlib; p=pathlib.Path('docs/evidence/domain-review-preparation-2026-10-18'); assert all(hashlib.sha256((p / n).read_bytes()).hexdigest() == h for h,n in (line.split('  ',1) for line in (p / 'checksums.sha256').read_text().splitlines()))"],
        ["git", "diff", "--check"],
    ]
    results = []
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise ValueError(f"Check failed: {' '.join(command)}\n{result.stderr[:1000]}\n{result.stdout[:1000]}")
        results.append({"command": " ".join(command), "exitCode": 0, "output": result.stdout.strip()})
    return results


def validate_documents(building: bool = False) -> dict:
    from markdown_it import MarkdownIt
    parser = MarkdownIt("commonmark").enable("table")
    files = sorted(set(PACKET.rglob("*.md")) | {ROOT / name for name in DOCS})
    links = 0
    pending = {PACKET / name for name in ("manifest.json", "preparation-checks.json", "checksums.sha256")} if building else set()
    for path in files:
        content = path.read_text()
        fence = None
        for line in content.splitlines():
            match = re.match(r"^\s{0,3}(`{3,}|~{3,})", line)
            if match:
                mark = match[1]
                if fence is None:
                    fence = mark
                elif mark[0] == fence[0] and len(mark) >= len(fence):
                    fence = None
        if fence:
            raise ValueError(f"Unclosed code fence: {path.relative_to(ROOT)}")
        for token in parser.parse(content):
            for child in token.children or []:
                if child.type != "link_open":
                    continue
                target = urlsplit(child.attrGet("href"))
                if target.scheme or not target.path:
                    continue
                dest = (path.parent / unquote(target.path)).resolve()
                if not dest.is_relative_to(ROOT) or (not dest.exists() and dest not in pending):
                    raise ValueError(f"Missing/unsafe document path: {path.relative_to(ROOT)} -> {target.path}")
                links += 1
    class HtmlCheck(HTMLParser):
        def __init__(self):
            super().__init__()
            self.ids, self.links = set(), []
        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            if tag in {"script", "iframe", "form", "input"} or any(k.startswith("on") for k in values):
                raise ValueError("Unexpected active content in offline document")
            if "id" in values:
                if values["id"] in self.ids:
                    raise ValueError("Duplicate HTML id")
                self.ids.add(values["id"])
            if tag in {"img", "link", "script"} and ("src" in values or "href" in values):
                raise ValueError("Unexpected external asset dependency")
            if tag == "a":
                self.links.append(values["href"])
    check = HtmlCheck()
    check.feed((PACKET / "reviewer/index.html").read_text())
    for href in check.links:
        target = urlsplit(href)
        if target.scheme:
            continue
        if target.path and not (PACKET / "reviewer" / unquote(target.path)).is_file():
            raise ValueError(f"Broken offline document link: {href}")
        if target.fragment and target.fragment not in check.ids:
            raise ValueError(f"Broken offline document anchor: {href}")
    return {"markdownFiles": len(files), "localFileLinks": links, "htmlAnchors": len(check.ids),
            "htmlLinks": len(check.links), "offlineHtmlMatchesMarkdown": (PACKET / "reviewer/index.html").read_bytes() == offline_html()}


def archive_members(comparison: bool) -> dict[str, bytes]:
    prefix = "MethaneResponse-P4-comparison-v2/" if comparison else "MethaneResponse-P4-reviewer-v2/"
    directory = PACKET / ("maintainer" if comparison else "reviewer")
    names = COMPARISON_FILES if comparison else REVIEW_FILES
    files = {name: (directory / name).read_bytes() for name in names}
    if comparison:
        files["07-version.json"] = (PACKET / "reviewer/07-version.json").read_bytes()
    else:
        files["SOURCE-FILES.sha256"] = (PACKET / "source-files.sha256").read_bytes()
    files["SHA256SUMS"] = sha_lines(files)
    return {prefix + name: value for name, value in files.items()}


def zip_path(comparison: bool) -> Path:
    return PACKET / ("MethaneResponse-P4-comparison-v2.zip" if comparison else "MethaneResponse-P4-reviewer-v2.zip")


def write_zip(path: Path, files: dict[str, bytes]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 18, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)


def validate_archives() -> list[dict]:
    results = []
    for comparison in (False, True):
        path = zip_path(comparison)
        expected = archive_members(comparison)
        with zipfile.ZipFile(path) as archive:
            if archive.testzip() is not None or sorted(archive.namelist()) != sorted(expected):
                raise ValueError(f"Archive integrity/member mismatch: {path.name}")
            for name, data in expected.items():
                if archive.read(name) != data or Path(name).is_absolute() or ".." in Path(name).parts:
                    raise ValueError(f"Archive byte/path mismatch: {name}")
        results.append({"file": path.name, "sha256": digest(path.read_bytes()), "bytes": path.stat().st_size,
                        "members": sorted(expected), "crcAndOriginalBytes": "passed",
                        "phase": "B_IMPLEMENTATION_COMPARISON" if comparison else "A_INITIAL_EXPERT_ASSESSMENT"})
    return results


def validate_hash_list(path: Path, base: Path) -> int:
    count = 0
    for line in path.read_text().splitlines():
        expected, name = line.split("  ", 1)
        target = (base / name).resolve()
        if not target.is_relative_to(base) or digest(target.read_bytes()) != expected:
            raise ValueError(f"Source/artifact hash mismatch: {name}")
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--build", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    commands = run_checks()
    if args.build:
        (PACKET / "reviewer/index.html").write_bytes(offline_html())
        files = {name: (ROOT / name).read_bytes() for name in sorted(set(SOURCES))}
        (PACKET / "source-files.sha256").write_bytes(sha_lines(files))
        head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
        version = {"packetVersion": VERSION, "preparedDate": "2026-10-18", "baseHead": head,
                   "workingTreeHasUncommittedChanges": True,
                   "status": "PREPARATION_ONLY_NO_EXPERT_RESULTS", "confirmedExperts": 0, "sessions": 0,
                   "expertResponses": 0, "snapshotId": "unep-mars-675417694883",
                   "archiveSha256": "675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43",
                   "sourceBindingSha256": digest((PACKET / "source-files.sha256").read_bytes()),
                   "casesSha256": digest((PACKET / "reviewer/cases.json").read_bytes()),
                   "implementationComparisonSha256": digest((PACKET / "maintainer/baseline-observations.json").read_bytes()),
                   "sourceBindingScope": "Current API/web/shared source and tests plus selected data/docs/tools. P4 v1 artifact bytes independently preserved; P3 is historical, not an unchanged-code gate.",
                   "dataLicense": "CC BY-NC-SA 4.0; publisher reports not reproduced"}
        (PACKET / "reviewer/07-version.json").write_bytes(json_bytes(version))
        for comparison in (False, True):
            write_zip(zip_path(comparison), archive_members(comparison))
    document_checks = validate_documents(building=args.build)
    if not document_checks["offlineHtmlMatchesMarkdown"]:
        raise ValueError("Offline HTML differs from source Markdown")
    sources = validate_hash_list(PACKET / "source-files.sha256", ROOT)
    archives = validate_archives()
    plan = (ROOT / "docs/plans/2026-10-17-six-package-completion.md").read_text()
    p4 = plan.split("## 7. P4", 1)[1].split("## 8. P5", 1)[0]
    if p4.count("- [ ]") != 5 or "- [x]" in p4:
        raise ValueError("Original P4 human outcome checklists must remain unchecked")
    report = {"packetVersion": VERSION, "checkedDate": "2026-10-18", "commands": commands,
              "documents": document_checks, "sourceFilesChecked": sources, "archives": archives,
              "originalP4HumanCheckboxesUnchecked": 5,
              "limits": ["No expert review, consent, results or recheck exists.",
                         "Technical remediation changed app behavior; current application checks are recorded separately in verification-results.md. This packet check is not a scientific or human review.",
                         "No contact, external mutation, provider invocation, report download or deployment."]}
    if args.build:
        (PACKET / "preparation-checks.json").write_bytes(json_bytes(report))
        manifest = {"packetVersion": VERSION, "preparedDate": "2026-10-18", "preparationStatus": "READY_TO_SEND",
                    "overallP4Status": "IN_PROGRESS_HUMAN_REVIEW_NOT_STARTED",
                    "confirmedExperts": 0, "sessions": 0, "expertResults": 0,
                    "caseCount": {"realHistoricalMetadata": 6, "syntheticDemo": 6},
                    "version": "reviewer/07-version.json", "sourceBinding": "source-files.sha256",
                    "sourceFilesChecked": sources, "checks": "preparation-checks.json",
                    "checksSha256": digest((PACKET / "preparation-checks.json").read_bytes()),
                    "archives": archives, "offlineReader": "reviewer/index.html",
                    "browserPreview": "browser-preview.json",
                    "technicalRemediation": "VERIFIED_LOCAL_WITH_RECORDED_LIMITS",
                    "applicationChecks": "verification-results.md",
                    "applicationSourceBinding": "implementation-files.sha256",
                    "generator": {"python": sys.version.split()[0], "markdownItPy": "4.2.0", "network": False},
                    "humanCompletionCriteria": "Original five P4 checkboxes; actual qualified independent review, material fixes/recheck and consented summary remain pending."}
        (PACKET / "manifest.json").write_bytes(json_bytes(manifest))
        files = {str(p.relative_to(PACKET)): p.read_bytes() for p in sorted(PACKET.rglob("*"))
                 if p.is_file() and p.name != "checksums.sha256" and "__pycache__" not in p.parts}
        (PACKET / "checksums.sha256").write_bytes(sha_lines(files))
    count = validate_hash_list(PACKET / "checksums.sha256", PACKET)
    if validate_documents() != document_checks:
        raise ValueError("Final document paths differ from recorded checks")
    stored = json.loads((PACKET / "preparation-checks.json").read_text())
    if report != stored:
        raise ValueError("Recorded checks differ from current packet; build a new version after intentional changes")
    print(f"P4 preparation verified: 12 cases; {sources} source bindings; {count} artifact checksums; 2 ZIPs; 0 expert results.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as exc:
        sys.exit(str(exc))
