import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { initialize } from './animation.js';
import { CONFIG } from './config.js';
function harness(reduced=false, overrides={}) {
  const frames=new Map(), seeds=[]; let id=0, change, dispose;
  const node=()=>({style:{}, attrs:{}, children:[], setAttribute(k,v){this.attrs[k]=v;},
    replaceChildren(){this.children=[];}, appendChild(n){this.children.push(n);}});
  const elements=Object.fromEntries(['trail','drawing','tail-ramp','tail-body','head-ramp','head-body'].map(id=>[id,node()]));
  const preference={matches:reduced,addEventListener:(_,fn)=>{change=fn;},removeEventListener(){}};
  vm.runInNewContext(`(${initialize.toString()})(config)`, {
    config:{...CONFIG,seed:42,trailLength:20,tailFadeLength:10,speed:100,fadeDuration:100,...overrides},
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
test('tail is ramped from the start, follows its visible end, then collision retries',()=>{
  const h=harness();
  h.tick(0);
  assert.ok(h.elements['tail-ramp'].children.every(n=>n.attrs.d===''));
  h.tick(50);
  const bands = h.elements['tail-ramp'].children;
  assert.ok(bands.every(n=>n.attrs.d!==''));
  const brightness = bands.map(n=>Number(n.attrs.stroke.match(/\d+/)[0]));
  assert.ok(brightness[0]<10 && brightness.at(-1)>240);
  assert.ok(brightness.every((value,i)=>i===0 || value>=brightness[i-1]));
  assert.equal(h.elements['tail-body'].attrs.d,''); // Both ramps fit a very short path.
  for(let t=100;t<=200;t+=50) h.tick(t);
  assert.equal(h.elements['tail-body'].attrs.d,'10:20');
  assert.ok(bands[0].attrs.d.startsWith('0:'));
  for(let t=250;t<=350;t+=50) h.tick(t);
  assert.equal(h.elements['tail-body'].attrs.d,'15:35');
  assert.ok(bands[0].attrs.d.startsWith('5:'));
  for(let t=400;t<=500;t+=50) h.tick(t);
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


test('head opacity decreases toward the tip and can be tuned or disabled',()=>{
  const h=harness(false,{headFadeLength:10,headFadePower:1});
  for(let t=0;t<=200;t+=50) h.tick(t);
  assert.equal(h.elements['head-body'].attrs.d,'0:10');
  const brightness=h.elements['head-ramp'].children.map(n=>Number(n.attrs.stroke.match(/\d+/)[0]));
  assert.ok(brightness[0]>240);
  assert.ok(brightness.at(-1)<10);
  assert.ok(brightness.every((value,i)=>i===0 || value<=brightness[i-1]));
  const sharper=harness(false,{headFadeLength:10,headFadePower:2});
  for(let t=0;t<=200;t+=50) sharper.tick(t);
  const midpoint=Number(sharper.elements['head-ramp'].children[16].attrs.stroke.match(/\d+/)[0]);
  assert.ok(midpoint<brightness[16]);
  const disabled=harness(false,{headFadeLength:0});
  disabled.tick(0);disabled.tick(50);
  assert.equal(disabled.elements['head-body'].attrs.d,'0:5');
  assert.ok(disabled.elements['head-ramp'].children.every(n=>n.attrs.d===''));
});
