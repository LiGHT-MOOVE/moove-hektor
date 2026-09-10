import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { initialize } from './animation.js';
import { CONFIG } from './config.js';
function harness(reduced=false) {
  const frames=new Map(), seeds=[]; let id=0, change, dispose;
  const node=()=>({style:{}, attrs:{}, children:[], setAttribute(k,v){this.attrs[k]=v;},
    replaceChildren(){this.children=[];}, appendChild(n){this.children.push(n);}});
  const elements=Object.fromEntries(['trail','drawing','tail-ramp','tail-body'].map(id=>[id,node()]));
  const preference={matches:reduced,addEventListener:(_,fn)=>{change=fn;},removeEventListener(){}};
  vm.runInNewContext(`(${initialize.toString()})(config)`, {
    config:{...CONFIG,seed:42,trailLength:20,tailFadeLength:10,speed:100,fadeDuration:100},
    document:{getElementById:id=>elements[id],createElementNS:node,documentElement:{dataset:{}}},
    matchMedia:()=>preference,
    generateWalk:()=>({d:'static'}),
    createTrail:({seed})=>{seeds.push(seed);return {
      advance:distance=>({head:Math.min(distance,50),tail:Math.max(0,Math.min(distance,50)-30),blocked:distance>=50,d:'visible'}),
      slice:(a,b)=>b>a?`${a}:${b}`:'',
    };},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},
    cancelAnimationFrame:id=>frames.delete(id),
    window:{addEventListener:(_,fn)=>{dispose=fn;}},
  });
  return {elements,frames,seeds,
    tick(time){const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time);},
    reduced(value){preference.matches=value;change();},
    dispose(){dispose({persisted:false});},
  };
}
test('tail begins only after the length threshold, then a collision fades and retries',()=>{
  const h=harness();
  for(let t=0;t<=200;t+=50) h.tick(t);
  assert.ok(h.elements['tail-ramp'].children.every(n=>n.attrs.d===''));
  h.tick(250);
  assert.ok(h.elements['tail-ramp'].children.some(n=>n.attrs.d!==''));
  for(let t=300;t<=500;t+=50) h.tick(t);
  assert.deepEqual(h.seeds,[42]);
  h.tick(550);
  assert.ok(Number(h.elements.drawing.style.opacity)<CONFIG.opacity);
  h.tick(600);
  assert.deepEqual(h.seeds,[42,43]);
  assert.equal(h.elements['tail-ramp'].children.length,32);
});
test('reduced motion stays static and cleanup cancels the frame loop',()=>{
  const h=harness(true);
  assert.equal(h.frames.size,0);
  assert.equal(h.elements.trail.attrs.d,'static');
  h.reduced(false);assert.equal(h.frames.size,1);
  h.tick(0);h.reduced(true);assert.equal(h.frames.size,0);
  h.reduced(false);h.dispose();assert.equal(h.frames.size,0);
});
