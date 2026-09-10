import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrail } from './trail.js';
import { CONFIG } from './config.js';

test('distance controls the tail, memory is bounded, and stopped routes do not wait', () => {
  const walker = createTrail({ ...CONFIG, motifEnabled:false, wrapEdges:false, seed: 1 });
  let state, faded = false;
  for (let head = 9; head < 18000; head += 9) {
    state = walker.advance(head);
    assert.equal(state.tail, Math.max(0, state.head - CONFIG.trailLength - CONFIG.tailFadeLength));
    assert.ok(state.length <= CONFIG.trailLength + CONFIG.tailFadeLength + 1e-7);
    assert.ok(state.arcs.length <= Math.ceil((CONFIG.trailLength + CONFIG.tailFadeLength) / CONFIG.stepLength) + 2);
    assert.ok(state.arcs.every(arc => arc.to > state.tail));
    assert.ok(!/NaN|Infinity/.test(state.d));
    faded ||= state.tail > 0;
    if (state.blocked) break;
    assert.equal(state.head, head);
  }
  assert.ok(faded, 'the regression route must reach its fading tail');
  assert.ok(state.blocked);
  const again = walker.advance(state.head + 9);
  assert.equal(again.head, state.head);
  assert.equal(again.blocked, true);
});

test('geometry is seeded, independent of drawing speed, and includes short straights', () => {
  const a = createTrail({ ...CONFIG, motifEnabled:false, wrapEdges:false, seed: 4 });
  const b = createTrail({ ...CONFIG, motifEnabled:false, wrapEdges:false, seed: 4, speed: CONFIG.speed * 2 });
  let straight = false;
  for (let head = 18; head < 4000; head += 18) {
    const x = a.advance(head), y = b.advance(head);
    assert.equal(x.d, y.d);
    straight ||= x.arcs.some(arc => Math.abs(arc.turn) < 1e-10);
    for (let i = 1; i < x.arcs.length; i++) {
      const previous = x.arcs[i-1], arc = x.arcs[i];
      assert.ok(Math.abs(arc.heading - previous.heading - previous.turn) < 1e-10);
      assert.ok(Math.abs(arc.turn - previous.turn) <= CONFIG.turnEase + 1e-10);
    }
    if (x.blocked) break;
  }
  assert.ok(straight);
});

test('visible and planned geometry stays in bounds and never crosses itself', () => {
  const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  for (const seed of [0,1,4]) {
    const walker = createTrail({ ...CONFIG, motifEnabled:false, wrapEdges: false, seed });
    for (let head = 18, count = 0; head < 10000; head += 18, count++) {
      const state = walker.advance(head);
      if (count % 30 === 0 || state.blocked) {
        for (let i=0;i<state.mesh.length;i++) {
          const {a,b}=state.mesh[i];
          assert.ok(b.x >= CONFIG.margin && b.x <= CONFIG.width-CONFIG.margin);
          assert.ok(b.y >= CONFIG.margin && b.y <= CONFIG.height-CONFIG.margin);
          for(let j=i+2;j<state.mesh.length;j++) {
            const {a:c,b:d}=state.mesh[j];
            assert.ok(!(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0));
          }
        }
      }
      if (state.blocked) break;
    }
  }
});
