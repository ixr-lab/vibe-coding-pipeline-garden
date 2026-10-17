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
  function pointOnCurve(b,t){
    t=clamp(t,0,1);const u=1-t,cx=Number.isFinite(b.cx)?b.cx:(b.x1+b.x2)/2,cy=Number.isFinite(b.cy)?b.cy:(b.y1+b.y2)/2;
    const dx=2*(u*(cx-b.x1)+t*(b.x2-cx)),dy=2*(u*(cy-b.y1)+t*(b.y2-cy)),length=Math.hypot(dx,dy)||1;
    return {x:u*u*b.x1+2*u*t*cx+t*t*b.x2,y:u*u*b.y1+2*u*t*cy+t*t*b.y2,tx:dx/length,ty:dy/length};
  }
  // The first half of a growing mark must retain the original quadratic, not
  // pull its endpoint along a straight chord while inventing a new control.
  function partialCurve(b,t){
    t=clamp(t,0,1);const end=pointOnCurve(b,t);
    return {x1:b.x1,y1:b.y1,cx:b.x1+(b.cx-b.x1)*t,cy:b.y1+(b.cy-b.y1)*t,x2:end.x,y2:end.y};
  }
  function createInkPlant(seed,index,x,y,density){
    const r=random(String(seed)+'|ink-plant|'+index),branches=[],leafGroups=[],blooms=[];
    const height=.30+r()*.09,lean=(r()-.5)*.46,side=lean<0?-1:1,hue=Math.floor(r()*3);
    const d=Math.round(clamp(density,2,12));
    function segment(role,x1,y1,cx,cy,x2,y2,width,start){
      const b={x1,y1,cx,cy,x2,y2,width,start,leaf:false,role};branches.push(b);return b;
    }
    const main=[];
    main.push(segment('main',0,0,height*(-lean*.4+side*.025),-height*.20,height*lean*.36,-height*.40,3.6,0));
    let previous=main[0];
    main.push(segment('main',previous.x2,previous.y2,previous.x2+(previous.x2-previous.cx)*.62,previous.y2+(previous.y2-previous.cy)*.62,height*(lean*.74+side*.035),-height*.74,2.85,.26));
    previous=main[1];
    main.push(segment('main',previous.x2,previous.y2,previous.x2+(previous.x2-previous.cx)*.62,previous.y2+(previous.y2-previous.cy)*.62,height*(lean+side*.035),-height,1.9,.52));
    function along(path,t){
      const at=clamp(t,0,.999999)*path.length,i=Math.floor(at),local=at-i;
      return {...pointOnCurve(path[i],local),start:path[i].start+local*.26};
    }
    const a=along(main,.31+r()*.045),secondary=[];
    secondary.push(segment('secondary',a.x,a.y,a.x-side*height*.08,a.y-height*.075,a.x-side*height*.17,a.y-height*.18,2.5,a.start+.10));
    previous=secondary[0];
    secondary.push(segment('secondary',previous.x2,previous.y2,previous.x2+(previous.x2-previous.cx)*.78,previous.y2+(previous.y2-previous.cy)*.78,a.x-side*height*(.27+r()*.055),a.y-height*(.36+r()*.035),1.55,a.start+.34));
    function bloom(path,pose,factor=1){
      const b=path.at(-1),point=pointOnCurve(b,1),radius=height*(.074+r()*.012)*factor;
      blooms.push({branchIndex:branches.indexOf(b),neckX:b.x2,neckY:b.y2,x:b.x2+point.tx*radius*.30,y:b.y2+point.ty*radius*.30,radius,tilt:Math.atan2(point.ty,point.tx)+Math.PI/2,pose,start:b.start+.28});
    }
    bloom(main,['threeQuarter','side','droop','threeQuarter','side'][Math.abs(index)%5]);
    if(Math.abs(index)%2===1)bloom(secondary,Math.abs(index)%4===1?'threeQuarter':'side',.78);
    const bud=[];
    if(r()>.38){
      const node=along(main,.48),bend=-side,midX=node.x+bend*height*.17,midY=node.y-height*.20;
      bud.push(segment('bud',node.x,node.y,node.x+bend*height*.11,node.y-height*.07,midX,midY,1.75,node.start+.16));
      previous=bud[0];
      bud.push(segment('bud',midX,midY,midX+(midX-previous.cx)*.75,midY+(midY-previous.cy)*.75,midX+bend*height*.075,midY-height*.038,1.05,node.start+.39));
      bloom(bud,'bud',.36);
    }
    // Independent random streams keep the scaffold and flower poses invariant
    // while density reveals further, bounded foliage groups.
    function foliage(path,position,groupSide,role,id,atTip=false){
      const q=random(String(seed)+'|ink-leaves|'+index+'|'+id),node=along(path,position),lower=1-position;
      const angle=-Math.PI/2+groupSide*(.98+q()*.36),length=height*(.083+lower*.055),endX=node.x+Math.cos(angle)*length,endY=node.y+Math.sin(angle)*length;
      const petiole={x1:node.x,y1:node.y,cx:node.x+Math.cos(angle-.16*groupSide)*length*.54,cy:node.y+Math.sin(angle-.16*groupSide)*length*.54,x2:endX,y2:endY};
      const group={id,role,position,side:groupSide,start:node.start+.12,petiole,leaves:[]};
      for(let j=0;j<3;j++){
        const terminal=j===2,at=terminal?1:.27+j*.36,p=pointOnCurve(petiole,at);
        const spread=terminal?0:(j?1:-1)*groupSide*(.61+q()*.23);
        const leafLength=height*(.105+lower*.105)*(terminal?1.05:.83+q()*.15)*(atTip?.85:1);
        group.leaves.push({x:p.x,y:p.y,angle:angle+spread+(q()-.5)*.17,length:leafLength,width:leafLength*(.27+q()*.105),bend:(q()-.5)*leafLength*.22,ink:.58+q()*.35,start:group.start+j*.045});
      }
      leafGroups.push(group);
    }
    [.24,.42,.60,.73].forEach((t,i)=>foliage(main,t+(r()-.5)*.018,i%2?-side:side,'body','body-'+i));
    foliage(secondary,.44,side,'secondary','secondary');
    const extra=Math.floor(d/2)-1;
    for(let i=0;i<extra;i++){
      const path=i%3===1?secondary:main,position=.19+i*.105;
      foliage(path,position,i%2?side:-side,'density','extra-'+i,true);
    }
    for(let i=0;i<Math.floor((d-2)/4);i++){
      const node=along(main,.35+i*.19),twigSide=i%2?-side:side;
      segment('twig',node.x,node.y,node.x+twigSide*height*.045,node.y-height*.025,node.x+twigSide*height*.085,node.y-height*.09,1.15,node.start+.22);
    }
    return {model:'ink-v1',x:clamp(x,.04,.96),y:clamp(y,.38,.94),height,hue,branches,leafGroups,blooms};
  }
  function plantBounds(p){
    let minX=0,maxX=0,minY=0,maxY=0;
    function include(x,y){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    for(const b of p.branches){include(b.x1,b.y1);include(b.x2,b.y2);if(Number.isFinite(b.cx))include(b.cx,b.cy);}
    for(const group of p.leafGroups||[]){
      const b=group.petiole;include(b.x1,b.y1);include(b.cx,b.cy);include(b.x2,b.y2);
      for(const leaf of group.leaves){
        const c=Math.cos(leaf.angle),s=Math.sin(leaf.angle),extent=leaf.width+Math.abs(leaf.bend);
        for(const xx of [0,leaf.length*1.10])for(const yy of [-extent,extent])include(leaf.x+xx*c-yy*s,leaf.y+xx*s+yy*c);
      }
    }
    for(const b of p.blooms||[]){const r=b.radius*1.22;include(b.x-r,b.y-r);include(b.x+r,b.y+r);}
    return {minX,maxX,minY,maxY};
  }
  function layout(p,w,h){
    if(p.model==='ink-v1'){
      const b=plantBounds(p),wind=Math.max(Math.abs(b.minY),Math.abs(b.maxY))*.027;
      const min=b.minX-wind,max=b.maxX+wind,size=clamp(Number.isFinite(p.size)?p.size:1,.35,1.5);
      const scale=Math.min(h*1.70*size,w*3.2*size,Math.max(1,w-40)/Math.max(.01,max-min),Math.max(1,h-70)/Math.max(.01,b.maxY-b.minY));
      return {scale,root:clamp(p.x*w,20-min*scale,w-20-max*scale),baseY:clamp(p.y*h,38-b.minY*scale,h-30-b.maxY*scale)};
    }
    let min=0,max=0,top=0;for(const b of p.branches){min=Math.min(min,b.x1,b.x2);max=Math.max(max,b.x1,b.x2);top=Math.min(top,b.y1,b.y2);}
    const scale=Math.min(h*1.9,w*1.9,Math.max(1,w-60)/Math.max(.01,max-min),Math.max(1,h-105)/Math.max(.01,-top));
    return {scale,root:clamp(p.x*w,30-min*scale,w-30-max*scale),baseY:clamp(p.y*h,60-top*scale,h-45)};
  }
  const api={random,createPlant,createInkPlant,pointOnCurve,partialCurve,plantBounds,clamp,layout,MAX_PLANTS:32};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.GardenEngine=api;
})(typeof window!=='undefined'?window:globalThis);
