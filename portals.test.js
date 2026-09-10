import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortals } from './portals.js';
import { createTrail } from './trail.js';
import { CONFIG } from './config.js';

test('collision checks include opposite edges and diagonal corners',()=>{
  const p=createPortals(100,100);
  assert.ok(p.collides({x:1,y:30},{x:1,y:40},{x:99,y:30},{x:99,y:40},3));
  assert.ok(p.collides({x:1,y:1},{x:2,y:2},{x:99,y:99},{x:98,y:98},4));
  assert.ok(!p.collides({x:1,y:30},{x:1,y:40},{x:90,y:30},{x:90,y:40},3));
  assert.ok(p.collides({x:201,y:-170},{x:201,y:-160},{x:99,y:30},{x:99,y:40},3));
});
test('wrapped routes cross portals, keep bounded coordinates, and avoid all subpaths periodically',()=>{
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let crossings=0;
  for(const motifEnabled of [false,true]) for(const seed of [0,1,4]) {
    const walker=createTrail({...CONFIG,motifEnabled,seed});
    for(let head=18,count=0;head<12000;head+=18,count++) {
      const state=walker.advance(head);
      if(count%40===0 || state.blocked) {
        const window = CONFIG.trailLength + CONFIG.tailFadeLength;
        const partialSteps = motifEnabled ? Math.ceil(window / Math.min(...CONFIG.motif.map(item => item.radius * Math.abs(item.sweep)))) + 1 : 0;
        assert.ok(state.arcs.length <= Math.ceil(window / CONFIG.stepLength) + partialSteps + 2);
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
      if(state.blocked) break;
    }
  }
  assert.ok(crossings>0,'routes must actually cross the viewport edges');
});
