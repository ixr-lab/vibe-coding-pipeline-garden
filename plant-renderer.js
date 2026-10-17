/* Whole-plant ink studies. Geometry belongs to GardenEngine; only pigment lives here.
 * Growth is sampled at 8Hz. The frame-level shear never invalidates the sprite.
 */
(function(root){
  'use strict';
  const cache=new Map();let pixels=0;
  const clamp=(n,lo,hi)=>GardenEngine.clamp(n,lo,hi);
  function clear(){cache.clear();pixels=0;}
  function foliageGrowth(group,age){
    return {petiole:clamp((age-group.start*3)/.72,0,1),leaves:group.leaves.map(l=>clamp((age-l.start*3-.72)/.8,0,1))};
  }
  function mapped(b,scale,ox,oy){
    return {x1:ox+b.x1*scale,y1:oy+b.y1*scale,cx:ox+(Number.isFinite(b.cx)?b.cx:(b.x1+b.x2)/2)*scale,cy:oy+(Number.isFinite(b.cy)?b.cy:(b.y1+b.y2)/2)*scale,x2:ox+b.x2*scale,y2:oy+b.y2*scale};
  }
  function bladePath(kind,length,width,bend){
    const p=new Path2D();p.moveTo(0,0);
    if(kind==='poppy'){
      // Rounded changes of pressure form lobes, without repeated triangular teeth.
      p.bezierCurveTo(length*.12,-width*.13,length*.15,-width*.60,length*.25,-width*.63);
      p.quadraticCurveTo(length*.32,-width*.85,length*.39,-width*.43);
      p.quadraticCurveTo(length*.47,-width*.75,length*.55,-width*.40);
      p.quadraticCurveTo(length*.65,-width*.60,length*.73,-width*.25+bend*.5);
      p.quadraticCurveTo(length*.88,-width*.20+bend*.7,length,bend);
      p.quadraticCurveTo(length*.74,width*.35+bend*.7,length*.66,width*.27);
      p.quadraticCurveTo(length*.56,width*.62,length*.48,width*.39);
      p.quadraticCurveTo(length*.37,width*.75,length*.29,width*.45);
      p.bezierCurveTo(length*.21,width*.62,length*.10,width*.13,0,0);
    }else{
      // Light entry, a broad middle under pressure, then a released pointed tip.
      p.bezierCurveTo(length*.13,-width*.16,length*.38,-width*.76,length*.62,-width*.52+bend*.4);
      p.quadraticCurveTo(length*.86,-width*.25+bend*.7,length,bend);
      p.bezierCurveTo(length*.73,width*.52+bend*.7,length*.27,width*.60,0,0);
    }
    p.closePath();return p;
  }
  function pigmentBlade(c,kind,length,width,bend,ink,s,seed){
    const path=bladePath(kind,length,width,bend),r=GardenEngine.random(seed),opacity=clamp(s.opacity/100,0,1),texture=clamp(s.texture/100,0,1);
    const brush=s.brush||'ink',strength=brush==='pencil'?.14:brush==='watercolor'?.48:brush==='pen'?.77:brush==='dry'?.82:.98;
    c.save();
    // A leaf is one pigment plane. Depth comes from the group in front or
    // behind it, rather than identical lit-to-dark gradients on every blade.
    c.globalAlpha=clamp(opacity*ink*strength,0,1);c.fillStyle=brush==='pen'?'#585858':brush==='watercolor'?'#676767':'#494949';c.fill(path);
    c.clip(path);
    if(brush==='ink'&&ink>.68&&r()>.45){
      c.globalAlpha=clamp(opacity*ink*.18,0,1);c.fillStyle='#3c3c3c';
      c.beginPath();c.ellipse(length*.13,0,length*.10,width*.18,0,0,Math.PI*2);c.fill();
    }
    if(brush==='dry'&&texture>.01){
      c.globalCompositeOperation='destination-out';c.globalAlpha=.30+texture*.34;c.lineCap='butt';
      for(let i=0;i<2;i++){
        const start=length*(.15+r()*.34),end=Math.min(length*.84,start+length*(.12+r()*.24)),offset=(r()-.5)*width*.58;
        c.lineWidth=.55+texture*1.15;c.beginPath();c.moveTo(start,offset);c.quadraticCurveTo((start+end)/2,offset+bend*.23,end,offset+bend*.52);c.stroke();
      }
      c.globalCompositeOperation='source-over';
    }
    if(brush==='pencil'){
      c.strokeStyle='#515151';c.lineWidth=.43;c.globalAlpha=clamp(opacity*ink*.62,0,1);
      for(let i=0;i<8;i++){
        const y=(r()-.5)*width*.95,start=length*(.04+r()*.30),end=length*(.50+r()*.43);
        c.beginPath();c.moveTo(start,y);c.quadraticCurveTo((start+end)*.5,y+bend*.2,end,bend*.65+y*.5);c.stroke();
      }
    }
    if(brush==='watercolor'){
      // A few soft, unequal losses interrupt the boundary. They are an alpha
      // mask over a single wash, not extra shaded facets on top of the leaf.
      c.globalCompositeOperation='destination-out';
      for(let i=0;i<3;i++){
        const x=length*(.22+r()*.62),y=(i%2?1:-1)*width*(.35+r()*.18)+bend*x/length;
        c.save();c.translate(x,y);c.scale(length*(.10+r()*.10),width*(.24+r()*.25));
        const fade=c.createRadialGradient(0,0,0,0,0,1);fade.addColorStop(0,'#000000b3');fade.addColorStop(1,'#00000000');
        c.globalAlpha=.35+texture*.28;c.fillStyle=fade;c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fill();c.restore();
      }
      c.globalCompositeOperation='source-over';
    }
    if(brush==='pen'||brush==='pencil'){
      c.strokeStyle='#484848';c.lineWidth=brush==='pen'?.65:.42;c.globalAlpha=clamp(opacity*ink*.33,0,1);
      c.beginPath();c.moveTo(length*.04,0);c.quadraticCurveTo(length*.25,-width*.025,length*.61,bend*.46);c.stroke();
    }
    c.restore();
  }
  function dividedLeaf(c,length,width,bend,ink,s,seed,support){
    const r=GardenEngine.random(seed+'|divided'),weight=Math.max(.48,Math.min(1.35,length*.016))*s.width;
    const material={texture:s.texture/100,opacity:clamp(s.opacity/100*ink*.94,0,1),color:support?'#494949':'#777777'};
    const axis={x1:0,y1:0,cx:length*.49,cy:bend*.17,x2:length*.97,y2:bend};
    const stroke=(path,width,id)=>BrushArt.draw(c,s.brush,path,{...material,width,seed:seed+'|division|'+id});
    stroke(axis,weight,'axis');
    const count=support?4:5;
    for(let i=0;i<count;i++){
      // Alternating unequal lobes grow along a curve. A few fine forks provide
      // divided foliage without a repeated paired feather or a bamboo blade.
      const t=(i+.35+r()*.35)/count,p=GardenEngine.pointOnCurve(axis,t),side=i%2?1:-1;
      const span=width*(.55+r()*.38)*(1-t*.35),reach=length*(.11+(1-t)*.14)*(.75+r()*.40);
      const path={x1:p.x,y1:p.y,cx:p.x+reach*.48,cy:p.y+side*span*.28,x2:Math.min(length*1.05,p.x+reach),y2:p.y+side*span};
      const pressure=support&&i<3?Math.max(1.65,Math.min(5.5,width*(.19+r()*.075)))*s.width:weight*(.65+r()*.28);
      stroke(path,pressure,i);
      if(i===1||i===count-2){
        const node=GardenEngine.pointOnCurve(path,.64);
        stroke({x1:node.x,y1:node.y,cx:node.x+reach*.19,cy:node.y+side*span*.04,x2:node.x+reach*.39,y2:node.y+side*span*.18},weight*.53,i+'-fork');
      }
    }
    if(s.brush==='pencil'||s.brush==='watercolor')BrushArt.draw(c,'pen',axis,{width:Math.max(.4,weight*.44),texture:.1,opacity:material.opacity*.45,color:'#737373',seed:seed+'|connection'});
  }
  function leaf(c,kind,model,g,scale,ox,oy,s,seed,depth){
    const length=model.length*scale*g*(kind==='daisy'?1.04:kind==='poppy'?.82:1),width=model.width*scale*g*(kind==='daisy'?.78:kind==='poppy'?1.18:1),bend=model.bend*scale*g;
    if(length<.1)return;
    c.save();c.translate(ox+model.x*scale,oy+model.y*scale);c.rotate(model.angle);
    if(kind==='cosmos')dividedLeaf(c,length,width,bend,model.ink*depth,s,seed,depth>.8);
    else pigmentBlade(c,kind,length,width,bend,model.ink*depth,s,seed);
    c.restore();
  }
  function mark(c,b,g,scale,ox,oy,s,seed,small=false){
    if(g<=0)return;
    const path=GardenEngine.partialCurve(mapped(b,scale,ox,oy),g),width=(b.width||1.1)*Math.max(.55,scale/1050)*s.width*(small?.72:1),opacity=s.opacity/100;
    // Absorbed pale pigment and the structural mark have separate jobs.
    BrushArt.draw(c,'watercolor',path,{width:width*1.65,texture:s.texture/100,opacity:opacity*.12,color:'#747474',seed:seed+'|wet'});
    BrushArt.draw(c,s.brush,path,{width,texture:s.texture/100,opacity:opacity*(small?.75:.92),color:b.role==='main'?'#494949':'#6b6b6b',seed});
    if(s.brush==='watercolor'||s.brush==='pencil')BrushArt.draw(c,'pen',path,{width:Math.max(.46,width*.25),texture:.12,opacity:opacity*(small?.36:.48),color:'#6a6a6a',seed:seed+'|structure'});
  }
  function bud(c,b,g,scale,ox,oy,s){
    const radius=b.radius*scale*g,x=ox+(b.neckX+(b.x-b.neckX)*g)*scale,y=oy+(b.neckY+(b.y-b.neckY)*g)*scale;
    c.save();c.translate(x,y);c.rotate(b.tilt);c.globalAlpha=s.opacity/100;
    c.fillStyle='#727272';
    c.beginPath();c.moveTo(0,radius*.32);c.bezierCurveTo(-radius*.62,radius*.08,-radius*.70,-radius*.74,-radius*.08,-radius);c.bezierCurveTo(radius*.50,-radius*.93,radius*.53,-radius*.19,0,radius*.32);c.fill();
    c.strokeStyle='#4a4a4a';c.lineWidth=Math.max(.45,radius*.055);c.globalAlpha=s.opacity/100*.56;
    c.beginPath();c.moveTo(0,radius*.23);c.quadraticCurveTo(-radius*.14,-radius*.32,-radius*.08,-radius*.80);c.stroke();c.restore();
  }
  function sprite(p,s,scale){
    const age=s.reduced?6:clamp(Math.floor((s.time-p.born)*8)/8,0,6);
    const key=[p.model,s.seed,p.id,s.density,s.flower,s.brush,s.mode,s.mode==='ink'?'':s.color,s.width,s.texture,s.opacity,s.petalStrength,scale.toFixed(4),age].join('|');
    if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
    const bounds=GardenEngine.plantBounds(p),pad=18+Math.ceil(3.6*s.width*Math.max(.55,scale/1050)*1.6),ox=-bounds.minX*scale+pad,oy=-bounds.minY*scale+pad;
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil((bounds.maxX-bounds.minX)*scale+pad*2));canvas.height=Math.max(1,Math.ceil((bounds.maxY-bounds.minY)*scale+pad*2));
    const c=canvas.getContext('2d');
    p.branches.forEach((b,i)=>mark(c,b,clamp((age-b.start*3)/.82,0,1),scale,ox,oy,s,s.seed+'|'+p.id+'|stem|'+i));
    (p.leafGroups||[]).forEach(group=>{
      const growth=foliageGrowth(group,age);if(!growth.petiole)return;
      const foreground=group.role==='body'&&group.position<.5,depth=foreground?1.08:group.role==='density'?.43:group.position>.67?.37:.58;
      mark(c,{...group.petiole,width:1.35,role:'petiole'},growth.petiole,scale,ox,oy,s,s.seed+'|'+p.id+'|petiole|'+group.id,true);
      group.leaves.forEach((l,i)=>leaf(c,s.flower,l,growth.leaves[i],scale,ox,oy,s,s.seed+'|'+p.id+'|leaf|'+group.id+'|'+i,depth*(i?.67:1)));
      if(foreground&&growth.petiole===1){
        c.save();c.fillStyle='#494949';c.globalAlpha=s.opacity/100*.25;
        c.beginPath();c.arc(ox+group.petiole.x1*scale,oy+group.petiole.y1*scale,Math.max(.6,scale/1300),0,Math.PI*2);c.fill();c.restore();
      }
    });
    (p.blooms||[]).forEach((b,i)=>{
      const grown=clamp((age-b.start*3-.10)/.85,0,1);if(!grown)return;
      if(b.pose==='bud'){bud(c,b,grown,scale,ox,oy,s);return;}
      const x=ox+(b.neckX+(b.x-b.neckX)*grown)*scale,y=oy+(b.neckY+(b.y-b.neckY)*grown)*scale;
      FlowerArt.draw(c,s.flower,x,y,b.radius*scale*grown,s.seed+'|'+p.id+'|bloom|'+i,b.tilt,{brush:s.brush,widthScale:s.width,texture:s.texture/100,opacity:s.opacity/100,strength:s.petalStrength/100,mode:s.mode||'ink',color:s.color||'#a66b72',pose:b.pose});
    });
    const result={canvas,ox,oy,area:canvas.width*canvas.height};
    while(cache.size&&(cache.size>=64||pixels+result.area>12000000)){const oldest=cache.keys().next().value;pixels-=cache.get(oldest).area;cache.delete(oldest);}
    if(result.area<=12000000){cache.set(key,result);pixels+=result.area;}
    return result;
  }
  function draw(ctx,p,s,w,h){
    const {scale,root:baseX,baseY}=GardenEngine.layout(p,w,h),im=sprite(p,s,scale);
    const sway=s.reduced?0:Math.sin(s.time*1.2+p.x*4)*s.wind*.00026;
    ctx.save();ctx.translate(baseX,baseY);ctx.transform(1,0,-sway,1,0,0);ctx.drawImage(im.canvas,-im.ox,-im.oy);ctx.restore();
  }
  root.PlantRenderer={draw,clear,foliageGrowth};
})(window);
