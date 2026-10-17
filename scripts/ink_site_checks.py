"""Real-Chrome final-site checks without modifying product pages or assets.

Usage: python scripts/ink_site_checks.py [evidence-label] [runtime-directory]
Run after the release's generated images and functional evidence are available.
"""

import datetime
import json
import pathlib
import re
import sys
import traceback
from urllib.parse import unquote, urlsplit
from urllib.request import url2pathname

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT
LABEL = re.sub(r"[^a-zA-Z0-9_-]", "_", sys.argv[1] if len(sys.argv) > 1 else "final-site")
OUT = ROOT / "evidence" / "ink"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PAGES = ("index.html", "process.html", "study.html", "petal-study.html", "reference.html")
VIEWPORTS = (("desktop", 1440, 1000), ("mobile", 390, 844))
CATEGORIES = {"ink": 3, "all": 14, "flower": 3, "brush": 5, "petal": 3}
checks = []
pages = []
screenshots = []
started = datetime.datetime.now(datetime.timezone.utc)


def report_safe(value):
    """Keep published JSON and console diagnostics free of local absolute paths."""
    if isinstance(value, dict):
        return {report_safe(key): report_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [report_safe(item) for item in value]
    if isinstance(value, pathlib.Path):
        value = str(value)
    if not isinstance(value, str):
        return value
    for base in sorted({ROOT, RUNTIME}, key=lambda path: len(str(path)), reverse=True):
        for prefix in (base.as_uri(), str(base), base.as_posix()):
            value = re.sub(re.escape(prefix) + r"(?=$|[/\\?#])", ".", value, flags=re.IGNORECASE)
    if value.startswith(".\\"):
        value = value.replace("\\", "/")
    value = re.sub(r"(?i)\bfile://[^\s\"'<>]*", "[local-file]", value)
    value = re.sub(r"(?i)\b[a-z]:[/\\][^\r\n\t\"'<>|]*", "[local-path]", value)
    value = re.sub(r"(?<!\\)\\\\[^\\\s]+\\[^\r\n\t\"'<>|]*", "[local-path]", value)
    value = re.sub(r"(?<![\w:/.])/(?!/)[^\s/\\\"'<>|]+/[^\r\n\t\"'<>|]*", "[local-path]", value)
    return value


def check(name, passed, detail=None):
    item = {"name": name, "pass": bool(passed)}
    if detail is not None:
        item["detail"] = detail
    checks.append(item)


def unique_path(stem, extension):
    target = OUT / (stem + extension)
    if target.exists():
        suffix = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        target = OUT / (stem + "-" + suffix + extension)
    return target


def image_state(page):
    page.locator("img").evaluate_all("es=>es.forEach(e=>e.loading='eager')")
    timed_out = False
    try:
        page.wait_for_function("Array.from(document.images).every(e=>e.complete && e.naturalWidth>0)", timeout=12000)
    except Exception:
        timed_out = True
    states = page.locator("img").evaluate_all("""es=>es.map(e=>({src:e.getAttribute('src'),
      complete:e.complete,width:e.naturalWidth,height:e.naturalHeight,hidden:e.hidden}))""")
    return states, timed_out


def local_links(page):
    """Resolve against the actual document URL, including nested paths/queries."""
    links = page.locator("[href],[src]").evaluate_all("""es=>es.flatMap(e=>['href','src'].filter(a=>e.hasAttribute(a)).map(a=>({
      tag:e.tagName,attribute:a,raw:e.getAttribute(a),url:new URL(e.getAttribute(a),document.baseURI).href})))""")
    missing = []
    local = []
    current = urlsplit(page.url)
    ids = set(page.locator("[id]").evaluate_all("es=>es.map(e=>e.id)"))
    for item in links:
        parsed = urlsplit(item["url"])
        if parsed.scheme != "file":
            continue
        target = pathlib.Path(url2pathname(parsed.path))
        local.append(item["raw"])
        if not target.exists():
            missing.append(item | {"reason": "local path missing", "resolved_path": str(target)})
        elif parsed.path == current.path and parsed.fragment and unquote(parsed.fragment) not in ids:
            missing.append(item | {"reason": "same-page fragment target missing"})
    return local, missing


def control_targets(page):
    # A checkbox/radio is operated through its associated label. Ordinary inline
    # text links are outside this focused control-target check.
    return page.locator("button,select,input,summary").evaluate_all("""es=>es.filter(e=>e.type!=='hidden' && e.getClientRects().length).map(e=>{
      let target=e;
      if(e.matches('input[type=checkbox],input[type=radio]')){
        const label=e.closest('label') || (e.id && document.querySelector('label[for="'+CSS.escape(e.id)+'"]'));
        if(label && label.getClientRects().length)target=label;
      }
      const b=target.getBoundingClientRect();return {id:e.id||e.className||e.tagName,tag:e.tagName,
        targetTag:target.tagName,width:b.width,height:b.height};})""")


def reference_checks(page, prefix):
    cards = page.locator("#reference-list > article")
    check(prefix + " 14 reference cards render", cards.count() == 14, {"actual": cards.count()})
    check(prefix + " default ink filter shows three cards", page.locator("[data-filter=ink]").get_attribute("aria-pressed") == "true" and page.locator("#reference-list > article:visible").count() == 3)
    for category, expected in CATEGORIES.items():
        page.locator('[data-filter="' + category + '"]').click()
        shown = page.locator("#reference-list > article:visible")
        check(prefix + f" {category} filter count", shown.count() == expected, {"expected": expected, "actual": shown.count()})
        check(prefix + f" {category} count badge", page.locator('[data-count="' + category + '"]').inner_text().strip() == str(expected))
        pressed = page.locator('[data-filter][aria-pressed="true"]')
        check(prefix + f" {category} filter pressed state", pressed.count() == 1 and pressed.first.get_attribute("data-filter") == category)
        visible_details = page.locator("#reference-list > article:visible details")
        total_details = visible_details.count()
        # Prior interactions can leave individual cards open. Normalize through
        # the public toggle, then verify both directions for every filter.
        if page.locator("#expand-all").get_attribute("aria-expanded") == "true":
            page.locator("#expand-all").click()
        page.locator("#expand-all").click()
        open_count = page.locator("#reference-list > article:visible details[open]").count()
        check(prefix + f" {category} expands all visible details", total_details > 0 and open_count == total_details and page.locator("#expand-all").get_attribute("aria-expanded") == "true", {"details": total_details, "open": open_count})
        page.locator("#expand-all").click()
        check(prefix + f" {category} collapses all visible details", page.locator("#reference-list > article:visible details[open]").count() == 0 and page.locator("#expand-all").get_attribute("aria-expanded") == "false")

    facts = cards.locator(".source-facts").evaluate_all("""es=>es.map(e=>{
      const terms=Array.from(e.querySelectorAll('dt'));const rights=terms.find(t=>t.textContent.trim()==='권리');
      const observed=terms.find(t=>t.textContent.trim()==='관찰');
      const value=observed && observed.nextElementSibling;
      return {rightsLabel:!!rights,rightsValue:rights && rights.nextElementSibling && rights.nextElementSibling.textContent.trim(),
        observedLabel:!!observed,observedValue:value && value.textContent.trim(),
        observedClass:value && value.className};})""")
    check(prefix + " every source has rights and observation labels", bool(facts) and all(f["rightsLabel"] and f["rightsValue"] and f["observedLabel"] and f["observedValue"] and f["observedClass"] in ("observed-yes", "observed-no") for f in facts), {"sources": len(facts), "invalid": [f for f in facts if not (f["rightsLabel"] and f["rightsValue"] and f["observedLabel"] and f["observedValue"] and f["observedClass"] in ("observed-yes", "observed-no"))]})
    own_images = cards.locator("img").evaluate_all("es=>es.map(e=>e.getAttribute('src'))")
    check(prefix + " each card has one local current-result image", len(own_images) == 14 and all(src and src.startswith("evidence/") for src in own_images), {"images": own_images})
    page.locator('[data-filter="all"]').click()
    targets = control_targets(page)
    undersized = [t for t in targets if t["width"] + .01 < 44 or t["height"] + .01 < 44]
    check(prefix + " all reference controls and summaries have 44px targets", not undersized, undersized)
    check(prefix + " all-filter view has no horizontal overflow", page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
    page.locator('[data-filter="ink"]').click()
    return {"source_count": len(facts), "observed_yes": sum(f["observedClass"] == "observed-yes" for f in facts), "observed_no": sum(f["observedClass"] == "observed-no" for f in facts), "control_targets": targets}


OUT.mkdir(parents=True, exist_ok=True)
browser_version = None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        browser_version = browser.version
        for viewport_name, width, height in VIEWPORTS:
            for filename in PAGES:
                prefix = filename + "/" + viewport_name
                record = {"page": filename, "viewport": [width, height], "errors": [], "requests": [], "request_failures": []}
                page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
                page.set_default_timeout(10000)
                page.on("pageerror", lambda err, r=record: r["errors"].append(str(err)))
                page.on("request", lambda request, r=record: r["requests"].append(request.url))
                page.on("requestfailed", lambda request, r=record: r["request_failures"].append({"url": request.url, "reason": request.failure}))
                try:
                    page.goto((RUNTIME / filename).as_uri() + ("?seed=271828&frame=360&mode=tint" if filename == "index.html" else ""), wait_until="load")
                    if filename == "reference.html":
                        page.wait_for_function("document.querySelectorAll('#reference-list > article').length>0")
                    if page.locator("canvas").count():
                        page.locator("canvas").first.screenshot()
                    states, timed_out = image_state(page)
                    record["images"] = states
                    check(prefix + " all own images load", not timed_out and all(i["complete"] and i["width"] > 0 and i["height"] > 0 for i in states), {"count": len(states), "failed": [i for i in states if not i["complete"] or i["width"] <= 0 or i["height"] <= 0]})
                    local, missing = local_links(page)
                    record["local_link_count"] = len(local)
                    check(prefix + " local href/src targets resolve", not missing, missing)
                    check(prefix + " no horizontal overflow", page.evaluate("document.documentElement.scrollWidth<=innerWidth"), page.evaluate("({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth})"))
                    targets = control_targets(page)
                    record["control_targets"] = targets
                    undersized = [t for t in targets if t["width"] + .01 < 44 or t["height"] + .01 < 44]
                    check(prefix + " visible control targets are at least 44px", not undersized, undersized)
                    if filename == "reference.html":
                        record["reference"] = reference_checks(page, prefix)
                    if filename == "index.html":
                        target = OUT / ("delivery-" + viewport_name + ".png")
                        if target.exists():
                            unique_path(LABEL + "-delivery-" + viewport_name + "-before", ".png").write_bytes(target.read_bytes())
                        page.screenshot(path=str(target), full_page=True)
                        screenshots.append(str(target.relative_to(ROOT)))
                    if filename in ("process.html", "reference.html"):
                        target = unique_path(LABEL + "-" + filename[:-5] + "-" + viewport_name + "-final", ".png")
                        page.screenshot(path=str(target), full_page=True)
                        screenshots.append(str(target.relative_to(ROOT)))
                except Exception as exc:
                    check(prefix + " browser checks completed", False, {"error": str(exc), "traceback": traceback.format_exc(limit=4)})
                external = [request for request in record["requests"] if urlsplit(request).scheme in ("http", "https")]
                check(prefix + " no JavaScript page errors", not record["errors"], record["errors"])
                check(prefix + " no external requests", not external, external)
                check(prefix + " no failed local requests", not record["request_failures"], record["request_failures"])
                pages.append(record)
                page.close()
        browser.close()
except Exception as exc:
    check("site test runner completed", False, {"error": str(exc), "traceback": traceback.format_exc(limit=5)})

result = {
    "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "started_at": started.isoformat(),
    "label": LABEL, "runtime": "./", "browser": browser_version, "checks": checks, "pages": pages,
    "screenshots": screenshots, "passed": sum(item["pass"] for item in checks), "total": len(checks),
    "target_scope": "Visible controls and disclosure summaries; checkbox/radio associated label; ordinary inline text links excluded.",
}
result = report_safe(result)
versioned = unique_path(LABEL + "-site-checks", ".json")
serialized = json.dumps(result, ensure_ascii=False, indent=2)
versioned.write_text(serialized, encoding="utf-8")
stable = OUT / "site-checks.json"
if stable.exists():
    previous = report_safe(json.loads(stable.read_text(encoding="utf-8")))
    unique_path("site-checks-before-" + started.strftime("%Y%m%dT%H%M%S%fZ"), ".json").write_text(
        json.dumps(previous, ensure_ascii=False, indent=2), encoding="utf-8")
stable.write_text(serialized, encoding="utf-8")
print(json.dumps(report_safe({"evidence": str(stable.relative_to(ROOT)), "versioned_evidence": str(versioned.relative_to(ROOT)),
                  "passed": result["passed"], "total": result["total"], "screenshots": screenshots,
                  "failed": [item for item in checks if not item["pass"]]}), ensure_ascii=True, indent=2))
sys.exit(0 if checks and all(item["pass"] for item in checks) else 1)
