import pathlib,json,sys,datetime,hashlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
label=sys.argv[1] if len(sys.argv)>1 else 'v3'
OUT=ROOT/'evidence/extension';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,ok):
    checks.append({'name':name,'pass':bool(ok)})
    if not ok:
        (OUT/(label+'-failure.json')).write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks},indent=2));raise AssertionError(name)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    url=(ROOT/'index.html').as_uri()+'?seed=271828&density=7&wind=35&frame=360&flower=cosmos&brush=ink&width=1&texture=60&opacity=85'
    page.goto(url)
    check('independent flower and brush controls exist',page.locator('#flower').count()==1 and page.locator('#brush').count()==1)
    page.locator('#garden').screenshot();page.screenshot(path=str(OUT/(label+'-desktop.png')),full_page=True)
    page.locator('#garden').screenshot(path=str(OUT/(label+'-garden.png')))
    def pixels():return page.locator('#garden').evaluate('(c)=>c.toDataURL()')
    signatures=[]
    for flower in ['cosmos','daisy','poppy']:
        page.select_option('#flower',flower)
        for brush in ['pen','ink','pencil','dry','watercolor']:
            page.select_option('#brush',brush);a=pixels();signatures.append(hashlib.sha256(a.encode()).hexdigest())
            check(f'{flower}/{brush} retains selected flower',page.locator('#flower').input_value()==flower)
    check('15 rendered combinations differ',len(set(signatures))==15)
    page.select_option('#flower','cosmos');page.select_option('#brush','ink');original=pixels()
    for id,value in [('stroke-width','2.5'),('texture','10'),('opacity','35')]:
        old=page.locator('#'+id).input_value();page.locator('#'+id).fill(value);check(id+' changes image',original!=pixels());page.locator('#'+id).fill(old);check(id+' roundtrip identical',original==pixels())
    for _ in range(3):
        page.select_option('#flower','poppy');page.select_option('#brush','dry');page.select_option('#flower','cosmos');page.select_option('#brush','ink')
    check('selection roundtrip identical',original==pixels())
    page.set_viewport_size({'width':390,'height':844});page.goto(url);page.screenshot(path=str(OUT/(label+'-mobile.png')),full_page=True)
    check('mobile no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.set_viewport_size({'width':1440,'height':1100});page.goto((ROOT/'study.html').as_uri())
    for id in ['flowers','brushes','combinations']:
        page.locator('#'+id).screenshot(path=str(OUT/(label+'-'+id+'.png')))
    check('no page exceptions',not errors)
    result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':label,'browser':b.version,'seed':'271828','frame':360,'viewport':[1440,1000],'checks':checks,'passed':len(checks),'errors':errors}
    (OUT/(label+'-checks.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result));b.close()
