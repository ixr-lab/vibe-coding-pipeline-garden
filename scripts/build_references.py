#!/usr/bin/env python3
"""Compile local reference notes into browser data and the reference board.

Uses the Python standard library only. No images or network resources are read.
"""

import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import quote, urlsplit


CATEGORIES = (
    ("flowers.json", "flower", "꽃"),
    ("brushes.json", "brush", "브러시"),
)
ARRAY_FIELDS = ("observations", "avoid", "targets", "implementation", "gaps")
SECTION_LABELS = (
    ("observations", "관찰"),
    ("avoid", "회피할 특징"),
    ("targets", "목표"),
    ("implementation", "구현"),
    ("gaps", "미달·확인하지 못한 부분"),
)
PENDING_REVIEW = "결과 검토 진행"


class ReferenceError(ValueError):
    """Invalid source data; generated files must not be changed."""


def require_text(value, location):
    if not isinstance(value, str) or not value.strip():
        raise ReferenceError(f"{location}: expected a non-empty string")


def validate_url(value, location):
    require_text(value, location)
    try:
        parsed = urlsplit(value)
    except ValueError as error:
        raise ReferenceError(f"{location}: invalid URL") from error
    if (parsed.scheme not in ("http", "https") or not parsed.netloc
            or any(character.isspace() or ord(character) < 32 for character in value)):
        raise ReferenceError(f"{location}: expected an absolute HTTP(S) URL")


def load_references(root):
    """Validate the two JSON arrays and add only derived browser fields."""
    items = []
    identifiers = set()
    for filename, category, label in CATEGORIES:
        path = root / "reference-source" / filename
        entries = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(entries, list):
            raise ReferenceError(f"{filename}: expected a JSON array")
        for position, entry in enumerate(entries):
            location = f"{filename}[{position}]"
            if not isinstance(entry, dict):
                raise ReferenceError(f"{location}: expected an object")
            identifier = entry.get("id")
            if not isinstance(identifier, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier):
                raise ReferenceError(f"{location}.id: expected a lowercase slug")
            if identifier in identifiers:
                raise ReferenceError(f"{location}.id: duplicate id {identifier!r}")
            identifiers.add(identifier)
            require_text(entry.get("name"), f"{location}.name")
            sources = entry.get("sources")
            if not isinstance(sources, list) or not sources:
                raise ReferenceError(f"{location}.sources: expected a non-empty array")
            for index, source in enumerate(sources):
                source_location = f"{location}.sources[{index}]"
                if not isinstance(source, dict):
                    raise ReferenceError(f"{source_location}: expected an object")
                validate_url(source.get("url"), f"{source_location}.url")
                if "imageUrl" in source:
                    validate_url(source["imageUrl"], f"{source_location}.imageUrl")
                if "visualObserved" in source and not isinstance(source["visualObserved"], bool):
                    raise ReferenceError(f"{source_location}.visualObserved: expected a boolean")
            for field in ARRAY_FIELDS:
                value = entry.get(field)
                if not isinstance(value, list) or any(not isinstance(text, str) for text in value):
                    raise ReferenceError(f"{location}.{field}: expected an array of strings")
            if "review" in entry and not isinstance(entry["review"], dict):
                raise ReferenceError(f"{location}.review: expected an object")
            review = entry.get("review", {})
            if "stage" in review and not isinstance(review["stage"], str):
                raise ReferenceError(f"{location}.review.stage: expected a string")
            for field in ("observed", "adopted", "remaining"):
                if field in review and (not isinstance(review[field], list)
                                        or any(not isinstance(text, str) for text in review[field])):
                    raise ReferenceError(f"{location}.review.{field}: expected an array of strings")
            items.append({
                **entry,
                "category": category,
                "categoryLabel": label,
                "currentImage": f"evidence/extension/current-{identifier}.png",
            })
    return items


def plain(value):
    """Render source text literally rather than treating it as Markdown."""
    if isinstance(value, str):
        text = value
    else:
        text = json.dumps(value, ensure_ascii=False, sort_keys=True)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"([\\`*_{}\[\]()#!|])", r"\\\1", text).replace("\n", "<br>")


def link(title, url):
    # Angle-bracket destinations permit parentheses in source URLs. Encode
    # angle brackets and whitespace so a URL cannot break the Markdown link.
    destination = quote(url, safe=":/?#[]@!$&'()*+,;=%-._~")
    return f"[{plain(title)}](<{destination}>)"


def bullet_values(value, fallback="기록 없음"):
    if value is None or value == [] or value == "":
        return [f"- {fallback}"]
    values = value if isinstance(value, list) else [value]
    return [f"- {plain(item)}" for item in values]


def render_javascript(items):
    payload = json.dumps(items, ensure_ascii=False, indent=2, allow_nan=False)
    # This one property name has prototype-setting semantics in a JavaScript
    # object literal. A computed key retains it as an ordinary own property.
    payload = re.sub(r'(?m)^(\s*)"__proto__":', r'\1["__proto__"]:', payload)
    # Also safe if this generated data is later placed in an inline script.
    payload = payload.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return (
        "// Generated by scripts/build_references.py. Edit reference-source/*.json.\n"
        f"window.GARDEN_REFERENCES = {payload};\n"
    ).encode("utf-8")


def render_markdown(foundation, items):
    """Keep every foundation byte, then append the extension reference board."""
    foundation.decode("utf-8-sig")
    lines = [
        "---", "", "# 꽃·브러시 확장 레퍼런스", "",
        "이 구역은 `reference-source/flowers.json`과 `reference-source/brushes.json`에서 생성한다. "
        "원문·외부 이미지는 링크로만 제공하며, 직접 관찰과 기관 설명, 구현 판단, 결과 검토를 구별한다.", "",
        "현재 결과 링크는 프로젝트에서 생성한 로컬 crop이다. 외부 원본 이미지를 저장소에 복사하지 않는다.", "",
    ]
    for item in items:
        lines.extend([
            f"## {plain(item['categoryLabel'])} · {plain(item['name'])} ({item['id']})", "",
        ])
        if item.get("latin"):
            lines.extend([f"- **학명:** {plain(item['latin'])}"])
        lines.extend([
            f"- **현재 결과:** {link('로컬 crop', '../' + item['currentImage'])}", "",
            "### 출처·권리", "",
        ])
        for index, source in enumerate(item["sources"], start=1):
            lines.extend([
                f"{index}. {link(source.get('title', source['url']), source['url'])}",
                f"   - **저작자:** {plain(source.get('creator', '미기록'))}",
                f"   - **권리·사용 범위:** {plain(source.get('rights', '미기록'))}",
                f"   - **접근일:** {plain(source.get('accessed', '미기록'))}",
                f"   - **이미지 직접 관찰:** {'예' if source.get('visualObserved') is True else '아니오' if source.get('visualObserved') is False else '미기록'}",
            ])
            if source.get("imageUrl"):
                lines.append(f"   - **관찰 이미지:** {link('외부 이미지 링크', source['imageUrl'])}")
            for key, value in source.items():
                if key not in ("title", "url", "creator", "rights", "accessed", "visualObserved", "imageUrl"):
                    lines.append(f"   - **{plain(key)}:** {plain(value)}")
        lines.append("")
        for field, label in SECTION_LABELS:
            lines.extend([f"### {label}", "", *bullet_values(item[field]), ""])
        review = item.get("review", {})
        lines.extend(["### 결과 검토", "", f"- **단계 (stage):** {plain(review.get('stage') or PENDING_REVIEW)}", ""])
        for field, label in (("observed", "결과에서 관찰한 것"), ("adopted", "채택된 특징"), ("remaining", "남은 차이")):
            lines.extend([f"#### {label} ({field})", "", *bullet_values(review.get(field), PENDING_REVIEW), ""])
        for key, value in review.items():
            if key not in ("stage", "observed", "adopted", "remaining"):
                lines.extend([f"- **{plain(key)}:** {plain(value)}", ""])
        extras = {key: value for key, value in item.items() if key not in (
            "id", "name", "latin", "sources", *ARRAY_FIELDS, "review", "category", "categoryLabel", "currentImage",
        )}
        if extras:
            lines.extend(["### 추가 기록", ""])
            for key, value in extras.items():
                lines.append(f"- **{plain(key)}:** {plain(value)}")
            lines.append("")
    separator = b"" if foundation.endswith(b"\n\n") else b"\n" if foundation.endswith(b"\n") else b"\n\n"
    return foundation + separator + ("\n".join(lines).rstrip() + "\n").encode("utf-8")


def build_outputs(root):
    items = load_references(root)
    foundation = (root / "reference-source" / "foundation.md").read_bytes()
    return {
        root / "reference-data.js": render_javascript(items),
        root / "docs" / "references.md": render_markdown(foundation, items),
    }


def run(root, check=False):
    """Return 0 when generated/current, 1 when stale, or 2 on invalid input."""
    root = Path(root)
    try:
        outputs = build_outputs(root)
    except (OSError, ValueError) as error:
        print(f"Reference build failed: {error}", file=sys.stderr)
        return 2
    if check:
        stale = [path for path, expected in outputs.items()
                 if not path.is_file() or path.read_bytes() != expected]
        if stale:
            for path in stale:
                print(f"STALE: {path.relative_to(root).as_posix()}")
            print("Run: python scripts/build_references.py")
            return 1
        print("Reference outputs are current (byte-for-byte).")
        return 0
    for path, contents in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
        print(f"Generated: {path.relative_to(root).as_posix()}")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="check generated bytes without writing any files")
    arguments = parser.parse_args(argv)
    return run(Path(__file__).resolve().parent.parent, check=arguments.check)


if __name__ == "__main__":
    sys.exit(main())
