"""Audit explicitly selected publication refs without changing Git or contacting a remote.

Only the JSON report is written. Findings contain locations, never matched values.
Exit 0: no automated findings; 1: findings/review required; 2: incomplete audit.
Image provenance and visual acceptance still require the documented human/AI review.
"""
from __future__ import annotations

import argparse
import binascii
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import tokenize


DEFAULT_OUTPUT = "evidence/petals/publication-local.json"
AUDIT_PATH = "scripts/publication_audit.py"
CANDIDATE_REFS = ["refs/heads/main"] + [f"refs/tags/v{i}" for i in range(12)]
ALLOWED_IDENTITY = ("Garden Example", "garden-example@users.noreply.github.com")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".tif", ".tiff", ".bmp", ".avif", ".ico"}
PATTERN_DEFINITIONS = {
    "personal_path": r"(?i)(?:[A-Z]:[\\/]+(?:Users|Documents and Settings)[\\/]+[^\s\x22\x27<>]+|/(?:home|Users)/[^\s\x22\x27<>]+)",
    "credential_format": r"(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{25,}|-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----)",
    "credential_literal": r"(?i)[\x22\x27]?(?:password|passwd|secret|api[_-]?key|access[_-]?token|authorization)[\x22\x27]?\s*[:=]\s*[\x22\x27]([^\x22\x27\r\n]{8,})[\x22\x27]",
    "bearer_credential": r"(?i)\bBearer\s+[A-Za-z0-9_.~-]{20,}",
    "conversation_markup": r"(?i)<(?:transcript_evidence|codex_delegation|analysis|assistant|system)(?:\s|>)|\[im_start\]|\[start_header_id\]",
    "external_image_embed": r"(?i)(?:data:image/|<img\b[^>]*\bsrc\s*=\s*[\x22\x27]https?://|url\(\s*[\x22\x27]?https?://[^)\s]+\.(?:png|jpe?g|gif|webp|svg))",
}
PATTERNS = {key: re.compile(value) for key, value in PATTERN_DEFINITIONS.items()}
PLACEHOLDERS = {"your_api_key", "your-api-key", "your_token", "your-token", "placeholder", "example-token", "not-a-secret"}


class AuditError(Exception):
    """A safe diagnostic that does not contain file contents or Git stderr."""


def git(repo: Path, *args: str, optional: bool = False) -> bytes | None:
    env = os.environ.copy()
    env.update(GIT_NO_REPLACE_OBJECTS="1", GIT_NO_LAZY_FETCH="1", GIT_OPTIONAL_LOCKS="0")
    result = subprocess.run(["git", "--no-replace-objects", *args], cwd=repo, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        if optional:
            return None
        raise AuditError("git_read_failed:" + args[0])
    return result.stdout


def selected_refs(repo: Path) -> tuple[dict, list]:
    refs, missing = {}, []
    for ref in CANDIDATE_REFS:
        raw = git(repo, "rev-parse", "--verify", "--quiet", ref, optional=True)
        if raw is None:
            missing.append(ref)
            continue
        oid = raw.decode("ascii").strip()
        commit = git(repo, "rev-parse", "--verify", oid + "^{commit}")
        refs[ref] = {"object": oid, "commit": commit.decode("ascii").strip()}
    if "refs/heads/main" not in refs:
        raise AuditError("required_main_ref_missing")
    return refs, missing


def safe_path(path: str) -> str:
    if any(PATTERNS[key].search(path) for key in ("personal_path", "credential_format", "bearer_credential")):
        return "[redacted-path;sha256=" + hashlib.sha256(path.encode("utf-8", errors="replace")).hexdigest()[:16] + "]"
    return path


def self_pattern_spans(text: str, paths: list[str]) -> list[tuple[int, int]]:
    """Filter only known regex literal tokens in this script, not lines/comments."""
    if AUDIT_PATH not in paths:
        return []
    starts, total = [], 0
    for line in text.splitlines(keepends=True):
        starts.append(total)
        total += len(line)
    spans = []
    try:
        for token in tokenize.generate_tokens(io.StringIO(text).readline):
            if token.type != tokenize.STRING:
                continue
            # literal_eval understands raw strings; tokenize uses character columns.
            import ast
            try:
                value = ast.literal_eval(token.string)
            except (SyntaxError, ValueError):
                continue
            if isinstance(value, str) and value in PATTERN_DEFINITIONS.values():
                spans.append((starts[token.start[0] - 1] + token.start[1],
                              starts[token.end[0] - 1] + token.end[1]))
    except (tokenize.TokenError, IndentationError):
        pass  # A malformed script receives no broad exemption.
    return spans


class Scanner:
    def __init__(self):
        self.findings = []
        self.suppressed = 0
        self.png_chunks = Counter()
        self.identities = Counter()

    def add(self, category: str, location: dict, severity: str = "error", **extra):
        self.findings.append({"category": category, "severity": severity, **location, **extra})

    def text(self, text: str, location: dict, paths: list[str]):
        spans = self_pattern_spans(text, paths)
        for category, pattern in PATTERNS.items():
            for match in pattern.finditer(text):
                if any(start <= match.start() and match.end() <= end for start, end in spans):
                    self.suppressed += 1
                    continue
                if category == "credential_literal" and match.group(1).lower() in PLACEHOLDERS:
                    continue
                line = text.count("\n", 0, match.start()) + 1
                column = match.start() - text.rfind("\n", 0, match.start())
                self.add(category, location, line=line, column=column)
        roles = list(re.finditer(r"(?im)^\s*(assistant|system|user)\s*:\s+", text))
        if len({match.group(1).lower() for match in roles}) >= 2:
            self.add("role_transcript", location, severity="review", line=text.count("\n", 0, roles[0].start()) + 1)

    def identity(self, data: bytes, kind: str, oid: str):
        for role in (("author", "committer") if kind == "commit" else ("tagger",)):
            match = re.search(rb"(?m)^" + role.encode() + rb" (.*?) <([^>]+)> \d+ [+-]\d{4}$", data)
            if not match:
                self.add("missing_git_identity", {"source": "git_" + kind, "object": oid}, role=role)
                continue
            identity = tuple(part.decode("utf-8", errors="replace") for part in match.groups())
            allowed = identity == ALLOWED_IDENTITY
            self.identities["allowed" if allowed else "unexpected"] += 1
            if not allowed:
                self.add("author_identity", {"source": "git_" + kind, "object": oid}, role=role,
                         identity_sha256=hashlib.sha256(b"\0".join(match.groups())).hexdigest())

    def png(self, data: bytes, location: dict):
        position, chunks, valid = 8, [], True
        while position + 12 <= len(data):
            size = struct.unpack(">I", data[position:position + 4])[0]
            end = position + 12 + size
            if end > len(data):
                valid = False
                break
            raw_kind = data[position + 4:position + 8]
            kind = raw_kind.decode("ascii", errors="replace")
            payload = data[position + 8:position + 8 + size]
            crc = struct.unpack(">I", data[position + 8 + size:end])[0]
            if binascii.crc32(raw_kind + payload) & 0xffffffff != crc:
                valid = False
            chunks.append(kind)
            self.png_chunks[kind] += 1
            if kind in {"tEXt", "zTXt", "iTXt", "eXIf"}:
                self.add("png_sensitive_metadata", location, chunk=kind)
            elif kind not in {"IHDR", "PLTE", "IDAT", "IEND", "tRNS", "sRGB", "gAMA", "cHRM", "pHYs", "iCCP", "bKGD", "sBIT"}:
                self.add("png_unexpected_chunk", location, severity="review", chunk=kind)
            position = end
            if kind == "IEND":
                break
        if not chunks or chunks[0] != "IHDR" or chunks[-1] != "IEND" or "IDAT" not in chunks or position != len(data) or not valid:
            self.add("invalid_png_structure", location)

    def blob(self, data: bytes, location: dict, paths: list[str]) -> str:
        for path in paths:
            if (Path(path).suffix.lower() in IMAGE_SUFFIXES or data.startswith(PNG_SIGNATURE)) and (not path.startswith("evidence/") or Path(path).suffix.lower() != ".png"):
                self.add("source_image_asset", location, asset_path=safe_path(path))
        if data.startswith(PNG_SIGNATURE):
            self.png(data, location)
            # Raw byte scan also catches uncompressed marker text in ancillary chunks.
            self.text(data.decode("latin1"), location, paths=[])
            return "png"
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            self.add("non_png_binary", location, bytes=len(data))
            self.text(data.decode("latin1"), location, paths=[])
            return "other_binary"
        if "\0" in text:
            self.add("non_png_binary", location, bytes=len(data))
            return "other_binary"
        self.text(text, location, paths)
        return "text"


def worktree_snapshot(repo: Path, output_rel: str) -> dict:
    listing = git(repo, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
    snapshot = {}
    for raw in listing.split(b"\0"):
        if not raw:
            continue
        relative = raw.decode("utf-8", errors="surrogateescape")
        if relative == output_rel or ".git" in Path(relative).parts:
            continue
        path = repo / relative
        if not path.exists() and not path.is_symlink():
            snapshot[relative] = ("deleted", None)
            continue
        # Resolve every candidate before reading: do not follow links/junctions out.
        try:
            resolved = path.resolve()
            outside = (not resolved.is_relative_to(repo) or resolved != path.absolute()
                       or ".git" in resolved.relative_to(repo).parts)
        except OSError:
            outside = True
        if path.is_symlink() or outside:
            snapshot[relative] = ("unscanned_link", None)
        elif not path.is_file():
            snapshot[relative] = ("unscanned_nonfile", None)
        else:
            data = path.read_bytes()
            snapshot[relative] = (hashlib.sha256(data).hexdigest(), data)
    return snapshot


def audit(repo: Path, output_rel: str) -> dict:
    scanner = Scanner()
    head = git(repo, "rev-parse", "--verify", "HEAD").decode("ascii").strip()
    head_ref = git(repo, "symbolic-ref", "--quiet", "HEAD", optional=True)
    refs, missing = selected_refs(repo)
    shallow = git(repo, "rev-parse", "--is-shallow-repository").strip() == b"true"
    graft_path = git(repo, "rev-parse", "--git-path", "info/grafts").decode().strip()
    if (repo / graft_path).exists():
        raise AuditError("legacy_grafts_present_scope_cannot_be_guaranteed")
    if shallow:
        scanner.add("incomplete_shallow_history", {"source": "git_scope"})
    tips = sorted({item["object"] for item in refs.values()})
    objects = set(git(repo, "rev-list", "--objects", "--no-object-names", *tips).decode("ascii").splitlines())
    objects.update(tips)
    commits = git(repo, "rev-list", *sorted({item["commit"] for item in refs.values()})).decode("ascii").splitlines()
    paths_by_oid, historical_paths = defaultdict(set), set()
    for commit in commits:
        for item in git(repo, "ls-tree", "-r", "-z", commit).split(b"\0"):
            if not item:
                continue
            header, raw_path = item.split(b"\t", 1)
            mode, kind, oid = header.decode("ascii").split()
            path = raw_path.decode("utf-8", errors="replace")
            historical_paths.add(path)
            paths_by_oid[oid].add(path)
            scanner.text(path, {"source": "git_path", "object": oid, "paths": [safe_path(path)]}, [])
            if mode == "160000":
                scanner.add("unscanned_git_submodule", {"source": "git_tree", "object": commit, "paths": [safe_path(path)]})
    env = os.environ.copy()
    env.update(GIT_NO_REPLACE_OBJECTS="1", GIT_NO_LAZY_FETCH="1", GIT_OPTIONAL_LOCKS="0")
    process = subprocess.Popen(["git", "--no-replace-objects", "cat-file", "--batch"], cwd=repo,
                               env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    counts, formats = Counter(), Counter()
    try:
        for oid in sorted(objects):
            process.stdin.write((oid + "\n").encode("ascii"))
            process.stdin.flush()
            header = process.stdout.readline().decode("ascii").split()
            if len(header) != 3 or not header[2].isdigit():
                raise AuditError("selected_git_object_unreadable")
            kind, size = header[1], int(header[2])
            data = process.stdout.read(size)
            if len(data) != size or process.stdout.read(1) != b"\n":
                raise AuditError("selected_git_object_truncated")
            counts[kind] += 1
            paths = sorted(paths_by_oid[oid])
            location = {"source": "git_" + kind, "object": oid, "paths": [safe_path(p) for p in paths]}
            if kind == "blob":
                formats[scanner.blob(data, location, paths)] += 1
            elif kind in {"commit", "tag"}:
                scanner.identity(data, kind, oid)
                scanner.text(data.decode("utf-8", errors="replace"), location, [])
            elif kind != "tree":
                scanner.add("unexpected_git_object_type", location, object_type=kind)
    finally:
        process.stdin.close()
        process.stdout.close()
        process.stderr.close()
        process.wait()
    snapshot = worktree_snapshot(repo, output_rel)
    working_counts, fingerprint = Counter(), hashlib.sha256()
    for path, (digest, data) in sorted(snapshot.items()):
        location = {"source": "working_tree", "paths": [safe_path(path)]}
        scanner.text(path, {"source": "working_tree_path", "paths": [safe_path(path)]}, [])
        fingerprint.update(path.encode("utf-8", errors="replace") + b"\0" + digest.encode() + b"\n")
        working_counts["candidate_files"] += 1
        if data is None:
            working_counts[digest] += 1
            if digest != "deleted":
                scanner.add(digest, location)
            continue
        kind = scanner.blob(data, location, [path])
        working_counts[{"png": "png_files", "text": "text_files", "other_binary": "other_binary_files"}[kind]] += 1
    after = worktree_snapshot(repo, output_rel)
    changed = sorted(path for path in snapshot.keys() | after.keys() if snapshot.get(path, (None,))[0] != after.get(path, (None,))[0])
    refs_after, _ = selected_refs(repo)
    head_after = git(repo, "rev-parse", "--verify", "HEAD").decode("ascii").strip()
    stable = not changed and refs == refs_after and head == head_after
    if not stable:
        scanner.add("concurrent_changes_during_audit", {"source": "snapshot"}, changed_paths=[safe_path(p) for p in changed])
    errors = sum(item["severity"] == "error" for item in scanner.findings)
    return {
        "schema_version": 1,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "status": "findings" if scanner.findings else "pass",
        "scope": {"repository": ".", "refs": refs, "missing_optional_refs": [r for r in missing if r != "refs/heads/main"],
                  "git_selection": "Explicit main and listed version tags only; no other refs or reflogs enumerated.",
                  "replace_objects_disabled": True, "lazy_fetch_disabled": True, "shallow": shallow,
                  "annotated_tag_metadata_included": True,
                  "working_tree": "Tracked and nonignored untracked candidates; links are not followed; deleted tracked paths recorded.",
                  "excluded_generated_paths": [output_rel]},
        "head": {"object": head, "symbolic_ref": head_ref.decode().strip() if head_ref and head_ref.decode().strip() in refs else "other_or_detached",
                 "is_main_tip": head == refs["refs/heads/main"]["commit"], "included_in_selected_history": head in commits},
        "snapshot": {"stable_during_read": stable, "working_tree_sha256": fingerprint.hexdigest(),
                     "head_after": head_after, "refs_unchanged": refs == refs_after},
        "counts": {"git_objects": dict(counts), "historical_paths": len(historical_paths), "git_blob_formats": dict(formats),
                   "working_tree": dict(working_counts), "png_chunks_git_and_worktree": dict(scanner.png_chunks),
                   "git_identities": dict(scanner.identities), "suppressed_self_pattern_literal_matches": scanner.suppressed,
                   "findings": len(scanner.findings), "errors": errors},
        "findings": scanner.findings,
        "limits": ["No remote query, credential lookup, application execution, visibility change, or Git mutation.",
                   "Pattern checks cannot prove absence of every secret or identify the origin of arbitrary image pixels.",
                   "External source URLs and rights prose are not image redistribution; source licensing/visual provenance require manual review.",
                   "A pass is an automated local scan, not public-release approval or visual acceptance."]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Report path relative to repository; must stay inside it.")
    args = parser.parse_args()
    repo = args.repo.resolve()
    output = (repo / args.output).resolve()
    if not output.is_relative_to(repo) or ".git" in output.relative_to(repo).parts:
        parser.error("report must remain inside the repository and outside Git metadata")
    relative = output.relative_to(repo).as_posix()
    try:
        report = audit(repo, relative)
        exit_code = 1 if report["findings"] else 0
    except (AuditError, OSError, UnicodeError) as error:
        report = {"schema_version": 1, "recorded_at": datetime.now(timezone.utc).isoformat(),
                  "status": "incomplete", "error": str(error) if isinstance(error, AuditError) else type(error).__name__,
                  "findings": [], "limits": ["Audit did not complete; do not interpret this report as clean."]}
        exit_code = 2
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "report": relative,
                      "findings": len(report["findings"]), "head": report.get("head", {}).get("object")}, ensure_ascii=False))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
