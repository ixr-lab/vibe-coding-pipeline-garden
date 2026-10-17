/* v1: botanical renderer with isotropic branch scale and original leaf paths. */
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
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#edeedf');sky.addColorStop(.7,'#e1e6cf');sky.addColorStop(1,'#cbd7b5');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f7f3dd';ctx.beginPath();ctx.arc(w*.77,h*.24,Math.min(w,h)*.10,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cbd1bd';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,h*.73);ctx.bezierCurveTo(w*.25,h*.65,w*.62,h*.89,w,h*.72);ctx.stroke();
    ctx.fillStyle='#d0d9bd';ctx.beginPath();ctx.moveTo(0,h*.87);ctx.bezierCurveTo(w*.3,h*.72,w*.6,h*.92,w,h*.81);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();
    const texture=E.random('paper-2718');
    for(let i=0;i<750;i++){ctx.fillStyle=i%3?'#526b3d12':'#faf5db50';ctx.fillRect(texture()*w,texture()*h,1,1);}
    for(const p of [...state.plants].sort((a,b)=>a.y-b.y)){
      const age=state.time-p.born, sway=Math.sin(state.time*1.2+p.x*4)*state.wind*.00026, l=E.layout(p,w,h), scale=l.scale, root=l.root;
      ctx.fillStyle='#3f58331a';ctx.beginPath();ctx.ellipse(root,p.y*h+2,17,3,0,0,Math.PI*2);ctx.fill();
      for(const b of p.branches){
        const g=E.clamp((age-b.start*3)/.6,0,1);if(!g)continue;
        const x1=root+(b.x1+sway*(-b.y1))*scale,y1=p.y*h+b.y1*scale,x2=root+(b.x1+(b.x2-b.x1)*g+sway*(-b.y2))*scale,y2=p.y*h+(b.y1+(b.y2-b.y1)*g)*scale;
        ctx.strokeStyle=['#526b43','#637747','#7b7048'][p.hue];ctx.lineWidth=b.width*.72;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(x1+(x2-x1)*.28,y2+(y1-y2)*.3,x2,y2);ctx.stroke();
        if(b.leaf&&g>.65){
          const a=Math.atan2(y2-y1,x2-x1), size=(b.width+2.5)*Math.min(3.6,scale/300)*E.clamp((g-.65)/.35,0,1);
          ctx.save();ctx.translate(x2,y2);ctx.rotate(a);ctx.fillStyle=['#537548dd','#819259dd','#b09b54dd'][p.hue];
          ctx.beginPath();ctx.moveTo(-1,0);ctx.bezierCurveTo(size*.25,-size*.6,size*.9,-size*.4,size*1.4,0);ctx.bezierCurveTo(size*.9,size*.4,size*.25,size*.6,-1,0);ctx.fill();
          ctx.strokeStyle='#f0eed15c';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(size*1.15,0);ctx.stroke();ctx.restore();
        }
      }
    }
    ctx.fillStyle='#536f4240';const grass=E.random('meadow');
    for(let i=0;i<90;i++){const x=grass()*w,y=h*(.87+grass()*.10);ctx.fillRect(x,y,1,1+grass()*3);}
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
