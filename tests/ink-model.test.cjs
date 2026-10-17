const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js');
const near=(a,b,epsilon=1e-10)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('ink plants reproduce curved stems, attached foliage and blooms from the seed',()=>{
  assert.equal(typeof E.createInkPlant,'function');
  const p=E.createInkPlant('271828',2,.5,.9,7);
  assert.deepEqual(p,E.createInkPlant('271828',2,.5,.9,7));
  assert.notDeepEqual(p,E.createInkPlant('other',2,.5,.9,7));
  assert.ok(p.branches.length>=5&&p.branches.length<14);
  assert.ok(p.leafGroups.length>=4&&p.blooms.length>=1&&p.blooms.length<=3);
  for(const b of p.branches)for(const k of ['x1','y1','cx','cy','x2','y2','width','start'])assert.ok(Number.isFinite(b[k]));
  assert.ok(p.branches.some(b=>Math.abs((b.cx-b.x1)*(b.y2-b.y1)-(b.cy-b.y1)*(b.x2-b.x1))>.00001));
});

test('each long stem joins its quadratic sections without a corner or a gap',()=>{
  for(let i=0;i<12;i++){
    const p=E.createInkPlant('join-'+i,i,.5,.9,7);
    for(const role of ['main','secondary','bud']){
      const path=p.branches.filter(b=>b.role===role);
      for(let k=1;k<path.length;k++){
        const a=path[k-1],b=path[k];near(a.x2,b.x1);near(a.y2,b.y1);
        const ax=a.x2-a.cx,ay=a.y2-a.cy,bx=b.cx-b.x1,by=b.cy-b.y1;
        near(ax*by-ay*bx,0);assert.ok(ax*bx+ay*by>0);
      }
    }
  }
});

test('density adds foliage gradually while keeping the main silhouette and flowers fixed',()=>{
  const plants=Array.from({length:11},(_,i)=>E.createInkPlant('density',3,.5,.9,i+2));
  const structural=p=>p.branches.filter(b=>b.role!=='twig');
  for(let i=1;i<plants.length;i++){
    assert.deepEqual(structural(plants[0]),structural(plants[i]));
    assert.deepEqual(plants[0].blooms,plants[i].blooms);
    const delta=plants[i].leafGroups.length-plants[i-1].leafGroups.length;
    assert.ok(delta>=0&&delta<=1);
  }
  assert.ok(plants.at(-1).leafGroups.length>=plants[0].leafGroups.length+4);
});

test('foliage sits along the stem body and becomes smaller toward the flower neck',()=>{
  const p=E.createInkPlant('271828',0,.5,.9,7);
  const core=p.leafGroups.filter(g=>g.role==='body');
  assert.equal(core.length,4);
  assert.ok(core.every(g=>g.position>.15&&g.position<.8));
  const lower=core[0].leaves.reduce((n,l)=>n+l.length,0),upper=core.at(-1).leaves.reduce((n,l)=>n+l.length,0);
  assert.ok(lower>upper*1.2);
  assert.ok(core.every((g,i)=>i===0||g.side!==core[i-1].side));
});

test('bloom necks meet terminal stems and their orientation follows the terminal tangent',()=>{
  for(let i=0;i<5;i++)for(const b of E.createInkPlant('271828',i,.5,.9,7).blooms){
    const p=E.createInkPlant('271828',i,.5,.9,7),stem=p.branches[b.branchIndex];
    near(b.neckX,stem.x2);near(b.neckY,stem.y2);
    const dx=stem.x2-stem.cx,dy=stem.y2-stem.cy,length=Math.hypot(dx,dy);
    near(b.x-b.neckX,dx/length*b.radius*.30);near(b.y-b.neckY,dy/length*b.radius*.30);
    near(b.tilt,Math.atan2(dy,dx)+Math.PI/2);
  }
});

test('de Casteljau growth follows the original curve at intermediate ages',()=>{
  assert.equal(typeof E.partialCurve,'function');
  const p={x1:0,y1:0,cx:40,cy:80,x2:100,y2:0};
  assert.deepEqual(E.partialCurve(p,.5),{x1:0,y1:0,cx:20,cy:40,x2:45,y2:40});
  const q=E.partialCurve(p,.25);near(q.cx,10);near(q.cy,20);near(q.x2,21.25);near(q.y2,30);
  const mid=E.pointOnCurve(p,.5);near(mid.x,45);near(mid.y,40);near(Math.hypot(mid.tx,mid.ty),1);
});

test('mobile and edge layouts contain leaf width, corollas, controls and maximum wind shear',()=>{
  for(const [w,h]of [[998,778],[350,440],[280,360]])for(let i=0;i<16;i++)for(const x of [.01,.99]){
    const p=E.createInkPlant('edge-'+i,i,x,.38,12);p.size=1.2;
    const l=E.layout(p,w,h),b=E.plantBounds(p);
    assert.ok(l.scale>0&&Number.isFinite(l.root)&&Number.isFinite(l.baseY));
    const wind=Math.max(Math.abs(b.minY),Math.abs(b.maxY))*.026;
    assert.ok(l.root+(b.minX-wind)*l.scale>=15);
    assert.ok(l.root+(b.maxX+wind)*l.scale<=w-15);
    assert.ok(l.baseY+b.minY*l.scale>=30);
    assert.ok(l.baseY+b.maxY*l.scale<=h-24);
    for(const f of p.blooms){
      assert.ok(b.minX<=f.x-f.radius&&b.maxX>=f.x+f.radius);
      assert.ok(b.minY<=f.y-f.radius&&b.maxY>=f.y+f.radius);
    }
  }
});

test('ink planting normalizes invalid coordinates and density without nonfinite geometry',()=>{
  const p=E.createInkPlant('',0,-5,9,100);
  assert.ok(p.x>=.04&&p.y<=.94);
  const bounds=E.plantBounds(p);
  assert.ok(Object.values(bounds).every(Number.isFinite));
  assert.ok(p.branches.length<14&&p.leafGroups.length<=12);
});

test('foliage groups vary their leaf count, node spacing and dominant leaf size',()=>{
  const groups=Array.from({length:5},(_,i)=>E.createInkPlant('271828',i,.5,.9,7).leafGroups).flat();
  assert.deepEqual([...new Set(groups.map(g=>g.leaves.length))].sort(),[1,2,3]);
  for(const g of groups.filter(g=>g.leaves.length>1)){
    const lengths=g.leaves.map(l=>l.length);
    assert.ok(Math.max(...lengths)>Math.min(...lengths)*1.25,'an equal-sized rigid fan must not return');
    assert.ok(new Set(g.leaves.map(l=>l.x.toFixed(6)+'/'+l.y.toFixed(6))).size===g.leaves.length);
  }
});

test('secondary stems without a flower finish with small terminal foliage',()=>{
  for(let i=0;i<8;i++){
    const p=E.createInkPlant('271828',i,.5,.9,7),tip=p.branches.filter(b=>b.role==='secondary').at(-1),idx=p.branches.indexOf(tip);
    if(p.blooms.some(b=>b.branchIndex===idx))continue;
    const terminal=p.leafGroups.find(g=>g.stemRole==='secondary'&&g.position>.88);
    assert.ok(terminal&&terminal.leaves.length>0,'an unused secondary must not remain a naked spike');
    assert.ok(Math.hypot(terminal.petiole.x1-tip.x2,terminal.petiole.y1-tip.y2)<p.height*.055);
  }
});

test('the hero stem changes its sweep through the body rather than remaining a single leaning rod',()=>{
  const main=E.createInkPlant('271828',2,.5,.9,7).branches.filter(b=>b.role==='main');
  const turns=main.map(b=>Math.sign((b.cx-b.x1)*(b.y2-b.y1)-(b.cy-b.y1)*(b.x2-b.x1)));
  assert.ok(turns.includes(-1)&&turns.includes(1));
  assert.ok(main.some(b=>Math.abs(b.cx-b.x1)>Math.abs(b.y2-b.y1)*.18));
});

test('intermediate growth keeps every revealed leaf attached to its completed petiole',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),sandbox={window:{},GardenEngine:E};
  vm.runInNewContext(fs.readFileSync(require.resolve('../plant-renderer.js'),'utf8'),sandbox);
  const R=sandbox.window.PlantRenderer;
  assert.equal(typeof R.foliageGrowth,'function');
  const p=E.createInkPlant('271828',2,.5,.9,7),group=p.leafGroups.find(g=>g.id==='body-2');
  const before=R.foliageGrowth(group,2.125);
  assert.ok(before.petiole>.5&&before.petiole<.6);
  assert.equal(before.leaves[1],0,'the former floating leaf must wait for its supporting petiole');
  for(const g of p.leafGroups)for(let age=0;age<=6;age+=.0625){
    const growth=R.foliageGrowth(g,age);
    if(growth.leaves.some(v=>v>0))assert.equal(growth.petiole,1);
  }
  const mature=R.foliageGrowth(group,6);
  assert.equal(mature.petiole,1);assert.ok(mature.leaves.every(v=>v===1));
});
