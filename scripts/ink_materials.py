"""Capture all 15 v14 whole-plant materials and native 1:1 source crops.

Uses the actual local product modules through a disposable browser harness. The
matrix and close-ups only paste/crop the same 300x580 Canvas output; no resizing,
redrawing, source artwork or external imagery is involved. Pixel difference
checks demonstrate distinct output, not an assessment of material realism.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageDraw, ImageFont
import argparse
import base64
import datetime
import hashlib
import io
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence' / 'ink'
SPECIES = ['cosmos', 'daisy', 'poppy']
BRUSHES = ['pen', 'ink', 'pencil', 'dry', 'watercolor']
BACKGROUND = '#f6f3ea'
SOURCE_FILES = ['engine.js', 'brush-art.js', 'petal-paint.js', 'ink-palette.js', 'flower-art.js', 'plant-renderer.js']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--chrome', default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    errors, requests = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chrome, headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url.split(':')[0]))
        page.goto((ROOT / 'index.html').as_uri() + '?seed=271828&frame=360&mode=ink&color=9b6773')
        page.wait_for_function('window.GardenEngine && window.PlantRenderer && window.FlowerArt && window.InkPalette')
        result = page.evaluate('''()=>{
          const W=300,H=580;
          const p={...GardenEngine.createInkPlant('271828',2,.52,.91,7),id:2,size:1.2,born:0};
          const geometry=JSON.stringify(p),layout=GardenEngine.layout(p,W,H);
          const state={seed:'271828',time:6,reduced:false,wind:35,density:7,width:1,texture:60,opacity:85,petalStrength:65,mode:'ink',color:'#9b6773'};
          const sway=Math.sin(state.time*1.2+p.x*4)*state.wind*.00026;
          // The renderer applies this final shear after its model-to-sprite mapping.
          function screen(x,y){return {x:layout.root+(x-sway*y)*layout.scale,y:layout.baseY+y*layout.scale};}
          function box(left,top,right,bottom){return [Math.max(0,Math.floor(left)),Math.max(0,Math.floor(top)),Math.min(W,Math.ceil(right)),Math.min(H,Math.ceil(bottom))];}
          const bloom=p.blooms.find(b=>b.pose!=='bud'),center=screen(bloom.x,bloom.y),radius=bloom.radius*layout.scale;
          const flowerBox=box(center.x-radius*1.6,center.y-radius*1.5,center.x+radius*1.6,center.y+radius*3.0);
          const group=p.leafGroups.find(g=>g.role==='body'&&g.position<.5),points=[];
          for(const [x,y] of [[group.petiole.x1,group.petiole.y1],[group.petiole.cx,group.petiole.cy],[group.petiole.x2,group.petiole.y2]])points.push(screen(x,y));
          // Conservative union for the same lower group in all three species.
          // Includes poppy's wider lobes, daisy's slightly longer blade and joins.
          for(const l of group.leaves){
            const c=Math.cos(l.angle),s=Math.sin(l.angle),extent=(l.width+Math.abs(l.bend))*1.4;
            for(const x of [0,l.length*1.16])for(const y of [-extent,extent])points.push(screen(l.x+x*c-y*s,l.y+x*s+y*c));
          }
          const leafBox=box(Math.min(...points.map(p=>p.x))-8,Math.min(...points.map(p=>p.y))-8,
            Math.max(...points.map(p=>p.x))+8,Math.max(...points.map(p=>p.y))+8);
          function render(flower,brush){
            const c=document.createElement('canvas');c.width=W;c.height=H;
            const x=c.getContext('2d');x.fillStyle='#f6f3ea';x.fillRect(0,0,W,H);
            PlantRenderer.clear();PlantRenderer.draw(x,p,{...state,flower,brush},W,H);return c.toDataURL();
          }
          const cases=[];
          for(const flower of ['cosmos','daisy','poppy'])for(const brush of ['pen','ink','pencil','dry','watercolor']){
            const image=render(flower,brush);
            cases.push({flower,brush,image,deterministic:image===render(flower,brush),geometryUnchanged:JSON.stringify(p)===geometry});
          }
          return {cases,geometry,layout,sway,settings:state,plant:{index:2,x:.52,y:.91,density:7,id:2,size:1.2,born:0},
            crops:{flower_and_neck:{box:flowerBox,bloom_index:p.blooms.indexOf(bloom),pose:bloom.pose,center,radius},lower_leaf_group:{box:leafBox,group_id:group.id,position:group.position}},
            canvas:[W,H]};
        }''')
        browser_version = browser.version
        browser.close()

    font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16)
    small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
    # Every source is pasted at its native pixel dimensions, with labels outside it.
    cell_w, cell_h, title_h = 320, 618, 38
    matrix = Image.new('RGB', (cell_w * 5, cell_h * 3), '#f3f0e7')
    md = ImageDraw.Draw(matrix)
    leaf_box = result['crops']['lower_leaf_group']['box']
    flower_box = result['crops']['flower_and_neck']['box']
    leaf_size = (leaf_box[2] - leaf_box[0], leaf_box[3] - leaf_box[1])
    flower_size = (flower_box[2] - flower_box[0], flower_box[3] - flower_box[1])
    close_w = max(320, leaf_size[0] + 20, flower_size[0] + 20)
    close_h = 80 + flower_size[1] + leaf_size[1]
    close = Image.new('RGB', (close_w * 5, close_h * 3), '#f3f0e7')
    cd = ImageDraw.Draw(close)
    hashes, records, checks = {}, [], []
    for case in result['cases']:
        flower, brush = case['flower'], case['brush']
        row, col = SPECIES.index(flower), BRUSHES.index(brush)
        raw = base64.b64decode(case['image'].split(',')[1])
        image = Image.open(io.BytesIO(raw)).convert('RGB')
        filename = 'v14-materials-' + flower + '-' + brush + '.png'
        (OUT / filename).write_bytes(raw)
        key = flower + '/' + brush
        hashes[key] = hashlib.sha256(raw).hexdigest()
        bounds = ImageChops.difference(image, Image.new('RGB', image.size, BACKGROUND)).getbbox()
        record = {'flower': flower, 'brush': brush, 'file': 'evidence/ink/' + filename,
                  'png_sha256': hashes[key], 'pixel_sha256': hashlib.sha256(image.tobytes()).hexdigest(),
                  'canvas': list(image.size), 'paint_bounds': list(bounds) if bounds else None,
                  'deterministic': case['deterministic'], 'geometry_unchanged': case['geometryUnchanged']}
        records.append(record)
        checks.append({'name': key + ' deterministic', 'pass': case['deterministic']})
        checks.append({'name': key + ' preserves the shared plant geometry', 'pass': case['geometryUnchanged']})
        checks.append({'name': key + ' paint remains within its Canvas', 'pass': bool(bounds and bounds[0] > 0 and bounds[1] > 0 and bounds[2] < 300 and bounds[3] < 580)})
        x, y = col * cell_w, row * cell_h
        md.text((x + 10, y + 9), flower + ' / ' + brush + ' / INK', font=font, fill='#333b39')
        matrix.paste(image, (x + 10, y + title_h))
        x, y = col * close_w, row * close_h
        cd.text((x + 10, y + 5), flower + ' / ' + brush + ' / native 1:1', font=font, fill='#333b39')
        cd.text((x + 10, y + 29), 'flower + neck / source crop', font=small, fill='#55534d')
        close.paste(image.crop(flower_box), (x + 10, y + 48))
        leaf_y = y + 60 + flower_size[1]
        cd.text((x + 10, leaf_y), 'lower leaves + join / source crop', font=small, fill='#55534d')
        close.paste(image.crop(leaf_box), (x + 10, leaf_y + 20))

    matrix.save(OUT / 'v14-materials.png')
    close.save(OUT / 'v14-materials-closeups.png')
    checks.append({'name': 'all 15 species/material combinations produce different pixels', 'pass': len(set(hashes.values())) == 15})
    for flower in SPECIES:
        checks.append({'name': flower + ' has five distinct brush results', 'pass': len({hashes[flower + '/' + brush] for brush in BRUSHES}) == 5})
    checks.extend([
        {'name': 'all native source crops remain inside the original Canvas', 'pass': all(0 <= b[0] < b[2] <= 300 and 0 <= b[1] < b[3] <= 580 for b in [leaf_box, flower_box])},
        {'name': 'no JavaScript page errors', 'pass': not errors},
        {'name': 'no external network requests', 'pass': not any(scheme in ['http', 'https'] for scheme in requests)},
    ])
    report = {
        'recorded_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': 'v14 final material evidence',
        'browser': browser_version, 'device_scale_factor': 1, 'canvas': result['canvas'],
        'plant': result['plant'], 'settings': result['settings'], 'layout': result['layout'], 'wind_shear': result['sway'],
        'shared_geometry_sha256': hashlib.sha256(result['geometry'].encode()).hexdigest(),
        'source_sha256': {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in SOURCE_FILES},
        'crops': result['crops'], 'crop_policy': 'Native 1:1 rectangular crops from the exact saved 300x580 case PNG; never resized or redrawn.',
        'matrix': 'evidence/ink/v14-materials.png', 'closeups': 'evidence/ink/v14-materials-closeups.png',
        'case_count': len(records), 'cases': records, 'checks': checks,
        'passed': sum(check['pass'] for check in checks), 'total': len(checks), 'errors': errors,
        'material_realism': 'Not graded by pixel-difference checks. I3 remains partial: some flower surfaces retain smooth digital gradients or flat faces.',
        'ownership': 'Own executed Canvas output only. No source artwork or external imagery included.',
    }
    (OUT / 'v14-materials.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ['version', 'case_count', 'passed', 'total', 'errors', 'matrix', 'closeups']}, indent=2))
    return 0 if all(check['pass'] for check in checks) else 1


if __name__ == '__main__':
    raise SystemExit(main())
