"""Compose a labeled comparison figure from original, unretouched screenshots."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
font_path='C:/Windows/Fonts/malgun.ttf'
font=lambda size:ImageFont.truetype(font_path,size)
sheet=Image.new('RGB',(1800,800),'#f3f0e7');draw=ImageDraw.Draw(sheet)
draw.text((40,27),'여린 정원 — 실제 수정과 발전',font=font(34),fill='#253f35')
draw.text((40,82),'seed 271828 · density 7 · wind 35 · frame 360 · viewport 1440×1000 · DPR 1',font=font(19),fill='#526456')
items=[('v0','최소 기능','비등방 배율 · 점 모양 잎'),('v1','첫 번째 개선','동일 축 배율 · 방향성 잎 · 지면'),('v2','두 번째 개선','키보드 · 동작 줄이기 · 모바일 제어')]
for i,(v,title,note) in enumerate(items):
    x=40+i*585
    draw.text((x,144),v+' / '+title,font=font(25),fill='#253f35')
    draw.text((x,185),note,font=font(17),fill='#526456')
    im=Image.open(ROOT/f'evidence/{v}-desktop.png').convert('RGB')
    im.thumbnail((550,710),Image.Resampling.LANCZOS)
    sheet.paste(im,(x,232))
    draw.rectangle((x-1,231,x+im.width,232+im.height),outline='#cbd2c2')
draw.text((40,746),'원본 PNG를 축소 배열한 비교 자료입니다. Canvas 높이 변경을 포함하며, 사용자 미적 승인은 확인 대기입니다.',font=font(18),fill='#526456')
sheet.save(ROOT/'evidence/comparison.png')
print('evidence/comparison.png')
