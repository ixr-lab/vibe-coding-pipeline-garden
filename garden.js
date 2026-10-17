/* Original Canvas garden. Time, geometry and motion remain separate. */
(function(){
  'use strict';
  const E=GardenEngine,$=id=>document.getElementById(id),canvas=$('garden'),ctx=canvas.getContext('2d');
  const query=new URLSearchParams(location.search), media=matchMedia('(prefers-reduced-motion: reduce)');
  const fixed=query.has('frame')?E.clamp(Number(query.get('frame')),0,36000)/60:null;
  const number=(key,fallback,min,max)=>query.has(key)&&Number.isFinite(Number(query.get(key)))?E.clamp(Number(query.get(key)),min,max):fallback;
  const state={seed:(query.get('seed')||'271828').slice(0,80),wind:number('wind',35,0,100),density:Math.round(number('density',7,2,12)),time:fixed??0,paused:false,reduced:media.matches,plants:[],next:0};
  state.flower=FlowerArt.kinds.includes(query.get("flower"))?query.get("flower"):"cosmos";
  state.mode=query.get('mode')==='ink'?'ink':'tint';
  const defaults={cosmos:'#9b6773',daisy:'#9e8c64',poppy:'#a05e50'};
  state.color=/^[0-9a-f]{6}$/i.test(query.get('color')||'')?'#'+query.get('color'):defaults[state.flower];
  state.brush=BrushArt.kinds.includes(query.get("brush"))?query.get("brush"):"ink";
  state.petalStrength=number('petals',65,0,100);
  state.width=number("width",1,.5,2.5);state.texture=number("texture",60,0,100);state.opacity=number("opacity",85,30,100);
  let w=1,h=1,last=null,raf=0,background=null,keyboard=false;
  const cursor={x:.5,y:.85};
  function announce(text){$('status').textContent=text;}
  function sync(){
    $('count').textContent=state.plants.length+' / 32 씨앗';$('edition').textContent=state.seed;
    $('mode').textContent=fixed!==null?'고정 기록':state.reduced?'고요한 정원':state.paused?'잠시 쉬는 중':'자라는 중';
    $('pause').textContent=state.paused?'계속 자라기':'일시정지';$('pause').setAttribute('aria-pressed',String(state.paused));
    $('reduced').checked=state.reduced;
  }
  function plant(x,y,initial=false,size=1){
    if(state.plants.length>=E.MAX_PLANTS){announce('정원이 가득 찼어요. 비우기로 새로 시작하세요.');return false;}
    const id=state.next++,data=E.createInkPlant(state.seed,id,x,y,state.density);
    state.plants.push({...data,id,size,born:initial?0:state.time-(state.reduced||fixed!==null?6:0)});
    sync();update();return true;
  }
  function restart(){
    state.seed=$('seed').value.trim().slice(0,80)||'271828';$('seed').value=state.seed;
    state.next=0;state.time=fixed??0;state.plants=[];
    [[.20,.90,.85],[.29,.86,1.06],[.50,.91,1.20],[.57,.87,.84],[.78,.90,.74]].forEach(([x,y,size])=>plant(x,y,true,size));
    sync();update();
  }
  function makeBackground(){
    background=document.createElement('canvas');background.width=Math.max(1,Math.round(w));background.height=Math.max(1,Math.round(h));
    const c=background.getContext('2d');
    // Empty paper is part of the composition; no landscape or per-pixel noise.
    c.fillStyle='#f6f3ea';c.fillRect(0,0,w,h);
  }
  function resize(){
    const b=canvas.getBoundingClientRect();w=b.width;h=b.height;
    const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);
    makeBackground();update();
  }
  function draw(showCursor=true){
    if(!background)return;
    // Fractional CSS heights may leave a partially covered final device row.
    // Paint an opaque base each time so repeated draws cannot accumulate alpha.
    ctx.fillStyle='#f6f3ea';ctx.fillRect(0,0,w+2,h+2);
    ctx.drawImage(background,0,0,w,h);
    for(const p of [...state.plants].sort((a,b)=>a.y-b.y))PlantRenderer.draw(ctx,p,state,w,h);
    if(keyboard&&showCursor){
      const x=cursor.x*w,y=cursor.y*h;ctx.strokeStyle='#354e3d';ctx.lineWidth=1.3;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(x-20,y);ctx.lineTo(x+20,y);ctx.moveTo(x,y-20);ctx.lineTo(x,y+20);ctx.stroke();
    }
  }
  function active(){return fixed===null&&!state.paused&&!state.reduced&&!document.hidden&&state.plants.length>0;}
  function loop(t){raf=0;if(!active()){last=null;return;}const dt=last===null?0:Math.min((t-last)/1000,.05);last=t;state.time+=dt;draw();raf=requestAnimationFrame(loop);}
  function update(){
    draw();
    if(active()){if(!raf)raf=requestAnimationFrame(loop);}
    else{if(raf)cancelAnimationFrame(raf);raf=0;last=null;}
  }
  function setReduced(value,source){
    const before=state.reduced;state.reduced=value;
    if(before&&!value)for(const p of state.plants)p.born=Math.min(p.born,state.time-6);
    $('motion-source').textContent=source;sync();update();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;keyboard=false;const b=canvas.getBoundingClientRect();
    if(plant((e.clientX-b.left)/w,(e.clientY-b.top)/h))announce('씨앗을 심었어요. 현재 '+state.plants.length+'개.');
  });
  canvas.addEventListener('focus',()=>{keyboard=true;draw();});
  canvas.addEventListener('blur',()=>{keyboard=false;draw();});
  canvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();keyboard=true;const step=e.shiftKey?.08:.025;
      cursor.x=E.clamp(cursor.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),.06,.94);
      cursor.y=E.clamp(cursor.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),.42,.92);
      announce('심기 위치: 가로 '+Math.round(cursor.x*100)+'%, 세로 '+Math.round(cursor.y*100)+'%.');draw();
    }else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat&&plant(cursor.x,cursor.y))announce('선택한 위치에 씨앗을 심었어요. 현재 '+state.plants.length+'개.');}
  });
  $('plant-center').addEventListener('click',()=>{if(plant(.5,.85))announce('가운데 씨앗을 심었어요. 현재 '+state.plants.length+'개.');});
  $('regenerate').addEventListener('click',()=>{restart();announce('이 번호로 정원을 다시 피웠어요.');});
  $('seed').addEventListener('keydown',e=>{if(e.key==='Enter'){restart();announce('정원을 다시 피웠어요.');}});
  $('wind').addEventListener('input',e=>{state.wind=+e.target.value;$('wind-value').value=state.wind;update();});
  $('density').addEventListener('input',e=>{state.density=+e.target.value;$('density-value').value=state.density;state.plants=state.plants.map(p=>({...E.createInkPlant(state.seed,p.id,p.x,p.y,state.density),id:p.id,size:p.size,born:p.born}));PlantRenderer.clear();update();});
  $('pause').addEventListener('click',()=>{state.paused=!state.paused;sync();update();announce(state.paused?'성장과 바람을 멈췄어요.':'성장과 바람을 다시 시작했어요.');});
  $('reset').addEventListener('click',()=>{state.plants=[];state.next=0;sync();update();announce('빈 정원이에요. 씨앗을 심어 보세요.');});
  $('reduced').addEventListener('change',e=>{setReduced(e.target.checked,'직접 선택');announce(e.target.checked?'움직임 없이 완성된 정원을 보여 드려요.':'정원 움직임을 켰어요.');});
  media.addEventListener('change',e=>setReduced(e.matches,e.matches?'시스템 설정':'시스템 설정 꺼짐'));
  document.addEventListener('visibilitychange',update);
  $('save').addEventListener('click',()=>{
    draw(false);const a=document.createElement('a');a.download='garden-'+state.seed.replace(/[^a-z0-9_-]/gi,'_').slice(0,40)+'.png';
    a.href=canvas.toDataURL('image/png');a.click();draw();announce('PNG 이미지를 저장했어요.');
  });
  $('seed').value=state.seed;$('wind').value=state.wind;$('density').value=state.density;$('wind-value').value=state.wind;$('density-value').value=state.density;
  $('fixed-note').hidden=fixed===null;
  if(fixed!==null)$('fixed-note').firstChild.textContent='성장 '+fixed+'초를 고정한 기록 화면입니다. ';
  $('motion-source').textContent=media.matches?'시스템 설정':'';
  function syncColor(){
    $('painting-mode').value=state.mode;$('flower-color').value=state.color;
    $('color-value').textContent=state.color.toUpperCase();
    $('color-help').textContent=state.mode==='ink'?'수묵은 색을 보관하고 먹의 농담으로 그립니다.':'고른 색을 꽃잎에 옅게 물들입니다.';
  }
  $('painting-mode').addEventListener('change',e=>{state.mode=e.target.value;syncColor();PlantRenderer.clear();update();announce(state.mode==='ink'?'수묵으로 그렸어요.':'선택한 색의 담채로 그렸어요.');});
  $('flower-color').addEventListener('input',e=>{state.color=e.target.value;syncColor();PlantRenderer.clear();update();});
  $('restore-color').addEventListener('click',()=>{state.color=defaults[state.flower];syncColor();PlantRenderer.clear();update();announce('선택한 꽃의 기본 담채색을 복원했어요.');});
  syncColor();
  for(const [id,key,output] of [['flower','flower'],['brush','brush'],['stroke-width','width','width-value'],['texture','texture','texture-value'],['opacity','opacity','opacity-value'],['petal-strength','petalStrength','petal-value']]){
    $(id).value=state[key];if(output)$(output).value=state[key];
    $(id).addEventListener(id==='flower'||id==='brush'?'change':'input',e=>{state[key]=output?+e.target.value:e.target.value;if(output)$(output).value=state[key];PlantRenderer.clear();update();});
  }
  if(matchMedia('(max-width:760px)').matches)document.querySelector('.material-drawer').open=false;
  restart();new ResizeObserver(resize).observe(canvas);
})();
