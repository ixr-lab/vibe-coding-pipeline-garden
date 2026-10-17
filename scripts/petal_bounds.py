"""Actual Canvas boundary inputs and comparison-protocol invariance after alpha guard."""
import pathlib,json,datetime,hashlib
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/petals'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page();page.goto((ROOT/'petal-study.html').as_uri())
    result=page.evaluate('''()=>{
      let draws=0;const errors=[];
      for(const radius of [11,23,105])for(const species of ['cosmos','daisy','poppy'])for(const brush of ['pen','ink','pencil','dry','watercolor'])for(const widthScale of [.5,2.5])for(const texture of [0,1])for(const opacity of [0,1])for(const strength of [0,1]){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const ctx=canvas.getContext('2d');
        const guarded=new Proxy(ctx,{get(t,k){const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v},set(t,k,v){if(k==='globalAlpha'&&(!Number.isFinite(v)||v<0||v>1))throw new Error('invalid alpha '+v);Reflect.set(t,k,v,t);return true}});
        try{FlowerArt.draw(guarded,species,160,160,radius,'271828',-.1,{brush,widthScale,texture,opacity,strength});draws++;}catch(e){errors.push({radius,species,brush,widthScale,texture,opacity,strength,error:String(e)})}
      }
      const signatures={};for(const r of [23,105])for(const flower of ['cosmos','daisy','poppy'])signatures[flower+'/'+r]=['pen','ink','pencil','dry','watercolor'].map(brush=>{const c=document.createElement('canvas');c.width=c.height=r*3;const x=c.getContext('2d');x.fillStyle='#f3f0e7';x.fillRect(0,0,c.width,c.height);FlowerArt.draw(x,flower,r*1.5,r*1.5,r,'271828',-.1,{brush,widthScale:1,texture:.6,opacity:.85,strength:.65});return c.toDataURL()});
      return {draws,errors,signatures};
    }''')
    baseline=json.loads((OUT/'v11-checks.json').read_text(encoding='utf-8'))['signatures']
    stable=all([hashlib.sha256(v.encode()).hexdigest() for v in values]==baseline[key] for key,values in result.pop('signatures').items())
    result.update(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),comparison_protocol_unchanged=stable)
    (OUT/'material-bounds.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result));b.close();assert result['draws']==720 and not result['errors'] and stable
