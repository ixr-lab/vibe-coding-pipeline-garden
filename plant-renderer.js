/* Bounded local sprite cache; growth samples at 8Hz, wind stays frame-based. */
(function(root){
  'use strict';
  const cache=new Map();let pixels=0;
  function clear(){cache.clear();pixels=0;}
  function sprite(p,s,scale){
    const age=s.reduced?6:Math.min(6,Math.max(0,Math.floor((s.time-p.born)*8)/8));
    const key=[s.seed,p.id,s.density,s.flower,s.brush,s.width,s.texture,s.opacity,scale.toFixed(4),age].join('|');
    if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
    let xmin=0,xmax=0,ymin=0;for(const b of p.branches){xmin=Math.min(xmin,b.x1,b.x2);xmax=Math.max(xmax,b.x1,b.x2);ymin=Math.min(ymin,b.y1,b.y2);}
    const pad=34,ox=-xmin*scale+pad,oy=-ymin*scale+pad;
    const canvas=document.createElement('canvas');canvas.width=Math.ceil((xmax-xmin)*scale+pad*2);canvas.height=Math.ceil(-ymin*scale+pad*2);
    const c=canvas.getContext('2d'),end=Math.max(...p.branches.map(b=>b.start));
    const terminals=p.branches.map((b,i)=>b.start===end?i:-1).filter(i=>i>=0);
    const flowers=new Set([.15,.5,.85].map(v=>terminals[Math.floor(v*terminals.length)]));
    p.branches.forEach((b,i)=>{
      const g=GardenEngine.clamp((age-b.start*3)/.6,0,1);if(!g)return;
      const x1=ox+b.x1*scale,y1=oy+b.y1*scale,x2=ox+(b.x1+(b.x2-b.x1)*g)*scale,y2=oy+(b.y1+(b.y2-b.y1)*g)*scale;
      BrushArt.draw(c,s.brush,{x1,y1,cx:x1+(x2-x1)*.28,cy:y2+(y1-y2)*.3,x2,y2},{width:b.width*.72*s.width,texture:s.texture/100,opacity:s.opacity/100,color:['#526b43','#637747','#7b7048'][p.hue],seed:s.seed+'|'+p.id+'|'+i});
      if(flowers.has(i)){
        const bloom=GardenEngine.clamp((age-b.start*3-.4)/.8,0,1);
        if(bloom)FlowerArt.draw(c,s.flower,x2,y2,Math.max(11,Math.min(23,scale*.022))*bloom,s.seed+'|'+p.id+'|'+i,Math.sin(i)*.13);
      }else if(b.leaf&&g>.65){
        const a=Math.atan2(y2-y1,x2-x1),size=(b.width+2.5)*Math.min(3.6,scale/300)*GardenEngine.clamp((g-.65)/.35,0,1);
        c.save();c.translate(x2,y2);c.rotate(a);c.fillStyle=['#537548dd','#819259dd','#b09b54dd'][p.hue];
        c.beginPath();c.moveTo(-1,0);c.bezierCurveTo(size*.25,-size*.6,size*.9,-size*.4,size*1.4,0);c.bezierCurveTo(size*.9,size*.4,size*.25,size*.6,-1,0);c.fill();c.restore();
      }
    });
    const result={canvas,ox,oy,area:canvas.width*canvas.height};
    while(cache.size&&(cache.size>=64||pixels+result.area>12000000)){const oldest=cache.keys().next().value;pixels-=cache.get(oldest).area;cache.delete(oldest);}
    if(result.area<=12000000){cache.set(key,result);pixels+=result.area;}
    return result;
  }
  function draw(ctx,p,s,w,h){
    const {scale,root:baseX,baseY}=GardenEngine.layout(p,w,h),im=sprite(p,s,scale);
    const sway=s.reduced?0:Math.sin(s.time*1.2+p.x*4)*s.wind*.00026;
    ctx.fillStyle='#3f58331a';ctx.beginPath();ctx.ellipse(baseX,baseY+2,17,3,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(baseX,baseY);ctx.transform(1,0,-sway,1,0,0);ctx.drawImage(im.canvas,-im.ox,-im.oy);ctx.restore();
  }
  root.PlantRenderer={draw,clear};
})(window);
