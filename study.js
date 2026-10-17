(function(){
  'use strict';
  const names={cosmos:'코스모스',daisy:'데이지',poppy:'개양귀비',pen:'균일 펜',ink:'압력 잉크',pencil:'연필',dry:'드라이 브러시',watercolor:'수채'};
  function setup(id){const c=document.getElementById(id),x=c.getContext('2d');x.fillStyle='#f3f0e7';x.fillRect(0,0,c.width,c.height);x.font='18px Arial';x.fillStyle='#253f35';return x;}
  const f=setup('flowers');FlowerArt.kinds.forEach((kind,i)=>{const x=i*400;f.fillStyle='#253f35';f.fillText(names[kind],x+30,40);f.font='12px Arial';f.fillText(kind+' · seed 271828',x+30,65);f.font='18px Arial';
    BrushArt.draw(f,'ink',{x1:x+200,y1:415,cx:x+180,cy:330,x2:x+200,y2:230},{width:5,texture:.6,opacity:.85,color:'#526b43',seed:'271828'});
    FlowerArt.draw(f,kind,x+200,225,125,'271828',-.1,{brush:'ink',widthScale:1,texture:.6,opacity:.85,strength:.65});
  });
  const b=setup('brushes');BrushArt.kinds.forEach((kind,i)=>{const y=i*112+25;b.fillStyle='#253f35';b.fillText(names[kind],30,y+40);BrushArt.draw(b,kind,{x1:240,y1:y+50,cx:600,cy:y-50,x2:1130,y2:y+50},{width:18,texture:.6,opacity:.85,color:'#3f6450',seed:'271828'});});
  const c=setup('combinations');FlowerArt.kinds.forEach((flower,row)=>BrushArt.kinds.forEach((brush,col)=>{const x=col*240,y=row*300;c.fillStyle='#253f35';c.font='14px Arial';c.fillText(names[flower]+' / '+names[brush],x+15,y+27);BrushArt.draw(c,brush,{x1:x+95,y1:y+272,cx:x+155,cy:y+200,x2:x+120,y2:y+120},{width:5,texture:.6,opacity:.85,color:'#526b43',seed:'271828'});FlowerArt.draw(c,flower,x+120,y+118,67,'271828',-.1,{brush,widthScale:1,texture:.6,opacity:.85,strength:.65});}));
})();
