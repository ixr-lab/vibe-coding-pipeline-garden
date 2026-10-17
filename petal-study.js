(function(){
  'use strict';
  const flowers=['cosmos','daisy','poppy'],brushes=['pen','ink','pencil','dry','watercolor'];
  const names={cosmos:'코스모스',daisy:'데이지',poppy:'꽃양귀비',pen:'균일 펜',ink:'압력 잉크',pencil:'연필',dry:'드라이 브러시',watercolor:'수채'};
  const q=new URLSearchParams(location.search);
  const options=brush=>({brush,widthScale:Number(q.get('width')||1),texture:Number(q.get('texture')||60)/100,opacity:Number(q.get('opacity')||85)/100,strength:Number(q.get('petals')||65)/100});
  for(const [id,cw,ch,r] of [['large',300,330,105],['basic',200,120,23]]){
    const canvas=document.getElementById(id),ctx=canvas.getContext('2d');ctx.fillStyle='#f3f0e7';ctx.fillRect(0,0,canvas.width,canvas.height);
    flowers.forEach((flower,row)=>brushes.forEach((brush,col)=>{
      const x=col*cw,y=row*ch;ctx.fillStyle='#304b3e';ctx.font=(id==='large'?'17':'13')+'px system-ui';ctx.fillText(names[flower]+' / '+names[brush],x+18,y+29);
      FlowerArt.draw(ctx,flower,x+cw/2,y+(id==='large'?190:79),r,'271828',-.1,options(brush));
    }));
  }
  window.PETAL_STUDY={flowers,brushes,options};
})();
