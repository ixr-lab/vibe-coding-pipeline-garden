/* Pigment-only Canvas adapter. Geometry, alpha and material sampling stay native. */
(function(root){
  'use strict';

  const defaults=Object.freeze({cosmos:'#9b6773',daisy:'#9e8c64',poppy:'#a05e50'});
  const ranges=Object.freeze({cosmos:[.18,.72],daisy:[.52,.99],poppy:[.16,.46]});
  const gradientNatives=new WeakMap();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const luminance=rgb=>(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255;
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const hex=rgb=>'#'+rgb.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
  function parse(color){
    if(typeof color!=='string'||!/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(color))return null;
    let body=color.slice(1).toLowerCase();
    if(body.length<=4)body=body.split('').map(c=>c+c).join('');
    return {rgb:[0,2,4].map(i=>parseInt(body.slice(i,i+2),16)),alpha:body.slice(6)};
  }
  function normalize(color,species='cosmos'){
    const value=parse(color)||parse(defaults[species]||defaults.cosmos);
    return hex(value.rgb);
  }
  function mapper(mode,color,species,part){
    const range=ranges[species]||ranges.cosmos;
    const selected=parse(normalize(color,species)).rgb;
    const neutral=selected.reduce((a,b)=>a+b,0)/3;
    const pigment=mix(selected,[neutral,neutral,neutral],.15);
    const paper=[245,241,231],cache=new Map();
    return function(source){
      if(cache.has(source))return cache.get(source);
      const value=parse(source);
      if(!value)return source;
      const light=luminance(value.rgb);
      let rgb;
      if(part==='structure'){
        // Centers and bracts keep a broad tonal range so tiny florets remain legible.
        const gray=255*(.11+.48*light);rgb=[gray,gray,gray];
      }else{
        // White daisy rays and saturated poppy petals use the same pigment density
        // range, preserving each species' local folds and the five material marks.
        const tone=clamp((light-range[0])/(range[1]-range[0]),0,1);
        if(mode==='ink'){
          const gray=255*(.42+.51*Math.pow(tone,.66));rgb=[gray,gray,gray];
        }else{
          rgb=mix(paper,pigment,.58-.36*tone);
          rgb=mix(rgb,[48,48,48],.08*Math.pow(1-tone,1.6));
        }
      }
      const mapped=hex(rgb)+value.alpha;cache.set(source,mapped);return mapped;
    };
  }
  function mapColor(source,mode,color,species='cosmos',part='petal'){
    return mode==='ink'||mode==='tint'?mapper(mode,color,species,part)(source):source;
  }
  function unwrap(value){
    return value&&typeof value==='object'?(gradientNatives.get(value)||value):value;
  }
  function wrap(ctx,mode,color,species='cosmos',part='petal'){
    if(mode!=='ink'&&mode!=='tint')return ctx;
    if(!ctx||(typeof ctx!=='object'&&typeof ctx!=='function'))throw new TypeError('InkPalette.wrap requires a 2D context.');
    const map=mapper(mode,color,species,part),methods=new Map();
    return new Proxy(ctx,{
      get(target,key){
        const value=Reflect.get(target,key,target);
        if(typeof value!=='function')return value;
        if(methods.has(key))return methods.get(key);
        let method;
        if(key==='createLinearGradient'||key==='createRadialGradient'){
          method=function(...args){
            const native=Reflect.apply(value,target,args),bound=new Map();
            const gradient=new Proxy(native,{
              get(g,name){
                const member=Reflect.get(g,name,g);
                if(typeof member!=='function')return member;
                if(!bound.has(name))bound.set(name,name==='addColorStop'?
                  (at,pigment)=>Reflect.apply(member,g,[at,map(pigment)]):member.bind(g));
                return bound.get(name);
              }
            });
            gradientNatives.set(gradient,native);return gradient;
          };
        }else method=value.bind(target);
        methods.set(key,method);return method;
      },
      set(target,key,value){
        if(key==='fillStyle'||key==='strokeStyle')value=typeof value==='string'?map(value):unwrap(value);
        return Reflect.set(target,key,value,target);
      }
    });
  }
  const api=Object.freeze({defaults,normalize,mapColor,wrap});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.InkPalette=api;
})(typeof window!=='undefined'?window:globalThis);
