/* Original deterministic plant model. No runtime dependencies. */
(function(root){
  'use strict';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
  function random(seed){
    let h=2166136261;
    for(const ch of String(seed)) h=Math.imul(h^ch.charCodeAt(0),16777619);
    return function(){h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  function createPlant(seed,index,x,y,density){
    const r=random(String(seed)+'|'+index), branches=[];
    const height=.20+r()*.17, hue=Math.floor(r()*3), d=Math.round(clamp(density,2,12));
    function grow(x1,y1,length,angle,depth,start){
      const x2=x1+Math.cos(angle)*length, y2=y1+Math.sin(angle)*length;
      branches.push({x1,y1,x2,y2,width:depth*.72+.6,start,leaf:depth<=2});
      if(depth>0){
        const spread=.30+r()*.34;
        grow(x2,y2,length*(.63+r()*.12),angle-spread,depth-1,start+.16);
        grow(x2,y2,length*(.63+r()*.12),angle+spread,depth-1,start+.16);
      }
    }
    grow(0,0,height*.37,-Math.PI/2+(r()-.5)*.18, d>8?5:d>4?4:3,0);
    return {x:clamp(x,.04,.96),y:clamp(y,.38,.94),height,hue,branches};
  }
  function layout(p,w,h){
    let min=0,max=0;for(const b of p.branches){min=Math.min(min,b.x1,b.x2);max=Math.max(max,b.x1,b.x2);}
    const scale=Math.min(h*1.9,w*1.9,(w-40)/Math.max(.01,max-min));
    return {scale,root:clamp(p.x*w,20-min*scale,w-20-max*scale)};
  }
  const api={random,createPlant,clamp,layout,MAX_PLANTS:32};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.GardenEngine=api;
})(typeof window!=='undefined'?window:globalThis);
