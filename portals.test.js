import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortals } from './portals.js';
import { createTrail } from './trail.js';
import { CONFIG } from './config.js';

function pointAt(arc,s) {
  const length=s-arc.from,half=arc.turn*length/(arc.to-arc.from)/2;
  const chord=length*(Math.abs(half)<1e-10?1:Math.sin(half)/half);
  return {x:arc.start.x+chord*Math.cos(arc.heading+half),y:arc.start.y+chord*Math.sin(arc.heading+half)};
}
test('collision checks include opposite edges and diagonal corners',()=>{
  const p=createPortals(100,100);
  assert.ok(p.collides({x:1,y:30},{x:1,y:40},{x:99,y:30},{x:99,y:40},3));
  assert.ok(p.collides({x:1,y:1},{x:2,y:2},{x:99,y:99},{x:98,y:98},4));
  assert.ok(!p.collides({x:1,y:30},{x:1,y:40},{x:90,y:30},{x:90,y:40},3));
  assert.ok(p.collides({x:201,y:-170},{x:201,y:-160},{x:99,y:30},{x:99,y:40},3));
});
test('straight portal crossings split at exact edges, including a simultaneous corner',()=>{
  const p=createPortals(100,100,10);
  for(const [start,heading,length] of [
    [{x:95,y:50},0,20], [{x:5,y:50},Math.PI,20],
    [{x:50,y:95},Math.PI/2,20], [{x:50,y:5},-Math.PI/2,20],
    [{x:95,y:95},Math.PI/4,20], [{x:5,y:5},-3*Math.PI/4,20],
  ]) {
    const arc={start,heading,turn:0,from:0,to:length};
    const pieces=p.split(arc,0,length,pointAt);
    assert.equal(pieces.length,2);
    assert.ok(Math.abs(pieces.reduce((n,v)=>n+v.to-v.from,0)-length)<1e-8);
    for(const piece of pieces) for(const v of [piece.start,piece.end]) {
      assert.ok(v.x>=-1e-8 && v.x<=100+1e-8 && v.y>=-1e-8 && v.y<=100+1e-8);
    }
    assert.ok(Math.hypot(pieces[0].end.x-pieces[1].start.x,pieces[0].end.y-pieces[1].start.y)>=100-1e-8);
    assert.ok(p.fragments(arc,pieces[0],pointAt).length>0);
  }
});
test('curved crossings preserve arc length and provide out-of-frame blur fragments',()=>{
  const p=createPortals(100,100,12);
  const arc={start:{x:95,y:50},heading:0,turn:0.3,from:0,to:20};
  const pieces=p.split(arc,0,20,pointAt);
  assert.equal(pieces.length,2);
  assert.ok(Math.abs(pieces[0].end.x-100)<1e-8);
  assert.ok(Math.abs(pieces[1].start.x)<1e-8);
  assert.ok(Math.abs(pieces[0].end.y-pieces[1].start.y)<1e-8);
  const fragments=pieces.flatMap(piece=>p.fragments(arc,piece,pointAt));
  assert.ok(fragments.some(f=>f.start.x<0));
  assert.ok(fragments.some(f=>f.end.x>100));
});
test('wrapped routes cross portals, keep bounded coordinates, and avoid all subpaths periodically',()=>{
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let crossings=0;
  for(const seed of [0,1,4]) {
    const walker=createTrail({...CONFIG,seed});
    for(let head=18,count=0;head<12000;head+=18,count++) {
      const state=walker.advance(head);
      if(count%40===0 || state.blocked) {
        assert.ok(state.arcs.length<=Math.ceil((CONFIG.trailLength+CONFIG.tailFadeLength)/CONFIG.stepLength)+2);
        for(const arc of state.arcs) {
          assert.ok(arc.start.x>=0 && arc.start.x<CONFIG.width && arc.start.y>=0 && arc.start.y<CONFIG.height);
          if(arc.end.x<0 || arc.end.x>CONFIG.width || arc.end.y<0 || arc.end.y>CONFIG.height) crossings++;
        }
        // Independent periodic intersection check across every recorded subpath.
        for(let i=0;i<state.mesh.length;i++) for(let j=i+2;j<state.mesh.length;j++) {
          const {a,b}=state.mesh[i],{a:c,b:d}=state.mesh[j];
          for(const x of [-CONFIG.width,0,CONFIG.width]) for(const y of [-CONFIG.height,0,CONFIG.height]) {
            const u={x:c.x+x,y:c.y+y},v={x:d.x+x,y:d.y+y};
            assert.ok(!(cross(a,b,u)*cross(a,b,v)<0 && cross(u,v,a)*cross(u,v,b)<0),`seed ${seed}, segments ${i}/${j}`);
          }
        }
      }
      assert.ok(!/NaN|Infinity/.test(state.d));
      if(state.blocked) break;
    }
  }
  assert.ok(crossings>0,'routes must actually cross the viewport edges');
});
