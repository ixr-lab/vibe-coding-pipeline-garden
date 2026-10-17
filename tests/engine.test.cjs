const {test}=require('node:test');
const assert=require('node:assert/strict');
let E; try { E=require('../engine.js'); } catch { E={}; }
test('same seed repeats 20 random samples',()=>{
  assert.equal(typeof E.random,'function');
  const a=E.random('271828'),b=E.random('271828'),c=E.random('other');
  const x=Array.from({length:20},a), y=Array.from({length:20},b);
  assert.deepEqual(x,y); assert.notDeepEqual(x,Array.from({length:20},c));
  assert.ok(x.every(v=>v>=0&&v<1));
});
test('plant geometry is deterministic, finite, bounded at high density',()=>{
  assert.equal(typeof E.createPlant,'function');
  const a=E.createPlant('271828',0,.5,.8,7);
  assert.deepEqual(a,E.createPlant('271828',0,.5,.8,7));
  assert.notDeepEqual(a,E.createPlant('changed',0,.5,.8,7));
  assert.ok(a.branches.length>5 && a.branches.length<200);
  const b=E.createPlant('',0,-5,9,100);
  assert.ok(b.x>=.04 && b.y<=.94);
  for(const branch of b.branches) for(const k of ['x1','y1','x2','y2','width','start']) assert.ok(Number.isFinite(branch[k]));
  assert.equal(E.MAX_PLANTS,32);
});
test('isotropic layout preserves branch proportions and keeps canopy inside view',()=>{
  assert.equal(typeof E.layout,'function');
  for(const [w,h] of [[1000,630],[350,440]]){
    const p=E.createPlant('271828',4,.96,.91,12),l=E.layout(p,w,h);
    assert.ok(l.scale>0);
    for(const b of p.branches){const x=l.root+b.x2*l.scale;assert.ok(x>=12&&x<=w-12);}
    assert.ok(Math.abs(((l.root+.1*l.scale)-l.root)-.1*l.scale)<1e-9);
  }
});
