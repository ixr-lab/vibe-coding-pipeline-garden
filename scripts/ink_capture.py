"""Capture actual local Canvas output; source references are never embedded."""
from pathlib import Path
import datetime,json,sys,hashlib,io,base64
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/ink';OUT.mkdir(exist_ok=True)
LABEL=sys.argv[1] if len(sys.argv)>1 else 'v12'
BASE=(ROOT/'index.html').as_uri()+'?seed=271828&density=7&wind=35&frame=360&mode=tint&color=9b6773'
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',15)
checks=[];hashes={};errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE);page.locator('#garden').screenshot()
    page.screenshot(path=str(OUT/(LABEL+'-desktop.png')),full_page=True)
    page.locator('#garden').screenshot(path=str(OUT/(LABEL+'-garden.png')))
    for mode,color,slug in [('ink','9b6773','ink'),('tint','9b6773','rose'),('tint','466e9a','blue')]:
        page.select_option('#painting-mode',mode)
        page.locator('#flower-color').fill('#'+color)
        data=page.locator('#garden').screenshot();(OUT/(LABEL+'-'+slug+'.png')).write_bytes(data)
        hashes[slug]=hashlib.sha256(data).hexdigest()
    # A separate actual renderer viewport shows a whole plant, never a rescaled head crop.
    gallery=Image.new('RGB',(1260,740),'#f3f0e7');draw=ImageDraw.Draw(gallery)
    for col,flower in enumerate(['cosmos','daisy','poppy']):
        data=page.evaluate('''flower=>{
          const c=document.createElement('canvas');c.width=420;c.height=700;
          const x=c.getContext('2d');x.fillStyle='#f6f3ea';x.fillRect(0,0,420,700);
          const p={...GardenEngine.createInkPlant('271828',2,.52,.91,7),id:2,size:1.2,born:0};
          PlantRenderer.clear();PlantRenderer.draw(x,p,{time:6,reduced:false,wind:35,density:7,flower,brush:'ink',width:1,texture:60,opacity:85,petalStrength:65,mode:'tint',color:{cosmos:'#9b6773',daisy:'#9e8c64',poppy:'#a05e50'}[flower]},420,700);
          return c.toDataURL();
        }''',flower)
        raw=base64.b64decode(data.split(',')[1]);(OUT/(LABEL+'-plant-'+flower+'.png')).write_bytes(raw)
        gallery.paste(Image.open(io.BytesIO(raw)).convert('RGB'),(420*col,40));draw.text((col*420+20,10),flower+' / whole plant · seed 271828',font=font,fill='#333b39')
    gallery.save(OUT/(LABEL+'-plants.png'))
    # All five brushes are compared on the same complete plant geometry.
    matrix=Image.new('RGB',(1500,620),'#f3f0e7');md=ImageDraw.Draw(matrix)
    for col,brush in enumerate(['pen','ink','pencil','dry','watercolor']):
        data=page.evaluate('''brush=>{
          const c=document.createElement('canvas');c.width=300;c.height=580;
          const x=c.getContext('2d');x.fillStyle='#f6f3ea';x.fillRect(0,0,300,580);
          const p={...GardenEngine.createInkPlant('271828',2,.52,.91,7),id:2,size:1.2,born:0};
          PlantRenderer.clear();PlantRenderer.draw(x,p,{time:6,reduced:false,wind:35,density:7,flower:'cosmos',brush,width:1,texture:60,opacity:85,petalStrength:65,mode:'ink',color:'#9b6773'},300,580);
          return c.toDataURL();
        }''',brush)
        raw=base64.b64decode(data.split(',')[1]);(OUT/(LABEL+'-brush-'+brush+'.png')).write_bytes(raw)
        matrix.paste(Image.open(io.BytesIO(raw)).convert('RGB'),(300*col,40));md.text((col*300+16,10),brush+' / INK',font=font,fill='#333b39')
    matrix.save(OUT/(LABEL+'-brushes.png'))
    mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto(BASE);mobile.locator('#garden').screenshot()
    mobile.screenshot(path=str(OUT/(LABEL+'-mobile.png')),full_page=True)
    checks=[{'name':'mode and chosen color produce distinct garden screens','pass':len(set(hashes.values()))==3},{'name':'mobile no horizontal overflow','pass':mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')},{'name':'no JavaScript errors','pass':not errors}]
    result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'label':LABEL,'browser':b.version,'viewport':[1440,1000],'DPR':1,'seed':'271828','frame':360,'density':7,'wind':35,'brush':'ink','width':1,'texture':60,'opacity':85,'petalStrength':65,'mode':'tint','color':'#9b6773','single_plant':{'index':2,'size':1.2,'viewport':[420,700]},'hashes':hashes,'checks':checks,'errors':errors}
    (OUT/(LABEL+'-capture.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(result,ensure_ascii=False));b.close()
    assert all(c['pass'] for c in checks)
