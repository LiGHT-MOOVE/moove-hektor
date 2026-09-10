import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeometry } from './geometry.js';
import { createPathRenderer } from './renderer.js';
import { createPortals } from './portals.js';
import { createTrail } from './trail.js';
import { CONFIG } from './config.js';

const geometry = createGeometry();
const config = { ...CONFIG, width:100, height:100, strokeWidth:2, blur:0 };
const render = createPathRenderer(config);
const arc = (start, heading, turn=0, length=20) => ({start, heading, turn, from:0, to:length});

test('portal offsets cover crossings, corners, and positions outside the base tile', () => {
  const portals = createPortals(100,100);
  for (const [start, end, expected] of [
    [{x:95,y:50},{x:115,y:50},[[-100,0],[0,0]]],
    [{x:95,y:95},{x:115,y:115},[[-100,-100],[-100,0],[0,-100],[0,0]]],
    [{x:295,y:-105},{x:315,y:-85},[[-300,100],[-300,200],[-200,100],[-200,200]]],
  ]) {
    const offsets = [...portals.offsets({x:0,y:0},{x:100,y:100},start,end,0)];
    assert.deepEqual(offsets.map(p=>[p.x || 0,p.y || 0]), expected);
  }
});

test('straight crossings retain complete translated arcs with no connecting diagonal', () => {
  assert.equal(render([arc({x:95,y:50},0)],0,20), 'M -5 50 L 15 50 M 95 50 L 115 50');
  const corner = render([arc({x:95,y:95},Math.PI/4)],0,20);
  assert.equal((corner.match(/M /g)||[]).length,4);
  assert.equal((corner.match(/L /g)||[]).length,4);
});

test('curves and mask slices keep their radius and only the requested interval', () => {
  const curve = arc({x:95,y:50},0,0.3);
  const d = render([curve],4,12);
  const start = geometry.pointAt(curve,4), end = geometry.pointAt(curve,12);
  const radius = 20/0.3;
  assert.equal(d, `M ${start.x-100} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x-100} ${end.y} M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`);
  assert.equal(render([curve],12,12),'');
  assert.equal(createPathRenderer({...config,wrapEdges:false})([curve],4,12),
    `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`);
});

test('conservative curved bounds include an edge graze with both endpoints inside', () => {
  // The midpoint’s padded bound reaches x=100 although the padded endpoints do not.
  const curve = arc({x:94.9,y:40},Math.PI/2-0.1,0.2);
  const d = render([curve],0,20);
  assert.equal((d.match(/M /g)||[]).length,2);
  assert.ok(d.includes(`M ${94.9-100} 40`));
});

test('every visible route and its ramps render finite geometry after portals and tail pruning', () => {
  const slice = createPathRenderer(CONFIG);
  for (const seed of [0,1,4]) {
    const walker = createTrail({...CONFIG,seed});
    for (let distance=18; distance<6000; distance+=18) {
      const state=walker.advance(distance);
      for (const [from,to] of [[state.tail,state.head],[state.tail,Math.min(state.head,state.tail+160)],
        [Math.max(state.tail,state.head-110),state.head]]) {
        const d=slice(state.arcs,from,to);
        assert.ok(d.startsWith('M '));
        assert.ok(!/NaN|Infinity/.test(d));
      }
      if(state.blocked) break;
    }
  }
});
