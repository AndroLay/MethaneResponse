#!/usr/bin/env python3
"""Build and verify a Notion ZIP-import package without uploading it."""

from __future__ import annotations

import hashlib
import argparse
import json
import re
import sys
import zipfile
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "docs/demo/delivery-2026-10-18"
REQUIRED_PAGE_FILES = [
    "README.md",
    "01-Presentation.md",
    "02-Judge-QA.md",
    "03-Sources-and-Claims.md",
    "04-Storyboard.md",
    "05-Runbook-ID.md",
]
OPTIONAL_PAGE_FILES = ["06-Video-Delivery-Evidence.md"]
IMPORT_ROOT = "MethaneResponse - IEEE ClimateChain"
MARKDOWN_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_local_links(package: Path, page_files: list[str]) -> None:
    page_names = set(page_files)
    asset_names = {f"assets/{path.name}" for path in (package / "assets").glob("*.png")}
    if not asset_names:
        raise RuntimeError("No real browser screenshots are available in the package assets folder.")
    for page_name in page_files:
        content = (package / page_name).read_text(encoding="utf-8")
        for target in MARKDOWN_LINK.findall(content):
            target = target.split("#", 1)[0].strip().strip("<>")
            if not target or target.startswith(("https://", "http://", "mailto:")):
                continue
            normalized = str(PurePosixPath(page_name).parent / target)
            normalized = str(PurePosixPath(normalized))
            if normalized not in page_names and normalized not in asset_names and normalized != "assets":
                raise RuntimeError(f"Notion import link does not resolve within the package: {page_name} -> {target}")
            if normalized in asset_names and not (package / normalized).is_file():
                raise RuntimeError(f"Referenced image is missing: {normalized}")


def build(package: Path, target: Path, import_root: str) -> dict[str, object]:
    package = package.resolve()
    page_files = [name for name in REQUIRED_PAGE_FILES if (package / name).is_file()]
    missing_pages = sorted(set(REQUIRED_PAGE_FILES) - set(page_files))
    if missing_pages:
        raise FileNotFoundError(f"Notion package is missing required pages: {', '.join(missing_pages)}")
    page_files.extend(name for name in OPTIONAL_PAGE_FILES if (package / name).is_file())
    if not import_root or "/" in import_root or import_root in {".", ".."}:
        raise ValueError("Import root must be one non-empty Notion folder name.")
    verify_local_links(package, page_files)
    if target.exists():
        raise FileExistsError(f"Refusing to overwrite an existing Notion package: {target}")
    if target.with_suffix(".manifest.json").exists():
        raise FileExistsError(f"Refusing to overwrite an existing Notion package manifest: {target.with_suffix('.manifest.json')}")
    target.parent.mkdir(parents=True, exist_ok=True)
    files = [package / name for name in page_files]
    files.extend(sorted((package / "assets").glob("*.png")))
    with zipfile.ZipFile(target, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
        for item in files:
            archive_name = f"{import_root}/{item.relative_to(package).as_posix()}"
            archive.write(item, archive_name)
    with zipfile.ZipFile(target) as archive:
        broken = archive.testzip()
        if broken is not None:
            target.unlink(missing_ok=True)
            raise RuntimeError(f"ZIP CRC check failed: {broken}")
        contents = archive.namelist()
        for page_name in page_files:
            expected = f"{import_root}/{page_name}"
            if expected not in contents:
                raise RuntimeError(f"ZIP is missing page: {expected}")
        image_count = sum(name.startswith(f"{import_root}/assets/") for name in contents)
        if image_count != len(list((package / "assets").glob("*.png"))):
            raise RuntimeError("ZIP does not contain every browser screenshot asset.")
    return {
        "schemaVersion": 1,
        "createdAt": datetime.now(ZoneInfo("Asia/Makassar")).date().isoformat(),
        "status": "local package; not imported or published",
        "target": str(target),
        "sizeBytes": target.stat().st_size,
        "sha256": sha256(target),
        "pageCount": len(page_files),
        "imageCount": len(list((package / "assets").glob("*.png"))),
        "members": [f"{import_root}/{item.relative_to(package).as_posix()}" for item in files],
        "validation": {"markdownLocalLinks": "passed", "zipCrc": "passed", "memberList": "passed"},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, help="target ZIP path; positional form remains supported")
    parser.add_argument("--package", type=Path, default=PACKAGE, help="source directory containing the six Notion pages and assets")
    parser.add_argument("--import-root", default=IMPORT_ROOT, help="top-level folder name inside the Notion ZIP")
    args = parser.parse_args()
    destination = args.output or Path("/tmp/MethaneResponse-Notion-2026-10-19-story-v3.zip")
    destination = destination.resolve()
    result = build(args.package, destination, args.import_root)
    manifest = destination.with_suffix(".manifest.json")
    manifest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
