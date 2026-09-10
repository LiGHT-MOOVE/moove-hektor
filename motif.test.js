import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotif } from './motif.js';
import { createTrail } from './trail.js';
import { CONFIG } from './config.js';

const fixed = { ...CONFIG, motifRandomStart: false, motifMirror: false };
test('motif finishes exact sweeps, repeats, mirrors, and restarts interrupted sections', () => {
  const motif = createMotif(fixed, () => 0);
  for (let cycle = 0; cycle < 3; cycle++) for (let index = 0; index < fixed.motif.length; index++) {
    let sweep = 0;
    do {
      const instruction = motif.peek();
      assert.equal(instruction.index, index);
      sweep += instruction.turn;
      motif.consume(instruction.length);
    } while (motif.peek().index === index);
    assert.ok(Math.abs(sweep - fixed.motif[index].sweep) < 1e-9);
  }
  motif.consume(18);
  motif.interrupt();
  const restarted = motif.peek();
  motif.interrupt();
  assert.deepEqual(motif.peek(), restarted);
  assert.equal(restarted.remainingLength, fixed.motif[0].radius * Math.PI);
  assert.equal(createMotif({ ...fixed, motifMirror: true }, () => 0).peek().turn, -motif.peek().turn);
  assert.throws(() => createMotif({ ...fixed, motif: [{ radius: 0, sweep: 1 }] }, () => 0));
});

test('clear-space motif keeps exact radii and tangent continuity through section changes', () => {
  const walker = createTrail({ ...fixed, width: 10000, height: 10000, seed: 0 });
  let state;
  for (let head = 18; head < 1800; head += 18) state = walker.advance(head);
  assert.ok(state.arcs.some(arc => arc.length < CONFIG.stepLength));
  for (const [i, arc] of state.arcs.entries()) {
    assert.equal(arc.source, 'motif');
    assert.ok(Math.abs(arc.length / Math.abs(arc.turn) - fixed.motif[arc.motifIndex].radius) < 1e-8);
    if (i) assert.ok(Math.abs(arc.heading - state.arcs[i-1].heading - state.arcs[i-1].turn) < 1e-9);
  }
});

test('obstacles interrupt the motif and it resumes with continuous heading', () => {
  const walker = createTrail({ ...CONFIG, seed: 0 });
  let previous, avoided = false, resumed = false;
  for (let head = 18; head < 6000; head += 18) {
    const state = walker.advance(head);
    for (const arc of state.arcs.filter(arc => arc.id > (previous?.id ?? -1))) {
      avoided ||= arc.source === 'avoidance';
      resumed ||= previous?.source === 'avoidance' && arc.source === 'motif';
      if (previous) assert.ok(Math.abs(arc.heading - previous.heading - previous.turn) < 1e-9);
      previous = arc;
    }
    if (state.blocked) break;
  }
  assert.ok(avoided && resumed);
});
