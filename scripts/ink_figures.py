"""Arrange own executed screenshots; originals remain available without resizing."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import sys,json,datetime
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/ink'
LATEST=sys.argv[1] if len(sys.argv)>1 else 'v14'
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',17)
def panel(path,size):
    return ImageOps.contain(Image.open(path).convert('RGB'),size,Image.Resampling.LANCZOS)
def grid(items,path,cols=2,cell=(720,640)):
    w,h=cell;image=Image.new('RGB',(w*cols,h*((len(items)+cols-1)//cols)),'#f3f0e7');d=ImageDraw.Draw(image)
    for i,(title,source) in enumerate(items):
        x=(i%cols)*w;y=(i//cols)*h;d.text((x+18,y+12),title,font=font,fill='#333b39')
        p=panel(source,(w-24,h-55));image.paste(p,(x+(w-p.width)//2,y+45))
    image.save(OUT/path)
grid([('v11 / before ink direction',ROOT/'evidence/petals/v11-garden.png'),(LATEST+' / whole plant & empty paper',OUT/(LATEST+'-garden.png'))],'before-after.png')
grid([(v+' / same viewport and seed',OUT/(v+'-garden.png')) for v in ['v12','v13',LATEST]],'evolution.png',3,(500,460))
grid([('INK / selected color stored',OUT/(LATEST+'-ink.png')),('TINT / rose #9b6773',OUT/(LATEST+'-rose.png')),('TINT / blue #466e9a',OUT/(LATEST+'-blue.png'))],'color-modes.png',3,(500,460))
grid([('v12-r2 / material seed corrected',OUT/'v12-r2-plant-cosmos.png'),('v13 / open silhouette',OUT/'v13-plant-cosmos.png'),(LATEST+' / pigment & connections',OUT/(LATEST+'-plant-cosmos.png'))],'plant-evolution.png',3,(420,760))
for key,source in [('ink-bada-lotus',LATEST+'-plant-poppy.png'),('ink-seitei-flowers',LATEST+'-blue.png'),('ink-after-yun-peonies',LATEST+'-plant-daisy.png')]:
    Image.open(OUT/source).save(OUT/('current-'+key+'.png'))
(OUT/'figures.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':LATEST,'ownership':'All input PNGs are own Canvas output/screenshots. No source artwork pixels included.','comparison_panels':'Resized with aspect ratio preserved; original linked separately.','figures':['before-after.png','evolution.png','color-modes.png','plant-evolution.png'],'reference_examples':'Analytical examples of adopted features; do not depict the source lotus, wisteria or peonies.'},ensure_ascii=False,indent=2),encoding='utf8')
print('Own screenshot figures assembled; original files preserved.')
