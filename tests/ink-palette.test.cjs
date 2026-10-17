const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
require('../petal-paint.js');
const F=require('../flower-art.js');
const palettePath=path.join(__dirname,'../ink-palette.js');
const P=fs.existsSync(palettePath)?require(palettePath):null;

class PetalPath {constructor(){this.p=[];}}
for(const name of ['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','closePath']){
  PetalPath.prototype[name]=function(...args){this.p.push([name,...args]);};
}
global.Path2D=PetalPath;

// Record the Canvas boundary without raster dependencies; real-browser pixel checks
// separately cover native gradients, clipping and alpha compositing.
function capture(kind,brush,options={}){
  const out=[],states=[];let id=0;
  const target={globalAlpha:1};
  const clean=x=>x instanceof PetalPath?x.p:x&&x.g?{g:x.g}:x;
  const ctx=new Proxy(target,{
    get(t,key){
      if(key in t)return t[key];
      return function(...args){
        assert.equal(this,ctx,'Canvas receiver must remain the native context');
        out.push([key,...args.map(clean)]);
        if(key==='getImageData')throw new Error('Flower color must not read back pixels');
        if(key==='createLinearGradient'||key==='createRadialGradient'){
          const g={g:++id,addColorStop(at,color){
            assert.equal(this,g,'Gradient receiver must remain native');
            out.push(['stop',this.g,at,color]);
          }};
          return g;
        }
        if(key==='save')states.push({...t});
        if(key==='restore'){
          const saved=states.pop();for(const k of Object.keys(t))delete t[k];Object.assign(t,saved);
        }
      };
    },
    set(t,key,value){out.push(['set',key,clean(value)]);t[key]=value;return true;}
  });
  F.draw(ctx,kind,25,31,23,'ink-legacy',-.1,
    Object.assign(brush?{brush,widthScale:1,texture:.6,opacity:.85,strength:.65}:{},options));
  return out;
}
const signature=out=>crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
const colors=out=>out.filter(x=>x[0]==='stop'||x[0]==='set'&&['fillStyle','strokeStyle'].includes(x[1]))
  .map(x=>x.at(-1)).filter(x=>typeof x==='string'&&x.startsWith('#'));
const geometry=out=>out.filter(x=>x[0]!=='stop'&&!(x[0]==='set'&&['fillStyle','strokeStyle'].includes(x[1])));
const gray=color=>color.slice(1,3)===color.slice(3,5)&&color.slice(3,5)===color.slice(5,7);
const legacy={
  'cosmos/none':'fa04e3db2779bb9554a1e475e336582a0d5d460c40f9f19c98e06688b0489b25',
  'cosmos/pen':'b320de52ef2935683a6cabd7fcdb9ff00e00a04b24efb933c14673aba40f2269',
  'cosmos/ink':'ca8ce22943278e3371fbfc7fc0a7d67ff97365da39e90c0eb14e331aa4116fb7',
  'cosmos/pencil':'f01256fdae7b345692f5df784e604ccebc9d108348b9c8f355cf0d79be1a5e37',
  'cosmos/dry':'2823186475c00fca78495a865d195e487d4056b18ce9c91dd119e6dc2981ef50',
  'cosmos/watercolor':'d970c264772e50f7c0c4ea071fbc76262f6fd0dfc703ce45a4a6f4a6030cc073',
  'daisy/none':'36e766c5072e5ef251892c8d4f2fd6666974a57ec12a8994b9221172501c22cd',
  'daisy/pen':'6facfde449d7ac1b5c8d86a719baaa87a9eb6c5f989476a98a6a155b18c0b62a',
  'daisy/ink':'f7e1c0ad3c303ddd22f6343c868f872aeb0f66018bfae8a475a4bd0ae788b751',
  'daisy/pencil':'a9c415440ec39ed661352c987f47ff360d4bda62b58e3bf8c9922617cb14e335',
  'daisy/dry':'854e24145777553dd516755496853a6a290bbe75bba70e83b2fd4b2e90204d02',
  'daisy/watercolor':'31a6ee017466dfb4095764491a716c07a1f41dfa684f5da7f086d1e755a84bc6',
  'poppy/none':'0ed6339e18138a8c57f30856837d922ce0ce2f949d3ea985ce03a12557aee231',
  'poppy/pen':'5c5a1c5a7da1583226dd9536959466bd7f3b9ed3398b7b0ab73e48a381bb8c0d',
  'poppy/ink':'4029c37678d3088b3467238905d18e528e58df77f51fe0dcb9f54e76e3d03102',
  'poppy/pencil':'495ee1905a949cd5b1e1cba5cba95a1eb8a11a124c335ec5f8f0cfef6c37322f',
  'poppy/dry':'a294116c99d2420b229e3c1b2e1ced6ef448c8b78d2d434e3764b63af6fd452a',
  'poppy/watercolor':'34a0509aba7070fb9018ad9c3c7bd65ade6a23ac97f30533965f483c32d1799b'
};

test('no mode preserves every v11 Canvas drawing command for all species/materials',()=>{
  for(const [key,want] of Object.entries(legacy)){
    const [kind,brush]=key.split('/');
    assert.equal(signature(capture(kind,brush==='none'?null:brush)),want,key);
  }
});

test('ink mode makes petals, centers and attachments achromatic without altering geometry',()=>{
  for(const kind of F.kinds)for(const brush of [null,'pen','ink','pencil','dry','watercolor']){
    const legacy=capture(kind,brush),ink=capture(kind,brush,{mode:'ink',color:'#9b6773'});
    assert.ok(colors(ink).every(gray),kind+'/'+brush+' must emit only gray pigment');
    assert.deepEqual(geometry(ink),geometry(legacy),kind+'/'+brush+' preserves RNG and material geometry');
  }
});

test('tint follows the selected color on every species while keeping non-petal pigment gray',()=>{
  assert.ok(P,'InkPalette module must exist');
  for(const kind of F.kinds){
    const blue=capture(kind,'ink',{mode:'tint',color:'#335c99'});
    const red=capture(kind,'ink',{mode:'tint',color:'#a05e50'});
    assert.notDeepEqual(colors(blue),colors(red),kind+' responds to the picker');
    assert.deepEqual(geometry(blue),geometry(red),kind+' color never changes geometry');
    const white=P.mapColor('#fff','tint','#335c99',kind,'petal');
    assert.ok(!gray(white),kind+' keeps selected pigment in pale petals');
    for(const source of ['#293f2b','#ffe779','#271f2d']){
      assert.ok(gray(P.mapColor(source,'tint','#335c99',kind,'structure')));
    }
  }
});

test('hex alpha, unsupported styles, native gradients and save/restore survive wrapping',()=>{
  assert.ok(P,'InkPalette module must exist');
  assert.equal(P.mapColor('#f003','tint','#335c99','poppy').slice(-2),'33');
  assert.equal(P.mapColor('#ab36cf00','ink','#335c99','cosmos').slice(-2),'00');
  assert.equal(P.mapColor('#ab36cf7E','ink','#335c99','cosmos').slice(-2),'7e');
  assert.equal(P.mapColor('rgba(0,0,0,0)','ink','#335c99','cosmos'),'rgba(0,0,0,0)');
  const states=[],nativeGradients=new WeakSet();
  const native={fillStyle:'#123456',globalAlpha:.6,
    save(){assert.equal(this,native);states.push(this.fillStyle);},
    restore(){assert.equal(this,native);this.fillStyle=states.pop();},
    createLinearGradient(){assert.equal(this,native);const g={addColorStop(at,color){assert.equal(this,g);this.stop=[at,color];}};nativeGradients.add(g);return g;}
  };
  const c=P.wrap(native,'tint','#335c99','cosmos');
  c.save();c.fillStyle='#e76ab235';assert.equal(native.fillStyle.slice(-2),'35');
  const g=c.createLinearGradient(0,0,1,1);g.addColorStop(.5,'#e76ab2');c.fillStyle=g;
  assert.ok(nativeGradients.has(native.fillStyle),'native context receives an unwrapped CanvasGradient');
  assert.notEqual(native.fillStyle.stop[1],'#e76ab2');
  c.restore();assert.equal(native.fillStyle,'#123456');assert.equal(c.globalAlpha,.6);
  assert.equal(P.wrap(native,'invalid','#335c99','cosmos'),native);
});

test('pose changes projection without moving the seeded petals or color mode changing the pose',()=>{
  const base=capture('cosmos','ink',{mode:'ink',pose:'threeQuarter'});
  const side=capture('cosmos','ink',{mode:'ink',pose:'side'});
  const projected=out=>out.filter(x=>x[0]==='scale').at(-1)[2];
  assert.ok(projected(side)<projected(base)*.7,'side flower is visibly narrower in projection');
  assert.deepEqual(geometry(base),geometry(capture('cosmos','ink',{mode:'tint',color:'#335c99',pose:'threeQuarter'})));
  assert.deepEqual(base.filter(x=>x[0]==='fill').map(x=>x[1]),side.filter(x=>x[0]==='fill').map(x=>x[1]));
});
