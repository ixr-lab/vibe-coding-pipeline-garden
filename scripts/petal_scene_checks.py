"""Capture every material in the actual garden, and crop one bloom at native scale."""
import pathlib,sys,json,datetime,io,hashlib
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/petals'
label=sys.argv[1] if len(sys.argv)>1 else 'v9'
flowers=['cosmos','daisy','poppy'];brushes=['pen','ink','pencil','dry','watercolor']
sheet=Image.new('RGB',(700,384),'#f3f0e7');font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',11);checks=[];signatures=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'index.html').as_uri()+'?seed=271828&density=7&wind=35&frame=360&petals=65')
    pos=page.locator('#garden').evaluate('''c=>{
      const p=GardenEngine.createPlant('271828',0,.17,.87,7),{scale,root,baseY}=GardenEngine.layout(p,c.clientWidth,c.clientHeight);
      const end=Math.max(...p.branches.map(b=>b.start)),t=p.branches.filter(b=>b.start===end),branch=t[Math.floor(.15*t.length)];
      const sway=Math.sin(6*1.2+p.x*4)*35*.00026;
      return {x:root+branch.x2*scale-sway*branch.y2*scale,y:baseY+branch.y2*scale};
    }''')
    for row,flower in enumerate(flowers):
        page.select_option('#flower',flower)
        for col,brush in enumerate(brushes):
            page.select_option('#brush',brush);data=page.locator('#garden').screenshot();signatures.append(hashlib.sha256(data).hexdigest())
            (OUT/(label+'-scene-'+flower+'-'+brush+'.png')).write_bytes(data)
            image=Image.open(io.BytesIO(data)).convert('RGB');x,y=round(pos['x'])+1,round(pos['y'])+1
            # Keep the first bloom crop inside the left canvas edge; no synthetic padding.
            crop=image.crop((x-44,y-42,x+44,y+58));sheet.paste(crop,(col*140+26,row*128+28));ImageDraw.Draw(sheet).text((col*140+8,row*128+7),flower+' / '+brush,font=font,fill='#253f35')
    sheet.save(OUT/(label+'-in-garden.png'))
    checks=[{'name':'15 full garden selections differ','pass':len(set(signatures))==15},{'name':'no page errors','pass':not errors}]
    result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'label':label,'viewport':[1440,1000],'DPR':1,'seed':'271828','fixed_frame':360,'native_crop_center':pos,'crop_resized':False,'checks':checks,'errors':errors}
    (OUT/(label+'-scene-checks.json')).write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result));b.close();assert all(c['pass'] for c in checks)
