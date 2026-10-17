"""Actual browser images, isolated heads and material roundtrips; no external requests."""
import pathlib,json,sys,datetime,hashlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
label=sys.argv[1] if len(sys.argv)>1 else 'v6'
RUNTIME=pathlib.Path(sys.argv[2]).resolve() if len(sys.argv)>2 else ROOT
OUT=ROOT/'evidence/petals';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,ok):checks.append({'name':name,'pass':bool(ok)})
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1560,'height':1120},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((RUNTIME/'petal-study.html').as_uri())
    for id in ['large','basic']:page.locator('#'+id).screenshot(path=str(OUT/(label+'-'+id+'.png')))
    result=page.evaluate('''()=>{
      const flowers=['cosmos','daisy','poppy'],brushes=['pen','ink','pencil','dry','watercolor'];
      const result={};
      for(const r of [105,23])for(const flower of flowers){
        result[flower+'/'+r]=brushes.map(brush=>{
          const c=document.createElement('canvas');c.width=c.height=r*3;const x=c.getContext('2d');
          x.fillStyle='#f3f0e7';x.fillRect(0,0,c.width,c.height);
          FlowerArt.draw(x,flower,r*1.5,r*1.5,r,'271828',-.1,{brush,widthScale:1,texture:.6,opacity:.85,strength:.65});return c.toDataURL();
        });
      }return result;
    }''')
    signatures={key:[hashlib.sha256(v.encode()).hexdigest() for v in values] for key,values in result.items()}
    for key,values in signatures.items():check(key+' five isolated flower heads differ',len(set(values))==5)
    for brush in ['pen','ink','pencil','dry','watercolor']:
        a=page.evaluate('''brush=>{const c=document.createElement('canvas');c.width=c.height=300;const x=c.getContext('2d');FlowerArt.draw(x,'poppy',150,150,105,'271828',-.1,{brush,widthScale:1,texture:.6,opacity:.85,strength:.65});return c.toDataURL();}''',brush)
        b=page.evaluate('''brush=>{const c=document.createElement('canvas');c.width=c.height=300;const x=c.getContext('2d');FlowerArt.draw(x,'poppy',150,150,105,'271828',-.1,{brush,widthScale:1,texture:.6,opacity:.85,strength:.65});return c.toDataURL();}''',brush)
        check(brush+' isolated deterministic draw',a==b)
    page.set_viewport_size({'width':1440,'height':1000})
    page.goto((RUNTIME/'index.html').as_uri()+'?seed=271828&density=7&wind=35&frame=360&flower=cosmos&brush=ink&width=1&texture=60&opacity=85&petals=65')
    page.screenshot(path=str(OUT/(label+'-desktop.png')),full_page=True);page.locator('#garden').screenshot(path=str(OUT/(label+'-garden.png')))
    def pixels():return page.locator('#garden').evaluate('(c)=>c.toDataURL()')
    original=pixels()
    if page.locator('#petal-strength').count():
        for id,value in [('stroke-width','2.5'),('texture','10'),('opacity','35'),('petal-strength','15')]:
            old=page.locator('#'+id).input_value();page.locator('#'+id).fill(value);check(id+' changes garden',original!=pixels());page.locator('#'+id).fill(old);check(id+' roundtrip identical',original==pixels())
        page.wait_for_timeout(120);check('fixed grain stable after wait',original==pixels())
    page.set_viewport_size({'width':390,'height':844});page.reload();page.screenshot(path=str(OUT/(label+'-mobile.png')),full_page=True)
    check('mobile no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check('no page exceptions',not errors)
    output={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':label,'browser':browser.version,'seed':'271828','viewport':[1440,1000],'radii':[105,23],'checks':checks,'signatures':signatures,'errors':errors,'passed':sum(c['pass'] for c in checks),'total':len(checks)}
    (OUT/(label+'-checks.json')).write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(output));browser.close()
    sys.exit(0 if all(c['pass'] for c in checks) else 1)
