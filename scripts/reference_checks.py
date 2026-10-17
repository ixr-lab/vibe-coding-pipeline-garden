import pathlib,json,subprocess,sys,datetime
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
checks=[]
def check(name,ok):
 checks.append({'name':name,'pass':bool(ok)});assert ok,name
good=subprocess.run([sys.executable,str(ROOT/'scripts/build_references.py'),'--check'],capture_output=True)
check('generated source and Markdown match canonical JSON',good.returncode==0)
target=ROOT/'reference-data.js';original=target.read_bytes()
try:
 target.write_bytes(original+b'\n');stale=subprocess.run([sys.executable,str(ROOT/'scripts/build_references.py'),'--check'],capture_output=True)
 check('check mode rejects stale generated data',stale.returncode==1)
finally:target.write_bytes(original)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'reference.html').as_uri());cards=page.locator('#reference-list > article');check('all 8 references render',cards.count()==8)
 page.locator('#reference-list img').evaluate_all('(a)=>a.forEach(i=>i.loading="eager")')
 page.wait_for_function('Array.from(document.querySelectorAll("#reference-list img")).every(i=>i.complete&&i.naturalWidth>0)')
 check('current output images all load',page.locator('#reference-list img').evaluate_all('(a)=>a.length===8&&a.every(i=>i.complete&&i.naturalWidth>0)'))
 check('no external reference images embedded',page.locator('img[src^="http"]').count()==0)
 page.screenshot(path=str(ROOT/'evidence/extension/reference-desktop.png'))
 page.locator('[data-filter="flower"]').click();check('flower filter 3',page.locator('#reference-list > article:visible').count()==3)
 page.locator('[data-filter="brush"]').click();check('brush filter 5',page.locator('#reference-list > article:visible').count()==5)
 page.locator('#expand-all').click();check('all visible source details open',page.locator('#reference-list > article:visible details:not([open])').count()==0)
 check('source rights and visual inspection are present','권리' in page.locator('#reference-list').inner_text() and '2026-10-17' in page.locator('#reference-list').inner_text())
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-filter="all"]').click();page.screenshot(path=str(ROOT/'evidence/extension/reference-mobile.png'))
 check('mobile reference page no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 check('reference filter targets 44px',page.locator('[data-filter]').evaluate_all('(a)=>a.every(e=>e.getBoundingClientRect().height>=44)'))
 check('no reference page exceptions',not errors)
 result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'passed':len(checks),'errors':errors}
 (ROOT/'evidence/extension/reference-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result));b.close()
