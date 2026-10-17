/* v0: executable minimum, intentionally simple line/circle renderer. */
(function(){
  'use strict';
  const E=GardenEngine,$=id=>document.getElementById(id),canvas=$('garden'),ctx=canvas.getContext('2d');
  const q=new URLSearchParams(location.search), fixed=q.has('frame')?E.clamp(Number(q.get('frame')),0,36000)/60:null;
  const state={seed:q.get('seed')||'271828',wind:E.clamp(Number(q.get('wind')||35),0,100),density:E.clamp(Number(q.get('density')||7),2,12),time:fixed??0,paused:false,plants:[],next:0};
  let w=1,h=1,last=0;
  function announce(text){$('status').textContent=text;}
  function sync(){ $('count').textContent=state.plants.length+' / 32 씨앗';$('edition').textContent=state.seed;$('mode').textContent=state.paused?'잠시 쉬는 중':'자라는 중';$('pause').textContent=state.paused?'계속 자라기':'일시정지';$('pause').setAttribute('aria-pressed',String(state.paused)); }
  function plant(x,y,instant=false){
    if(state.plants.length>=E.MAX_PLANTS){announce('정원이 가득 찼어요. 비우기로 새로 시작하세요.');return;}
    const data=E.createPlant(state.seed,state.next++,x,y,state.density);
    state.plants.push({...data,born:instant?0:state.time});sync();
  }
  function restart(){state.seed=$('seed').value.trim()||'271828';$('seed').value=state.seed;state.next=0;state.time=fixed??0;state.plants=[];[[.17,.87],[.33,.79],[.51,.9],[.69,.82],[.84,.91]].forEach(([x,y])=>plant(x,y,true));sync();draw();}
  function resize(){const b=canvas.getBoundingClientRect();w=b.width;h=b.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);draw();}
  function draw(){
    ctx.fillStyle='#e9ecdf';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#ced5c0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h*.94);ctx.lineTo(w,h*.94);ctx.stroke();
    for(const p of state.plants){
      const age=state.time-p.born, sway=Math.sin(state.time*1.2+p.x*4)*state.wind*.0002;
      for(const b of p.branches){
        const g=E.clamp((age-b.start*3)/.6,0,1);if(!g)continue;
        const x1=(p.x+b.x1+sway*(-b.y1))*w,y1=(p.y+b.y1)*h,x2=(p.x+b.x1+(b.x2-b.x1)*g+sway*(-b.y2))*w,y2=(p.y+b.y1+(b.y2-b.y1)*g)*h;
        ctx.strokeStyle='#5d7754';ctx.lineWidth=b.width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        if(b.leaf&&g>.8){ctx.fillStyle='#78905d';ctx.beginPath();ctx.arc(x2,y2,3.7,0,Math.PI*2);ctx.fill();}
      }
    }
  }
  function loop(t){const dt=last?Math.min((t-last)/1000,.05):0;last=t;if(!state.paused&&fixed===null){state.time+=dt;draw();}requestAnimationFrame(loop);}
  canvas.addEventListener('pointerdown',e=>{const b=canvas.getBoundingClientRect();plant((e.clientX-b.left)/w,(e.clientY-b.top)/h);announce('씨앗을 심었어요.');draw();});
  $('regenerate').addEventListener('click',()=>{restart();announce('같은 번호로 정원을 다시 피웠어요.');});
  $('seed').addEventListener('keydown',e=>{if(e.key==='Enter'){restart();announce('정원을 다시 피웠어요.');}});
  $('wind').addEventListener('input',e=>{state.wind=+e.target.value;$('wind-value').value=state.wind;draw();});
  $('density').addEventListener('input',e=>{state.density=+e.target.value;$('density-value').value=state.density;state.plants=state.plants.map((p,i)=>({...E.createPlant(state.seed,i,p.x,p.y,state.density),born:p.born}));draw();});
  $('pause').addEventListener('click',()=>{state.paused=!state.paused;sync();});
  $('reset').addEventListener('click',()=>{state.plants=[];state.next=0;sync();draw();announce('빈 정원이에요. 씨앗을 심어 보세요.');});
  $('save').addEventListener('click',()=>{draw();const a=document.createElement('a');a.download='garden-'+state.seed.replace(/[^a-z0-9_-]/gi,'_').slice(0,40)+'.png';a.href=canvas.toDataURL('image/png');a.click();announce('PNG 이미지를 저장했어요.');});
  $('seed').value=state.seed;$('wind').value=state.wind;$('density').value=state.density;$('wind-value').value=state.wind;$('density-value').value=state.density;
  restart();new ResizeObserver(resize).observe(canvas);requestAnimationFrame(loop);
})();
