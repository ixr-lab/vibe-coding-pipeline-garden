"""Pre/post audit uses public DOM and instruments RAF outside production code."""
import pathlib,json,sys,datetime
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
label=sys.argv[1] if len(sys.argv)>1 else 'replay-extended'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page(viewport={'width':1440,'height':1000})
    page.add_init_script('window.rafCount=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=function(cb){window.rafCount++;return raf.call(window,cb)}')
    page.goto((ROOT/'index.html').as_uri())
    page.locator('#garden').focus()
    before=page.locator('#count').inner_text()
    page.keyboard.press('ArrowRight');page.keyboard.press('Enter')
    after=page.locator('#count').inner_text()
    page.locator('#pause').click()
    page.wait_for_timeout(80)
    c1=page.evaluate('rafCount');image1=page.locator('#garden').screenshot()
    page.wait_for_timeout(150)
    c2=page.evaluate('rafCount');image2=page.locator('#garden').screenshot()
    page.emulate_media(reduced_motion='reduce')
    page.goto((ROOT/'index.html').as_uri())
    page.wait_for_timeout(100)
    r1=page.evaluate('rafCount');page.wait_for_timeout(150);r2=page.evaluate('rafCount')
    reduced_status=page.locator('#mode').inner_text()
    page.set_viewport_size({'width':390,'height':844})
    page.locator('.material-drawer').evaluate('(e)=>e.open=true')
    targets=page.locator('button,select,input[type="range"]').evaluate_all('(els)=>els.map(e=>({id:e.id,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))')
    result={'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'label':label,'keyboard_before':before,'keyboard_after':after,'keyboard_pass':after.startswith('6 /'),'pause_raf_requests':c2-c1,'pause_pixels_equal':image1==image2,'reduced_raf_requests':r2-r1,'reduced_status':reduced_status,'targets':targets,'targets_44px':all(t['height']>=44 for t in targets)}
    (ROOT/f'evidence/petals/{label}-accessibility.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2));b.close()
    assert result['keyboard_pass'] and c2==c1 and image1==image2 and r2==r1 and result['targets_44px']
