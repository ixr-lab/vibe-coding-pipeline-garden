"""Real-Chrome ink/tint regression checks, using only the public app UI.

Usage: python scripts/ink_checks.py [evidence-label] [runtime-directory]
The optional runtime directory permits checking an unpacked release unchanged.
Every result, including failed cases, is recorded under evidence/ink/.
"""

import base64
import datetime
import hashlib
import io
import json
import pathlib
import re
import sys
import traceback
import urllib.parse

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNTIME = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT
LABEL = re.sub(r"[^a-zA-Z0-9_-]", "_", sys.argv[1] if len(sys.argv) > 1 else "final")
OUT = ROOT / "evidence" / "ink"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DEFAULTS = {"cosmos": "#9b6773", "daisy": "#9e8c64", "poppy": "#a05e50"}
FLOWERS = tuple(DEFAULTS)
BRUSHES = ("pen", "ink", "pencil", "dry", "watercolor")
BASE = (RUNTIME / "index.html").as_uri()
FIXED = dict(seed="271828", density=7, wind=35, frame=360, flower="cosmos",
             brush="ink", width=1, texture=60, opacity=85, petals=65, mode="tint")
checks = []
errors = []
requests = []
signatures = {}
metadata = {}


def check(name, passed, detail=None):
    item = {"name": name, "pass": bool(passed)}
    if detail is not None:
        item["detail"] = detail
    checks.append(item)


def case(name, operation):
    """Keep independent checks running after a failure; never conceal it."""
    try:
        operation()
    except Exception as exc:
        check(name, False, {"error": str(exc), "traceback": traceback.format_exc(limit=3)})


def url(**patch):
    return BASE + "?" + urllib.parse.urlencode(FIXED | patch)


def pixels(page):
    return page.locator("#garden").evaluate("c=>c.toDataURL('image/png')")


def ready(page, target):
    page.goto(target, wait_until="load")
    page.wait_for_function("document.querySelector('#garden')?.width > 1")
    # A real screenshot waits for layout/ResizeObserver before reading Canvas.
    page.locator("#garden").screenshot()


def color(page, value):
    page.locator("#flower-color").fill(value)


def count(page):
    return int(re.match(r"\s*(\d+)", page.locator("#count").inner_text()).group(1))


def attach(page):
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("request", lambda request: requests.append(request.url))


OUT.mkdir(parents=True, exist_ok=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, headless=True)
        metadata["browser"] = browser.version
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        page.set_default_timeout(10000)
        attach(page)

        def contract():
            ready(page, url())
            check("three species remain available", sorted(page.locator("#flower option").evaluate_all("es=>es.map(e=>e.value)")) == sorted(FLOWERS))
            check("five brush materials remain available", sorted(page.locator("#brush option").evaluate_all("es=>es.map(e=>e.value)")) == sorted(BRUSHES))
            check("painting mode is native ink/tint select", sorted(page.locator("select#painting-mode option").evaluate_all("es=>es.map(e=>e.value)")) == ["ink", "tint"])
            check("color picker uses native color input", page.locator("input#flower-color").get_attribute("type") == "color")
            check("restore color is a button", page.locator("button#restore-color").count() == 1)
            check("initial garden has five plants", count(page) == 5)
            check("query selects explicit tint mode", page.locator("#painting-mode").input_value() == "tint")
        case("public UI contract", contract)

        def determinism():
            ready(page, url(color="356b9a"))
            first = pixels(page)
            signatures["fixed_tint_blue"] = hashlib.sha256(first.encode()).hexdigest()
            ready(page, url(color="356b9a"))
            check("same seed, mode, color, settings and time reproduce exact Canvas", first == pixels(page))
            ready(page, url(seed="271829", color="356b9a"))
            check("different seed changes scene", first != pixels(page))
            ready(page, url(color="356b9a"))
            page.locator("#density").fill("12")
            check("density changes scene", first != pixels(page))
            page.locator("#density").fill("7")
            check("density round trip restores exact Canvas", first == pixels(page))
            ready(page, url(wind=0, color="356b9a"))
            still = pixels(page)
            ready(page, url(wind=100, color="356b9a"))
            check("wind changes fixed-time plant pose", still != pixels(page))
        case("seed, density and wind regression", determinism)

        def palettes():
            material_signatures = {"tint": {}, "ink": {}}
            for flower in FLOWERS:
                for brush in BRUSHES:
                    ready(page, url(flower=flower, brush=brush, color="356b9a"))
                    blue = pixels(page)
                    color(page, "#ad647c")
                    rose = pixels(page)
                    check(f"{flower}/{brush}: tint color affects actual garden", blue != rose)
                    page.select_option("#painting-mode", "ink")
                    ink_rose = pixels(page)
                    material_signatures["tint"][flower + "/" + brush] = hashlib.sha256(blue.encode()).hexdigest()
                    material_signatures["ink"][flower + "/" + brush] = hashlib.sha256(ink_rose.encode()).hexdigest()
                    color(page, "#356b9a")
                    check(f"{flower}/{brush}: ink pixels ignore selected tint color", ink_rose == pixels(page))
                    page.select_option("#painting-mode", "tint")
                    check(f"{flower}/{brush}: tint restores chosen blue without geometry drift", blue == pixels(page))
                    color(page, "#ad647c")
                    page.select_option("#painting-mode", "ink")
                    page.select_option("#painting-mode", "tint")
                    check(f"{flower}/{brush}: mode toggles preserve chosen rose", page.locator("#flower-color").input_value().lower() == "#ad647c" and rose == pixels(page))
            for mode, values in material_signatures.items():
                for flower in FLOWERS:
                    check(f"{mode}/{flower}: all five brush materials produce distinct gardens", len({values[flower + "/" + brush] for brush in BRUSHES}) == 5)
                for brush in BRUSHES:
                    check(f"{mode}/{brush}: all three species produce distinct gardens", len({values[flower + "/" + brush] for flower in FLOWERS}) == 3)
            signatures["species_and_materials"] = material_signatures
            for flower, default in DEFAULTS.items():
                ready(page, url(flower=flower))
                check(f"{flower}: muted default picker color", page.locator("#flower-color").input_value().lower() == default)
                default_pixels = pixels(page)
                color(page, "#356b9a")
                page.locator("#restore-color").click()
                check(f"{flower}: restore returns selected species default and Canvas", page.locator("#flower-color").input_value().lower() == default and pixels(page) == default_pixels)
            ready(page, url(color="A35179", mode="ink"))
            check("query accepts hex color without hash", page.locator("#flower-color").input_value().lower() == "#a35179")
            check("query accepts explicit ink mode", page.locator("#painting-mode").input_value() == "ink")
        case("all species/material ink and tint round trips", palettes)

        def material_controls():
            ready(page, url(color="356b9a"))
            original = pixels(page)
            for control, value in (("stroke-width", "2.5"), ("texture", "10"), ("opacity", "35"), ("petal-strength", "15")):
                old = page.locator("#" + control).input_value()
                page.locator("#" + control).fill(value)
                check(control + " still affects actual garden", pixels(page) != original)
                page.locator("#" + control).fill(old)
                check(control + " round trip restores exact Canvas", pixels(page) == original)
            page.wait_for_timeout(160)
            check("fixed-time grain remains static", pixels(page) == original)
        case("existing material controls", material_controls)

        def motion():
            ready(page, BASE + "?mode=ink")
            start = pixels(page)
            page.wait_for_timeout(350)
            check("normal mode actually grows", start != pixels(page))
            page.locator("#pause").click()
            paused = pixels(page)
            page.wait_for_timeout(180)
            check("pause freezes Canvas", paused == pixels(page))
            page.set_viewport_size({"width": 1200, "height": 900})
            page.locator("#garden").screenshot()
            resized = pixels(page)
            page.wait_for_timeout(150)
            check("resize preserves pause and static image", page.locator("#pause").get_attribute("aria-pressed") == "true" and resized == pixels(page))
            page.locator("#pause").click()
            page.wait_for_timeout(180)
            check("resume changes Canvas", resized != pixels(page))
            page.emulate_media(reduced_motion="reduce")
            ready(page, BASE + "?mode=tint")
            reduced = pixels(page)
            page.wait_for_timeout(180)
            check("system reduced motion selects static Canvas", page.locator("#reduced").is_checked() and reduced == pixels(page))
            page.emulate_media(reduced_motion="no-preference")
            page.wait_for_function("!document.getElementById('reduced').checked")
            check("system reduced-motion change updates control", not page.locator("#reduced").is_checked())
            page.locator("#reduced").check()
            manual = pixels(page)
            page.wait_for_timeout(180)
            check("manual reduced motion freezes Canvas", manual == pixels(page))
            page.set_viewport_size({"width": 1440, "height": 1000})
        case("growth, pause and reduced motion", motion)

        def planting_and_seed():
            ready(page, url(mode="ink"))
            page.locator("#reset").click()
            check("reset empties garden", count(page) == 0)
            for _ in range(32):
                page.locator("#plant-center").click()
            full_status = page.locator("#status").inner_text()
            for _ in range(3):
                page.locator("#plant-center").click()
            check("plant count capped at 32", count(page) == 32)
            cap_status = page.locator("#status").inner_text().strip()
            check("cap announces a distinct status", bool(cap_status) and cap_status != full_status, cap_status)
            page.locator("#seed").fill("   ")
            page.locator("#seed").press("Enter")
            check("blank seed normalizes to default", page.locator("#seed").input_value() == "271828")
            page.locator("#seed").evaluate("e=>e.value='a'.repeat(150)")
            page.locator("#seed").press("Enter")
            check("long seed limited to 80 characters", len(page.locator("#seed").input_value()) == 80)
            before = count(page)
            page.locator("#seed").press("Space")
            check("Space in seed input does not plant", before == count(page))
            page.locator("#garden").focus()
            page.keyboard.press("ArrowLeft")
            page.keyboard.press("Space")
            check("keyboard Space plants one seed", count(page) == before + 1)
            page.keyboard.press("Enter")
            check("keyboard Enter plants one seed", count(page) == before + 2)
        case("planting and seed validation", planting_and_seed)

        def export():
            ready(page, url(color="356b9a"))
            source = pixels(page)
            with page.expect_download() as info:
                page.locator("#save").click()
            path = OUT / (LABEL + "-export.png")
            info.value.save_as(str(path))
            expected = Image.open(io.BytesIO(base64.b64decode(source.split(",", 1)[1]))).convert("RGBA")
            actual = Image.open(path).convert("RGBA")
            check("download is PNG matching current Canvas pixels", actual.size == expected.size and actual.tobytes() == expected.tobytes())
            metadata["export"] = {"path": str(path.relative_to(ROOT)), "size": list(actual.size), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        case("actual PNG download", export)

        def mobile_checks():
            mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
            attach(mobile)
            ready(mobile, url(color="356b9a"))
            mobile.locator("#garden").tap(position={"x": 150, "y": 240})
            check("mobile touch plants one seed", count(mobile) == 6)
            geometry = mobile.locator("#garden").evaluate("c=>({width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height})")
            check("DPR3 backing buffer capped at DPR2 in both dimensions", geometry["width"] == round(geometry["cssWidth"] * 2) and geometry["height"] == round(geometry["cssHeight"] * 2), geometry)
            check("390px closed drawer has no horizontal overflow", mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            mobile.locator(".material-drawer").evaluate("e=>e.open=true")
            check("390px open drawer has no horizontal overflow", mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            mobile.screenshot(path=str(OUT / (LABEL + "-mobile.png")), full_page=True)
            mobile.close()
        case("touch, mobile overflow and DPR cap", mobile_checks)

        ready(page, url(color="356b9a"))
        page.screenshot(path=str(OUT / (LABEL + "-desktop.png")), full_page=True)
        page.locator("#garden").screenshot(path=str(OUT / (LABEL + "-garden.png")))
        check("no JavaScript page errors", not errors, errors)
        external = [request for request in requests if urllib.parse.urlparse(request).scheme in ("http", "https")]
        check("app and new mode/color controls make no external requests", not external, external)
        browser.close()
except Exception as exc:
    check("browser test runner completed", False, {"error": str(exc), "traceback": traceback.format_exc(limit=5)})

result = {
    "recorded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "label": LABEL, "runtime": str(RUNTIME), "os": "Windows", "viewport": [1440, 1000],
    "fixed_settings": FIXED, "checks": checks, "errors": errors, "signatures": signatures,
    "passed": sum(check["pass"] for check in checks), "total": len(checks), **metadata,
}
target = OUT / (LABEL + "-checks.json")
target.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"evidence": str(target.relative_to(ROOT)), "passed": result["passed"],
                  "total": result["total"], "failed": [item for item in checks if not item["pass"]]},
                 ensure_ascii=True, indent=2))
sys.exit(0 if checks and all(check["pass"] for check in checks) else 1)
