"""Public-DOM keyboard, target-size and idle-RAF checks for the ink/tint UI.

This is a focused automated audit, not a complete WCAG conformance assessment.
Usage: python scripts/ink_accessibility.py [evidence-label] [runtime-directory]
"""

import datetime
import json
import pathlib
import re
import sys
import traceback

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT
LABEL = re.sub(r"[^a-zA-Z0-9_-]", "_", sys.argv[1] if len(sys.argv) > 1 else "final")
OUT = ROOT / "evidence" / "ink"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = (RUNTIME / "index.html").as_uri()
checks = []
details = {}


def check(name, passed, detail=None):
    item = {"name": name, "pass": bool(passed)}
    if detail is not None:
        item["detail"] = detail
    checks.append(item)


def case(name, operation):
    try:
        operation()
    except Exception as exc:
        check(name, False, {"error": str(exc), "traceback": traceback.format_exc(limit=3)})


def image(page):
    return page.locator("#garden").evaluate("c=>c.toDataURL()")


OUT.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        details["browser"] = browser.version
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.set_default_timeout(10000)
        # Instrument browser scheduling outside production, so a still image alone
        # cannot falsely pass when the app keeps requesting animation frames.
        page.add_init_script("""window.__auditRAF=0;
          const auditNativeRAF=window.requestAnimationFrame;
          window.requestAnimationFrame=function(callback){window.__auditRAF++;
            return auditNativeRAF.call(window,callback)};""")

        def keyboard_and_labels():
            page.goto(BASE + "?mode=tint&frame=360")
            page.locator("#garden").screenshot()
            page.locator("#garden").focus()
            before = int(page.locator("#count").inner_text().split("/")[0])
            page.keyboard.press("ArrowRight")
            page.keyboard.press("Enter")
            after = int(page.locator("#count").inner_text().split("/")[0])
            check("Canvas arrow/Enter keyboard planting", after == before + 1)
            check("Canvas has keyboard instructions and accessible name", page.locator("#garden").evaluate("c=>!!c.getAttribute('aria-label') && !!document.getElementById(c.getAttribute('aria-describedby'))"))
            check("planting feedback is a polite status region", page.locator("#status").get_attribute("role") == "status" and page.locator("#status").get_attribute("aria-live") == "polite")
            labels = page.locator("#painting-mode,#flower-color,#restore-color").evaluate_all("""es=>es.map(e=>({id:e.id,tag:e.tagName,disabled:e.disabled,
              label:(e.getAttribute('aria-label')||Array.from(e.labels||[]).map(l=>l.textContent).join(' ')||e.textContent).trim()}))""")
            details["new_control_names"] = labels
            check("all new controls have nonempty accessible labels", len(labels) == 3 and all(item["label"] for item in labels), labels)
            modes = page.locator("#painting-mode option").evaluate_all("es=>es.map(e=>e.value)")
            page.locator("#painting-mode").focus()
            page.keyboard.press("Home" if modes.index("ink") == 0 else "End")
            page.keyboard.press("Enter")
            check("mode select supports keyboard selection", page.locator("#painting-mode").input_value() == "ink")
            page.keyboard.press("Home" if modes.index("tint") == 0 else "End")
            page.keyboard.press("Enter")
            check("mode select returns to tint with keyboard", page.locator("#painting-mode").input_value() == "tint")
            page.locator("#flower-color").fill("#356b9a")
            page.locator("#restore-color").focus()
            page.keyboard.press("Enter")
            check("default restore works with keyboard", page.locator("#flower-color").input_value().lower() == "#9b6773")
        case("keyboard and accessible labels", keyboard_and_labels)

        def idle_raf():
            page.goto(BASE + "?mode=ink")
            page.locator("#garden").screenshot()
            page.wait_for_timeout(180)
            active = page.evaluate("window.__auditRAF")
            page.wait_for_timeout(180)
            check("live garden schedules animation", page.evaluate("window.__auditRAF") > active)
            page.locator("#pause").click()
            page.wait_for_timeout(100)
            first = page.evaluate("window.__auditRAF")
            paused_image = image(page)
            page.wait_for_timeout(180)
            delta = page.evaluate("window.__auditRAF") - first
            check("pause stops requesting RAF and freezes pixels", delta == 0 and paused_image == image(page), {"raf_requests": delta})
            page.emulate_media(reduced_motion="reduce")
            page.goto(BASE + "?mode=tint")
            page.locator("#garden").screenshot()
            page.wait_for_timeout(100)
            first = page.evaluate("window.__auditRAF")
            reduced_image = image(page)
            page.wait_for_timeout(180)
            delta = page.evaluate("window.__auditRAF") - first
            check("system reduced motion stops RAF and freezes pixels", page.locator("#reduced").is_checked() and delta == 0 and reduced_image == image(page), {"raf_requests": delta})
            page.emulate_media(reduced_motion="no-preference")
            page.goto(BASE + "?mode=tint")
            page.locator("#garden").screenshot()
            page.locator("#reduced").check()
            page.wait_for_timeout(100)
            first = page.evaluate("window.__auditRAF")
            manual_image = image(page)
            page.wait_for_timeout(180)
            delta = page.evaluate("window.__auditRAF") - first
            check("manual reduced motion stops RAF and freezes pixels", delta == 0 and manual_image == image(page), {"raf_requests": delta})
            page.goto(BASE + "?mode=ink&frame=360")
            page.locator("#garden").screenshot()
            first = page.evaluate("window.__auditRAF")
            page.wait_for_timeout(180)
            check("fixed frame schedules no RAF", page.evaluate("window.__auditRAF") == first)
        case("idle animation scheduling", idle_raf)

        def mobile_targets():
            page.set_viewport_size({"width": 390, "height": 844})
            page.goto(BASE + "?mode=tint&frame=360")
            check("mobile material drawer initially collapsed", not page.locator(".material-drawer").evaluate("e=>e.open"))
            page.locator(".material-drawer").evaluate("e=>e.open=true")
            targets = page.locator("button,select,input[type='range'],input[type='color'],input[type='text'],summary,.motion-field").evaluate_all("""es=>es.filter(e=>e.getClientRects().length).map(e=>{
              const b=e.getBoundingClientRect();return {id:e.id||e.className||e.tagName,width:b.width,height:b.height}})""")
            details["mobile_targets"] = targets
            check("mobile controls and drawer targets at least 44px tall", bool(targets) and all(t["height"] >= 44 for t in targets), [t for t in targets if t["height"] < 44])
            check("new mobile controls at least 44px wide", all(t["width"] >= 44 for t in targets if t["id"] in ("painting-mode", "flower-color", "restore-color")))
            check("390px material controls have no horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            page.set_viewport_size({"width": 320, "height": 740})
            check("320px material controls have no horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        case("mobile target sizes", mobile_targets)
        browser.close()
except Exception as exc:
    check("accessibility runner completed", False, {"error": str(exc), "traceback": traceback.format_exc(limit=5)})

result = {
    "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "label": LABEL, "runtime": str(RUNTIME), "checks": checks, "details": details,
    "scope": "Focused automated keyboard, naming, touch target, overflow and RAF checks; not a complete WCAG assessment.",
    "passed": sum(item["pass"] for item in checks), "total": len(checks),
}
target = OUT / (LABEL + "-accessibility.json")
target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"evidence": str(target.relative_to(ROOT)), "passed": result["passed"],
                  "total": result["total"], "failed": [item for item in checks if not item["pass"]]},
                 ensure_ascii=True, indent=2))
sys.exit(0 if checks and all(item["pass"] for item in checks) else 1)
