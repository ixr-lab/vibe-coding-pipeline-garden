/* Whole-plant ink studies. Geometry belongs to GardenEngine; only pigment lives here.
 * Growth is sampled at 8Hz. The frame-level shear never invalidates the sprite.
 */
(function(root){
  'use strict';
  const cache=new Map();let pixels=0;
  const clamp=(n,lo,hi)=>GardenEngine.clamp(n,lo,hi);
  function clear(){cache.clear();pixels=0;}
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
    const brush=s.brush||'ink',strength=brush==='pencil'?.39:brush==='watercolor'?.43:brush==='pen'?.68:brush==='dry'?.78:.94;
    const wash=c.createLinearGradient(0,-width*.15,length,bend);
    wash.addColorStop(0,'#3b413d');wash.addColorStop(.43,'#666c65');wash.addColorStop(1,'#91968b');
    c.save();
    c.globalAlpha=opacity*ink*strength;c.fillStyle=wash;c.fill(path);
    // A local wet heel leaves the outer contour unoutlined.
    c.clip(path);
    c.globalAlpha=opacity*ink*(brush==='watercolor'?.24:.16);c.fillStyle='#454b45';
    c.beginPath();c.ellipse(length*.23,-width*.05,length*(.14+r()*.12),width*(.35+r()*.21),-.13,0,Math.PI*2);c.fill();
    if(brush==='dry'&&texture>.01){
      c.globalCompositeOperation='destination-out';c.globalAlpha=.22+texture*.30;c.lineCap='butt';
      for(let i=0;i<2;i++){
        const start=length*(.17+r()*.32),end=Math.min(length*.89,start+length*(.18+r()*.22)),offset=(r()-.5)*width*.58;
        c.lineWidth=.65+texture*.8;c.beginPath();c.moveTo(start,offset);c.quadraticCurveTo((start+end)/2,offset+bend*.23,end,offset+bend*.52);c.stroke();
      }
      c.globalCompositeOperation='source-over';
    }
    if(brush==='pencil'){
      c.strokeStyle='#454c45';c.lineWidth=.45;c.globalAlpha=opacity*.35;
      for(let i=0;i<4;i++){
        const y=(r()-.5)*width*.58,start=length*(.1+r()*.3),end=length*(.64+r()*.27);
        c.beginPath();c.moveTo(start,y);c.quadraticCurveTo((start+end)*.5,y+bend*.2,end,bend*.65+y*.5);c.stroke();
      }
    }
    c.strokeStyle='#3f4840';c.lineWidth=brush==='pen'?.7:.5;c.globalAlpha=opacity*(brush==='watercolor'?.18:.30);
    c.beginPath();c.moveTo(length*.055,0);c.quadraticCurveTo(length*.43,-width*.04,length*.81,bend*.72);c.stroke();
    c.restore();
  }
  function leaf(c,kind,model,g,scale,ox,oy,s,seed){
    const length=model.length*scale*g,width=model.width*scale*g,bend=model.bend*scale*g;
    if(length<.1)return;
    c.save();c.translate(ox+model.x*scale,oy+model.y*scale);c.rotate(model.angle);
    if(kind==='cosmos'){
      // Unequal brushlets share a single mass instead of repeating endpoint feathers.
      [-.24,.20,0].forEach((angle,i)=>{
        c.save();c.translate(length*i*.07,0);c.rotate(angle);
        pigmentBlade(c,'cosmos',length*(i===2?.86:.75),width*(i===2?.57:.48),bend*.45,model.ink,s,seed+'|'+i);c.restore();
      });
    }else pigmentBlade(c,kind,length,width,bend,model.ink,s,seed);
    c.restore();
  }
  function mark(c,b,g,scale,ox,oy,s,seed,small=false){
    if(g<=0)return;
    const path=GardenEngine.partialCurve(mapped(b,scale,ox,oy),g),width=(b.width||1.1)*Math.max(.55,scale/1050)*s.width*(small?.72:1),opacity=s.opacity/100;
    // Absorbed pale pigment and the structural mark have separate jobs.
    BrushArt.draw(c,'watercolor',path,{width:width*1.65,texture:s.texture/100,opacity:opacity*.14,color:'#6d746a',seed:seed+'|wet'});
    BrushArt.draw(c,s.brush,path,{width,texture:s.texture/100,opacity:opacity*(small?.75:.92),color:b.role==='main'?'#454d46':'#626b60',seed});
    if(s.brush==='watercolor')BrushArt.draw(c,'ink',path,{width:width*.34,texture:.3,opacity:opacity*.50,color:'#586253',seed:seed+'|structure'});
  }
  function bud(c,b,g,scale,ox,oy,s){
    const radius=b.radius*scale*g,x=ox+(b.neckX+(b.x-b.neckX)*g)*scale,y=oy+(b.neckY+(b.y-b.neckY)*g)*scale;
    c.save();c.translate(x,y);c.rotate(b.tilt);c.globalAlpha=s.opacity/100;
    const wash=c.createLinearGradient(-radius*.4,0,radius*.6,-radius);
    wash.addColorStop(0,'#4d574d');wash.addColorStop(1,'#919889');c.fillStyle=wash;
    c.beginPath();c.moveTo(0,radius*.32);c.bezierCurveTo(-radius*.62,radius*.08,-radius*.70,-radius*.74,-radius*.08,-radius);c.bezierCurveTo(radius*.50,-radius*.93,radius*.53,-radius*.19,0,radius*.32);c.fill();
    c.strokeStyle='#424b42';c.lineWidth=Math.max(.45,radius*.055);c.globalAlpha=s.opacity/100*.56;
    c.beginPath();c.moveTo(0,radius*.23);c.quadraticCurveTo(-radius*.14,-radius*.32,-radius*.08,-radius*.80);c.stroke();c.restore();
  }
  function sprite(p,s,scale){
    const age=s.reduced?6:clamp(Math.floor((s.time-p.born)*8)/8,0,6);
    const key=[p.model,s.seed,p.id,s.density,s.flower,s.brush,s.mode,s.color,s.width,s.texture,s.opacity,s.petalStrength,scale.toFixed(4),age].join('|');
    if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit;}
    const bounds=GardenEngine.plantBounds(p),pad=18+Math.ceil(3.6*s.width*Math.max(.55,scale/1050)*1.6),ox=-bounds.minX*scale+pad,oy=-bounds.minY*scale+pad;
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil((bounds.maxX-bounds.minX)*scale+pad*2));canvas.height=Math.max(1,Math.ceil((bounds.maxY-bounds.minY)*scale+pad*2));
    const c=canvas.getContext('2d');
    p.branches.forEach((b,i)=>mark(c,b,clamp((age-b.start*3)/.82,0,1),scale,ox,oy,s,s.seed+'|'+p.id+'|stem|'+i));
    (p.leafGroups||[]).forEach(group=>{
      const grown=clamp((age-group.start*3)/.72,0,1);if(!grown)return;
      mark(c,{...group.petiole,width:1.35,role:'petiole'},grown,scale,ox,oy,s,s.seed+'|'+p.id+'|petiole|'+group.id,true);
      group.leaves.forEach((l,i)=>leaf(c,s.flower,l,clamp((age-l.start*3)/.8,0,1),scale,ox,oy,s,s.seed+'|'+p.id+'|leaf|'+group.id+'|'+i));
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
  root.PlantRenderer={draw,clear};
})(window);
