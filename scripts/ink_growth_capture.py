"""Run preserved v13 and current source at the reported intermediate growth age."""
from pathlib import Path
import base64,datetime,json,subprocess,sys,io
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/ink'
BEFORE=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'ink-v13-runtime'
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',14)
images=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);page.on('pageerror',lambda e:errors.append(str(e)))
 for name,runtime in [('v13',BEFORE),('v14',ROOT)]:
  page.goto((runtime/'index.html').as_uri()+'?frame=127.5')
  data=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=1000;c.height=778;const x=c.getContext('2d');x.fillStyle='#f6f3ea';x.fillRect(0,0,c.width,c.height);const plant={...GardenEngine.createInkPlant('271828',2,.44,.92,7),size:1.16,id:2,born:0};PlantRenderer.clear();PlantRenderer.draw(x,plant,{seed:'271828',time:2.125,reduced:false,density:7,flower:'daisy',brush:'pen',mode:'ink',color:'#9b6773',width:1,texture:60,opacity:100,petalStrength:65,wind:0},1000,778);return c.toDataURL()}''')
  raw=base64.b64decode(data.split(',')[1]);(OUT/(name+'-growth.png')).write_bytes(raw)
  crop=Image.open(io.BytesIO(raw)).convert('RGB').crop((420,250,620,410));crop.save(OUT/(name+'-growth-detail.png'));images.append((name,crop))
 board=Image.new('RGB',(440,210),'#f3f0e7');d=ImageDraw.Draw(board)
 for i,(name,crop) in enumerate(images):board.paste(crop,(10+i*220,40));d.text((12+i*220,12),name+' / age 2.125s',font=font,fill='#333b39')
 board.save(OUT/'growth-before-after.png');b.close()
 result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'before_source':'v13','after_source':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'seed':'271828','id':2,'time_seconds':2.125,'viewport':[1000,778],'DPR':1,'flower':'daisy','brush':'pen','wind':0,'opacity':100,'crop':[420,250,620,410],'crop_resized':False,'errors':errors,'note':'Isolated real Canvas renderer, not default five-plant composition. Numeric distance is documented separately in growth-connection.json.'}
 (OUT/'growth-raster.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result));assert not errors
