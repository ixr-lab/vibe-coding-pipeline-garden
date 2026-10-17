"""Final local links and CSS-only comparison control check."""
import pathlib,json,datetime
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ('src','href') and v and not urlsplit(v).scheme and not v.startswith('#'):self.links.append(v)
missing=[]
for name in ['index.html','process.html']:
    parser=Links();parser.feed((ROOT/name).read_text(encoding='utf-8'))
    for link in parser.links:
        if not (ROOT/unquote(urlsplit(link).path)).exists():missing.append(name+':'+link)
assert not missing,missing
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
    page.goto((ROOT/'process.html').as_uri())
    selected=[]
    for v in ['v0','v1','v2']:
        page.locator('label[for="version-'+v+'"]').click()
        assert page.locator('.frame-'+v).is_visible()
        assert page.locator('.frame-'+v+' img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
        selected.append(v)
    page.screenshot(path=str(ROOT/'evidence/process-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(ROOT/'evidence/process-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    (ROOT/'evidence/delivery-checks.json').write_text(json.dumps({'recorded_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'missing_local_links':missing,'version_controls':selected,'mobile_overflow':False},indent=2),encoding='utf-8')
    print('Local links and 3 CSS version controls passed.');b.close()
