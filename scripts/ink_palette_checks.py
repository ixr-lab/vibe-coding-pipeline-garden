"""Reproduce pigment-only Canvas checks and the isolated flower swatch locally.

The 36 hashes below were captured from actual v11 rendering before InkPalette
implementation, with Chromium 155.0.8059.84 on Windows, DPR 1. They are PNG data
URL hashes, so a browser rasterizer/encoder update can require baseline review.
No source imagery, external references or network requests are used.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse
import base64
import datetime
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence' / 'ink'
BASELINE_BROWSER = '155.0.8059.84'
BASELINE_SHA256 = {
    'cosmos/23/none': '926e785e7ac0a1c90a5a7ef1b778ea8ee6f61dcda851afe04da1978f1ff1ad87',
    'cosmos/23/pen': '7571b130364d9f4679856366615c9bac4fc94f93c4617306d5ec5d80abc763d0',
    'cosmos/23/ink': 'c6a9068e069f373167f9da15c7ac689cb5a211f9cd77f88d1d25f2af0f47cdb2',
    'cosmos/23/pencil': '14930d165b0cbe34e00ec1be9790597358d83b3e5a9667325a84a85dc9bc3e72',
    'cosmos/23/dry': '2c8d8cfa13376d57898ae887417cd6468ec347930eabd0e08e9661da5cb4a3b3',
    'cosmos/23/watercolor': '09eddbcb861431cfcb83e2d978a82616376f3f395c2398b3013a013d899c663c',
    'cosmos/105/none': '86e9c5b9bfe46d936b12aaa5a075ade566ae47c5131bf1d6966e700180ee3b56',
    'cosmos/105/pen': '5d2f91918a0202ca88a5bf335b2dc5a5c422b94d81fa3d34a54c139b0b38fd00',
    'cosmos/105/ink': '49fef8b76c14142d00d7e8ca1a9864ac7e7c582f4e701b130d420424c3bd1b0a',
    'cosmos/105/pencil': '513082762e24e45b9552ac419ed9f7b0ff7c978497199e7eba0e58a13f0f9a52',
    'cosmos/105/dry': '8dfbb322d386522e2c347b0dd3573a66fd6eb36ad69e910e7e19450e135429f7',
    'cosmos/105/watercolor': '519c1d9fb79e9b32ad42a8d67ba30f527930dc08282d7f5d30b45e50d13e3c85',
    'daisy/23/none': '0ffa1b9bd4bd2e385fcc535566539ec44e2a587d732b34877df585e8c3ce67de',
    'daisy/23/pen': '62295acc394588614ce7e4fd4c859720be64e33a0d432a43f1b9dc53e1713d13',
    'daisy/23/ink': 'af5480bc09439be3295efb34d4b268cae9704e8f301fa8e6e167086c01c35007',
    'daisy/23/pencil': '053d824e26cb8ef5db69a8eaf251a09db1cd13fa73e17e2de7821126f88a054c',
    'daisy/23/dry': '47fc92c72c8ce85cdecae04d5ed78491716cf608ec2929e8bbac6571c2d7db01',
    'daisy/23/watercolor': '037808d16bc6b2129cc6ece6fb375a42ab1e9c09395281512318b59c73b05cbc',
    'daisy/105/none': '9367fc4cc5df40765a66f1f3a84ddfd9a2ca9f8b47312e4738c0ff02b8763e1b',
    'daisy/105/pen': 'd4a31fc8fd45144998851f08941050746c8573130ff3f04aa96629b3c0b8b6e1',
    'daisy/105/ink': '22eedc87f996e6f086a88b44e92602448834cf3dfca20c50a3144c32a16bf2e7',
    'daisy/105/pencil': '7dfbe53fadfc3aaec65925d066246fe3be4eb96691b0644056aa79eaa17e6188',
    'daisy/105/dry': '114ed52937481ada00d22b49699dbac0d0a78697ab316a2ca46c791347b5022b',
    'daisy/105/watercolor': '210d5b737ad7a18166e5a956bc471476ce3fd4ceac5e5659d34a04d943970281',
    'poppy/23/none': '5971273e06e69f55e565591ea3cb49b4a2134333935b7881a96a992a6f2e576a',
    'poppy/23/pen': '0e53d5df7057ce06a891f70502d0422b6a7285a33eeb93045351682246eddd91',
    'poppy/23/ink': 'ffa327d4df3c2b70d24f91d0b84999763ffa853a7806a908b3e6c004518fa3e2',
    'poppy/23/pencil': '62b818da120c5dc753daf9ba2a10564dda1b4bf6ab6e6bb9b301e9f44dbccd5e',
    'poppy/23/dry': 'ca4490fe02eb3010065877ac90c7f8c6cbad5ae17852d3085fbc323858e21cf4',
    'poppy/23/watercolor': '12358fe52f9a23461abfdcdf13391799d0c0e7a856a4812fc1fe0271912172d7',
    'poppy/105/none': '786c8a7f794e80ac1d41e09282b9d7bb10574bd6ad53acd44501b6cdc5a379f5',
    'poppy/105/pen': 'e34d6e57568163b48f8285e538a155cb0422efc47e11671284f1c79f67d7de89',
    'poppy/105/ink': '57c1272e32a383424a52275eee5461293748cda93c7db6be27e2c8ff31628a2c',
    'poppy/105/pencil': 'b8be2125cc1bb161954269b5ef1acf7ff466b3a0cfb563de77b1f8942a058ad1',
    'poppy/105/dry': '2d6bbfb3b22408ec92f24fffb28bb95cd8549f6029cf91b1d36011ed7233c2e4',
    'poppy/105/watercolor': '264330267ee895ca690a05f049d8e89f98bc43a49526e5689e40339a37250dde',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--chrome', default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chrome, headless=True)
        page = browser.new_page(viewport={'width': 1200, 'height': 1000}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for name in ['petal-paint.js', 'ink-palette.js', 'flower-art.js']:
            page.add_script_tag(content=(ROOT / name).read_text(encoding='utf-8'))
        result = page.evaluate('''()=>{
          const checks=[],legacy={},brushes=['pen','ink','pencil','dry','watercolor'];
          function check(name,pass){checks.push({name,pass});}
          function draw(kind,r,brush,patch){
            const c=document.createElement('canvas');c.width=c.height=r*3;const x=c.getContext('2d');
            const options=Object.assign(brush?{brush,widthScale:1,texture:.6,opacity:.85,strength:.65}:{},patch);
            FlowerArt.draw(x,kind,r*1.5,r*1.5,r,'ink-legacy',-.1,options);return c;
          }
          for(const kind of FlowerArt.kinds)for(const r of [23,105])for(const brush of [null,...brushes]){
            legacy[[kind,r,brush||'none'].join('/')]=draw(kind,r,brush).toDataURL();
          }
          for(const kind of FlowerArt.kinds)for(const r of [23,105]){
            const signatures=[];
            for(const brush of brushes){
              const a=draw(kind,r,brush,{mode:'ink',color:'#335c99'}),b=draw(kind,r,brush,{mode:'ink',color:'#a05e50'});
              const pixels=a.getContext('2d').getImageData(0,0,a.width,a.height).data;
              check('ink achromatic '+kind+'/'+r+'/'+brush,pixels.every((value,i)=>i%4!==0||pixels[i+1]===value&&pixels[i+2]===value));
              check('ink color independent '+kind+'/'+r+'/'+brush,a.toDataURL()===b.toDataURL());
              const blue=draw(kind,r,brush,{mode:'tint',color:'#335c99'}),red=draw(kind,r,brush,{mode:'tint',color:'#a05e50'});
              check('tint color response '+kind+'/'+r+'/'+brush,blue.toDataURL()!==red.toDataURL());
              check('tint deterministic '+kind+'/'+r+'/'+brush,blue.toDataURL()===draw(kind,r,brush,{mode:'tint',color:'#335c99'}).toDataURL());
              signatures.push(blue.toDataURL());
            }
            check('five tint materials distinct '+kind+'/'+r,new Set(signatures).size===5);
          }
          const c=document.createElement('canvas');c.width=c.height=120;const x=c.getContext('2d');
          x.fillStyle='#123456';x.strokeStyle='#765432';x.globalAlpha=.7;x.lineWidth=3;
          FlowerArt.draw(x,'cosmos',60,60,23,'restore',0,{mode:'tint',color:'#9b6773',brush:'watercolor'});
          check('native styles restored',x.fillStyle==='#123456'&&x.strokeStyle==='#765432'&&x.globalAlpha===.7&&x.lineWidth===3);
          const sheet=document.createElement('canvas');sheet.width=1250;sheet.height=1200;const s=sheet.getContext('2d');
          s.fillStyle='#f3f0e7';s.fillRect(0,0,sheet.width,sheet.height);s.font='14px sans-serif';let row=0;
          for(const kind of FlowerArt.kinds)for(const mode of ['ink','tint']){
            brushes.forEach((brush,i)=>{
              const x=i*250;s.fillStyle='#45413a';s.fillText(kind+' / '+mode+' / '+brush,x+12,row*200+20);
              for(const [offset,r] of [[100,72],[217,23]])FlowerArt.draw(s,kind,x+offset,row*200+(r===72?110:115),r,'ink-legacy',-.1,
                {mode,color:InkPalette.defaults[kind],brush,widthScale:1,texture:.6,opacity:.85,strength:.65});
            });row++;
          }
          return {checks,legacy,swatch:sheet.toDataURL()};
        }''')
        actual = {key: hashlib.sha256(value.encode()).hexdigest() for key, value in result['legacy'].items()}
        checks = [
            {'name': 'legacy pixels ' + key, 'pass': actual[key] == expected}
            for key, expected in BASELINE_SHA256.items()
        ] + result['checks']
        (OUT / 'v12-palette.png').write_bytes(base64.b64decode(result['swatch'].split(',')[1]))
        report = {
            'recorded_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'version': 'v12 initial pigment adapter',
            'browser': browser.version,
            'viewport': [1200, 1000],
            'device_scale_factor': 1,
            'seed': 'ink-legacy',
            'baseline': {
                'label': 'Actual v11 Canvas PNG data URLs captured before InkPalette implementation',
                'browser': BASELINE_BROWSER,
                'radii': [23, 105],
                'sha256': BASELINE_SHA256,
            },
            'actual_legacy_sha256': actual,
            'checks': checks,
            'passed': sum(check['pass'] for check in checks),
            'total': len(checks),
            'errors': errors,
            'swatch': 'evidence/ink/v12-palette.png',
            'scope': 'Isolated flower color, legacy pixels, material distinction, determinism and native state restoration; full-scene QA is separate.',
        }
        (OUT / 'palette-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({key: report[key] for key in ['version', 'browser', 'passed', 'total', 'errors', 'swatch']}, indent=2))
        browser.close()
        return 0 if all(check['pass'] for check in checks) and not errors else 1


if __name__ == '__main__':
    raise SystemExit(main())
