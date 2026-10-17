"""Actual Chrome cold-control and warm RAF observations on one machine."""
import pathlib,json,datetime,statistics
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/ink'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((ROOT/'index.html').as_uri()+'?seed=271828&density=12&mode=tint&color=466e9a');page.locator('#reduced').check();page.locator('#reset').click()
 for _ in range(32):page.locator('#plant-center').click()
 rows=[]
 for flower in ['cosmos','daisy','poppy']:
  for brush in ['pen','ink','pencil','dry','watercolor']:
   result=page.evaluate('''([f,b])=>{const a=document.getElementById('flower'),c=document.getElementById('brush');const t=performance.now();a.value=f;a.dispatchEvent(new Event('change'));c.value=b;c.dispatchEvent(new Event('change'));document.getElementById('garden').getContext('2d').getImageData(0,0,1,1);return {flower:f,brush:b,synchronous_two_control_change_ms:performance.now()-t}}''',[flower,brush])
   assert page.locator('#count').inner_text().startswith('32 /');rows.append(result)
 page.locator('#stroke-width').fill('2.5');page.locator('#texture').fill('100');page.locator('#opacity').fill('100');page.locator('#petal-strength').fill('100')
 page.locator('#garden').screenshot(path=str(OUT/'max-density.png'))
 page.locator('#reduced').uncheck()
 values=page.evaluate('''()=>new Promise(resolve=>{let last;const v=[];function t(n){if(last!==undefined)v.push(n-last);last=n;if(v.length===120)resolve(v);else requestAnimationFrame(t)}requestAnimationFrame(t)})''')
 assert not errors
 out={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'browser':b.version,'viewport':[1440,1000],'DPR':1,'plants':32,'density':12,'seed':'271828','combinations':rows,'max_cold_change_ms':max(r['synchronous_two_control_change_ms'] for r in rows),'warm_scene':'poppy/watercolor tint blue width2.5 texture100 opacity100 petals100','raf_samples':120,'raf_mean_ms':statistics.mean(values),'raf_p95_ms':sorted(values)[113],'errors':errors,'note':'One headless Windows machine, no simultaneous QA browser during measurement. Cold two-control change includes CPU draw/readback, not isolated frame/input latency. RAF intervals do not guarantee 60fps on other devices.'}
 (OUT/'stress.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps(out));b.close()
