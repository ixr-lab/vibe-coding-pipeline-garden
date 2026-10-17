"""Assemble only this project's own browser screenshots; no external art input."""
from pathlib import Path
import sys
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence/petals'
LATEST=sys.argv[1] if len(sys.argv)>1 else 'v11'
FONT=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',24)
def titled(image,title):
    result=Image.new('RGB',(image.width,image.height+52),'#f3f0e7');result.paste(image,(0,52));ImageDraw.Draw(result).text((18,10),title,fill='#253f35',font=FONT);return result
before=Image.open(OUT/'v5-large.png').convert('RGB');after=Image.open(OUT/(LATEST+'-large.png')).convert('RGB')
sheet=Image.new('RGB',(before.width*2,before.height+52),'#f3f0e7');sheet.paste(titled(before,'v5 · 꽃잎 브러시 없음'),(0,0));sheet.paste(titled(after,LATEST+' · 꽃잎 재료 5종'),(before.width,0));sheet.save(OUT/'before-after.png')
versions=['v5','v6','v7','v8','v9','v10']+([LATEST] if LATEST not in ['v5','v6','v7','v8','v9','v10'] else [])
evolution=Image.new('RGB',(1000,len(versions)*412),'#f3f0e7')
for i,label in enumerate(versions):evolution.paste(titled(Image.open(OUT/(label+'-basic.png')).convert('RGB'),label+' · radius 23 / seed 271828'),(0,i*412))
evolution.save(OUT/'basic-evolution.png')
def crop(row,col):return after.crop((col*300,row*330+40,(col+1)*300,(row+1)*330))
for row,id in enumerate(['cosmos','daisy','poppy']):crop(row,1).save(ROOT/'evidence/extension'/('current-'+id+'.png'))
for col,id in enumerate(['uniform-pen','pressure-ink','pencil','dry-brush','watercolor']):
    head=crop(0,col);stem=Image.open(ROOT/'evidence/extension/v5-brushes.png').convert('RGB').crop((220,col*112+6,1170,col*112+108));stem.thumbnail((300,90))
    result=Image.new('RGB',(300,380),'#f3f0e7');result.paste(head,(0,0));result.paste(stem,((300-stem.width)//2,295));result.save(ROOT/'evidence/extension'/('current-'+id+'.png'))
for id,row,col in [('petal-watercolor',0,4),('petal-ink-hatching',2,0),('petal-pressure',1,1)]:crop(row,col).save(OUT/('current-'+id+'.png'))
print('assembled before-after, versioned basic comparison and 11 own output crops')
