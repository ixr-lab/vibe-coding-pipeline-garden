const {test}=require('node:test');const assert=require('node:assert/strict');
const B=require('../brush-art.js'),F=require('../flower-art.js');
test('curve sampling keeps endpoints, midpoint and finite unit tangent on degenerate path',()=>{
 const p=B.samples({x1:0,y1:0,cx:50,cy:100,x2:100,y2:0},10);
 assert.equal(p[0].x,0);assert.equal(p.at(-1).x,100);assert.equal(p[5].x,50);assert.equal(p[5].y,50);
 const d=B.samples({x1:4,y1:4,cx:4,cy:4,x2:4,y2:4});
 assert.ok(d.every(x=>Number.isFinite(x.nx)&&Number.isFinite(x.ny)&&Math.abs(Math.hypot(x.tx,x.ty)-1)<1e-9));
 assert.throws(()=>B.samples({x1:NaN}),TypeError);
});
test('material catalog exposes 3 independent flower species and 5 distinct brush identifiers',()=>{
 assert.deepEqual(F.kinds,['cosmos','daisy','poppy']);assert.deepEqual(B.kinds,['pen','ink','pencil','dry','watercolor']);
 assert.equal(typeof F.draw,'function');assert.equal(typeof B.draw,'function');
});
