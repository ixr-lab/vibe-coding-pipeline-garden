"""Own output screenshots only; no external source imagery is redistributed."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'evidence/extension'
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',n)
def stack(name,files,titles):
 ims=[Image.open(P/f).convert('RGB') for f in files];w=max(i.width for i in ims)
 sheet=Image.new('RGB',(w,sum(i.height+54 for i in ims)+40),'#f3f0e7');d=ImageDraw.Draw(sheet);y=20
 for im,title in zip(ims,titles):d.text((24,y),title,font=font(21),fill='#253f35');sheet.paste(im,(0,y+40));y+=im.height+54
 sheet.save(P/name)
stack('flower-evolution.png',['v3-flowers.png','v4-flowers.png'],['v3 / 최초 구현 — seed 271828','v4 / 첫 개선 — 꽃잎 배열·겹침·접힘·종별 중심'])
stack('brush-evolution.png',['v3-brushes.png','v5-brushes.png'],['v3 / 최초 구현 — 동일 곡선·폭18·질감60·농도85','v5 / 두 번째 개선 — 종이 입자·마른 간극·안료 침착'])
flower=Image.open(P/'v5-flowers.png');brush=Image.open(P/'v5-brushes.png')
for i,id in enumerate(['cosmos','daisy','poppy']):flower.crop((i*400,0,(i+1)*400,flower.height)).save(P/('current-'+id+'.png'))
for i,id in enumerate(['uniform-pen','pressure-ink','pencil','dry-brush','watercolor']):brush.crop((0,i*112,brush.width,min(brush.height,(i+1)*112+40))).save(P/('current-'+id+'.png'))
sheet=Image.new('RGB',(1500,570),'#f3f0e7');d=ImageDraw.Draw(sheet)
for i,v in enumerate(['v3','v4','v5']):
 im=Image.open(P/(v+'-garden.png')).convert('RGB');im.thumbnail((470,470));x=15+i*500;d.text((x,20),v+' / seed 271828 · frame 360',font=font(18),fill='#253f35');sheet.paste(im,(x,60))
d.text((20,530),'같은 조건의 실제 출력 비교. 사진급 재현·사용자 미적 승인으로 판정하지 않습니다.',font=font(17),fill='#526456');sheet.save(P/'garden-evolution.png')
print('Flower/brush/garden comparison figures and 8 current output crops created.')
