"""Local page/image/link inspection after final documentation changes."""
import pathlib,json,datetime,re
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/petals';checks=[]
def check(name,ok):checks.append({'name':name,'pass':bool(ok)})
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for width,height in [(1440,1000),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for file in ['index.html','process.html','reference.html','study.html','petal-study.html']:
            page.goto((ROOT/file).as_uri()+('?frame=360' if file=='index.html' else ''))
            page.locator('img').evaluate_all('(a)=>a.forEach(i=>i.loading="eager")')
            page.wait_for_function('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)')
            check(file+'/'+str(width)+' no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            links=page.locator('[href],[src]').evaluate_all('(a)=>a.flatMap(e=>[e.getAttribute("href"),e.getAttribute("src")].filter(Boolean))')
            missing=[]
            for link in links:
                parsed=urlsplit(link)
                if not parsed.scheme and parsed.path and not (ROOT/unquote(parsed.path)).exists():missing.append(link)
            check(file+'/'+str(width)+' local links exist',not missing)
            if file in ['process.html','reference.html']:page.screenshot(path=str(OUT/(file[:-5]+('-desktop.png' if width==1440 else '-mobile.png'))),full_page=True)
    check('no page exceptions',not errors)
    result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks),'errors':errors};(OUT/'pages-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result));b.close();assert all(c['pass'] for c in checks)
