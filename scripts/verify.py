"""Real Chromium captures. Requires Python playwright only for development QA."""
import sys, json, pathlib, datetime
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
version=sys.argv[1] if len(sys.argv)>1 else 'replay-v2'
url=(ROOT/'index.html').as_uri()+'?seed=271828&density=7&wind=35&frame=360'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.locator('#garden').wait_for()
    page.screenshot(path=str(ROOT/f'evidence/{version}-desktop.png'),full_page=True)
    page.locator('#garden').screenshot(path=str(ROOT/f'evidence/{version}-canvas.png'))
    baseline=page.locator('#count').inner_text()
    page.locator('#garden').click(position={'x':200,'y':400})
    after=page.locator('#count').inner_text()
    page.locator('#pause').click()
    paused=page.locator('#pause').get_attribute('aria-pressed')
    page.locator('#reset').click()
    cleared=page.locator('#count').inner_text()
    page.locator('#regenerate').click()
    with page.expect_download() as info: page.locator('#save').click()
    download=info.value
    download.save_as(str(ROOT/f'evidence/{version}-export.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.goto(url)
    page.screenshot(path=str(ROOT/f'evidence/{version}-mobile.png'),full_page=True)
    overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
    result={'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':version,'browser':browser.version,'protocol':'file://','viewport':[1440,1000],'seed':'271828','density':7,'wind':35,'frame':360,'baseline':baseline,'after_click':after,'paused':paused,'cleared':cleared,'mobile_overflow':overflow,'errors':errors,'export_bytes':(ROOT/f'evidence/{version}-export.png').stat().st_size}
    (ROOT/f'evidence/{version}-run.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    assert baseline.startswith('5 /') and after.startswith('6 /') and cleared.startswith('0 /')
    assert paused=='true' and not errors and not overflow
    browser.close()
