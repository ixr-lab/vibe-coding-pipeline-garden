"""Reproducible integration checks using real Chromium, no production test API."""
import pathlib,json,datetime,hashlib,statistics,io,sys
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=(ROOT/'index.html').as_uri()
FIXED=BASE+'?seed=271828&density=7&wind=35&frame=360'
checks=[]
def check(name,value):
    checks.append({'name':name,'pass':bool(value)})
    if not value:
        (ROOT/'evidence/petals/final-checks-last-failure.json').write_text(json.dumps({'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks},ensure_ascii=False,indent=2),encoding='utf-8')
        raise AssertionError(name)
def image(page):return page.locator('#garden').evaluate('(c)=>c.toDataURL()')
def ready(page,url):
    page.goto(url);page.locator('#garden').screenshot()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url.split(':')[0]))
    ready(page,FIXED);a=image(page)
    ready(page,FIXED);check('same seed/settings/time reproduce exact Canvas pixels',a==image(page))
    ready(page,FIXED.replace('271828','271829'));check('different seed changes image',a!=image(page))
    ready(page,FIXED)
    page.locator('#density').fill('12');check('density changes image',a!=image(page))
    page.locator('#density').fill('7');check('density round trip restores image',a==image(page))
    ready(page,FIXED.replace('wind=35','wind=0'));w0=image(page)
    ready(page,FIXED.replace('wind=35','wind=100'));check('wind changes fixed-time pose',w0!=image(page))
    ready(page,BASE)
    start=image(page);page.wait_for_timeout(300);check('normal mode actually grows',start!=image(page))
    page.locator('#pause').click();paused=image(page);page.wait_for_timeout(200);check('pause freezes Canvas pixels',paused==image(page))
    page.set_viewport_size({'width':1200,'height':900});page.locator('#garden').screenshot();resized=image(page);page.wait_for_timeout(120)
    check('resize preserves pause and remains still',page.locator('#pause').get_attribute('aria-pressed')=='true' and resized==image(page))
    page.locator('#pause').click();page.wait_for_timeout(150);check('resume changes Canvas pixels',resized!=image(page))
    page.emulate_media(reduced_motion='reduce');ready(page,BASE)
    reduced=image(page);page.wait_for_timeout(150);check('system reduced motion checked and static',page.locator('#reduced').is_checked() and reduced==image(page))
    page.emulate_media(reduced_motion='no-preference');page.wait_for_function('!document.getElementById("reduced").checked');check('system motion change updates checkbox',not page.locator('#reduced').is_checked())
    page.locator('#reduced').check();check('manual reduced motion selects static mode',page.locator('#mode').inner_text()=='고요한 정원')
    page.locator('#reset').click()
    for _ in range(35):page.locator('#plant-center').click()
    check('plant count capped at 32',page.locator('#count').inner_text().startswith('32 /'))
    check('cap explains recovery', '가득' in page.locator('#status').inner_text())
    page.locator('#seed').fill('   ');page.locator('#seed').press('Enter');check('blank seed normalizes to default',page.locator('#seed').input_value()=='271828')
    page.locator('#seed').evaluate('(e)=>e.value="가".repeat(150)');page.locator('#seed').press('Enter');check('long seed limited to 80 characters',len(page.locator('#seed').input_value())==80)
    before=page.locator('#count').inner_text();page.locator('#seed').press('Space');check('typing Space in input does not plant',before==page.locator('#count').inner_text())
    page.locator('#garden').focus();page.keyboard.press('ArrowLeft');page.keyboard.press('Space');check('keyboard Space plants one seed',page.locator('#count').inner_text().startswith('6 /'))
    ready(page,FIXED);export_source=image(page)
    with page.expect_download() as info:page.locator('#save').click()
    path=ROOT/'evidence/petals/final-export.png';info.value.save_as(str(path))
    import base64
    expected=Image.open(io.BytesIO(base64.b64decode(export_source.split(',')[1]))).convert('RGBA')
    actual=Image.open(path).convert('RGBA')
    check('export is valid PNG matching current Canvas',actual.size==expected.size and actual.tobytes()==expected.tobytes())
    ready(page,BASE+'?density=12');page.locator('#reduced').check();page.locator('#reset').click()
    for _ in range(32):page.locator('#plant-center').click()
    page.locator('#reduced').uncheck()
    timing=page.evaluate('''async()=>{const values=[];let last;return await new Promise(resolve=>{function sample(t){if(last!==undefined)values.push(t-last);last=t;if(values.length===120)resolve(values);else requestAnimationFrame(sample)}requestAnimationFrame(sample)})}''')
    perf={'scene':'32 mature plants, density=12, viewport=1200x900, DPR=1','samples':len(timing),'raf_interval_mean_ms':round(statistics.mean(timing),3),'raf_interval_p95_ms':round(sorted(timing)[113],3),'note':'RAF callback interval, not isolated draw time; one machine/headless result.'}
    mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    ready(mobile,BASE);mobile.locator('#garden').tap(position={'x':150,'y':300})
    check('mobile touch plants one seed',mobile.locator('#count').inner_text().startswith('6 /'))
    check('mobile DPR backing buffer capped at 2',mobile.locator('#garden').evaluate('(c)=>c.width<=Math.ceil(c.getBoundingClientRect().width*2)'))
    check('390px no horizontal overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.set_viewport_size({'width':1440,'height':1000});page.goto((ROOT/'process.html').as_uri());page.screenshot(path=str(ROOT/'evidence/petals/process-desktop.png'),full_page=True)
    check('process page loads and contains 8 stages',page.locator('.steps > li').count()==8)
    mobile.goto((ROOT/'process.html').as_uri());mobile.screenshot(path=str(ROOT/'evidence/petals/process-mobile.png'),full_page=True)
    check('process mobile no horizontal overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check('no JavaScript page errors',not errors)
    check('app makes no external requests',not any(s in ('http','https') for s in requests))
    result={'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':browser.version,'os':'Windows','checks':checks,'passed':len(checks),'errors':errors,'performance':perf,'fixed_canvas_sha256':hashlib.sha256(a.encode()).hexdigest()}
    (ROOT/'evidence/petals/final-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2));browser.close()
