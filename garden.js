/* Original Canvas garden. Time, geometry and motion remain separate. */
(function(){
  'use strict';
  const E=GardenEngine,$=id=>document.getElementById(id),canvas=$('garden'),ctx=canvas.getContext('2d');
  const query=new URLSearchParams(location.search), media=matchMedia('(prefers-reduced-motion: reduce)');
  const fixed=query.has('frame')?E.clamp(Number(query.get('frame')),0,36000)/60:null;
  const number=(key,fallback,min,max)=>query.has(key)?E.clamp(Number(query.get(key)),min,max):fallback;
  const state={seed:(query.get('seed')||'271828').slice(0,80),wind:number('wind',35,0,100),density:Math.round(number('density',7,2,12)),time:fixed??0,paused:false,reduced:media.matches,plants:[],next:0};
  let w=1,h=1,last=null,raf=0,background=null,keyboard=false;
  const cursor={x:.5,y:.85};
  function announce(text){$('status').textContent=text;}
  function sync(){
    $('count').textContent=state.plants.length+' / 32 씨앗';$('edition').textContent=state.seed;
    $('mode').textContent=fixed!==null?'고정 기록':state.reduced?'고요한 정원':state.paused?'잠시 쉬는 중':'자라는 중';
    $('pause').textContent=state.paused?'계속 자라기':'일시정지';$('pause').setAttribute('aria-pressed',String(state.paused));
    $('reduced').checked=state.reduced;
  }
  function plant(x,y,initial=false){
    if(state.plants.length>=E.MAX_PLANTS){announce('정원이 가득 찼어요. 비우기로 새로 시작하세요.');return false;}
    const id=state.next++,data=E.createPlant(state.seed,id,x,y,state.density);
    state.plants.push({...data,id,born:initial?0:state.time-(state.reduced||fixed!==null?6:0)});
    sync();update();return true;
  }
  function restart(){
    state.seed=$('seed').value.trim().slice(0,80)||'271828';$('seed').value=state.seed;
    state.next=0;state.time=fixed??0;state.plants=[];
    [[.17,.87],[.33,.79],[.51,.9],[.69,.82],[.84,.91]].forEach(([x,y])=>plant(x,y,true));
    sync();update();
  }
  function makeBackground(){
    background=document.createElement('canvas');background.width=Math.max(1,Math.round(w));background.height=Math.max(1,Math.round(h));
    const c=background.getContext('2d'),sky=c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#edeedf');sky.addColorStop(.7,'#e1e6cf');sky.addColorStop(1,'#cbd7b5');c.fillStyle=sky;c.fillRect(0,0,w,h);
    c.fillStyle='#f7f3dd';c.beginPath();c.arc(w*.77,h*.24,Math.min(w,h)*.10,0,Math.PI*2);c.fill();
    c.strokeStyle='#cbd1bd';c.lineWidth=.6;c.beginPath();c.moveTo(0,h*.73);c.bezierCurveTo(w*.25,h*.65,w*.62,h*.89,w,h*.72);c.stroke();
    c.fillStyle='#d0d9bd';c.beginPath();c.moveTo(0,h*.87);c.bezierCurveTo(w*.3,h*.72,w*.6,h*.92,w,h*.81);c.lineTo(w,h);c.lineTo(0,h);c.fill();
    const texture=E.random('paper-2718');
    for(let i=0;i<750;i++){c.fillStyle=i%3?'#526b3d12':'#faf5db50';c.fillRect(texture()*w,texture()*h,1,1);}
    c.fillStyle='#536f4240';const grass=E.random('meadow');
    for(let i=0;i<90;i++){const x=grass()*w,y=h*(.87+grass()*.10);c.fillRect(x,y,1,1+grass()*3);}
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
    ctx.fillStyle='#cbd7b5';ctx.fillRect(0,0,w+2,h+2);
    ctx.drawImage(background,0,0,w,h);
    for(const p of [...state.plants].sort((a,b)=>a.y-b.y)){
      const age=state.reduced?6:state.time-p.born;
      const sway=state.reduced?0:Math.sin(state.time*1.2+p.x*4)*state.wind*.00026;
      const {scale,root,baseY}=E.layout(p,w,h);
      ctx.fillStyle='#3f58331a';ctx.beginPath();ctx.ellipse(root,baseY+2,17,3,0,0,Math.PI*2);ctx.fill();
      for(const b of p.branches){
        const g=E.clamp((age-b.start*3)/.6,0,1);if(!g)continue;
        const x1=root+(b.x1+sway*(-b.y1))*scale,y1=baseY+b.y1*scale;
        const x2=root+(b.x1+(b.x2-b.x1)*g+sway*(-b.y2))*scale,y2=baseY+(b.y1+(b.y2-b.y1)*g)*scale;
        ctx.strokeStyle=['#526b43','#637747','#7b7048'][p.hue];ctx.lineWidth=b.width*.72;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(x1+(x2-x1)*.28,y2+(y1-y2)*.3,x2,y2);ctx.stroke();
        if(b.leaf&&g>.65){
          const a=Math.atan2(y2-y1,x2-x1),size=(b.width+2.5)*Math.min(3.6,scale/300)*E.clamp((g-.65)/.35,0,1);
          ctx.save();ctx.translate(x2,y2);ctx.rotate(a);ctx.fillStyle=['#537548dd','#819259dd','#b09b54dd'][p.hue];
          ctx.beginPath();ctx.moveTo(-1,0);ctx.bezierCurveTo(size*.25,-size*.6,size*.9,-size*.4,size*1.4,0);ctx.bezierCurveTo(size*.9,size*.4,size*.25,size*.6,-1,0);ctx.fill();
          ctx.strokeStyle='#f0eed15c';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size*1.15,0);ctx.stroke();ctx.restore();
        }
      }
    }
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
  $('density').addEventListener('input',e=>{state.density=+e.target.value;$('density-value').value=state.density;state.plants=state.plants.map(p=>({...E.createPlant(state.seed,p.id,p.x,p.y,state.density),id:p.id,born:p.born}));update();});
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
  restart();new ResizeObserver(resize).observe(canvas);
})();
