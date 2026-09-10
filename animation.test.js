import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { initialize } from './animation.js';
import { CONFIG } from './config.js';

function harness(reduced = false) {
  const animations = [], timers = new Map(), seeds = [];
  let timerId = 0, preferenceChange, pagehide;
  const preference = {
    matches: reduced,
    addEventListener: (_, listener) => { preferenceChange = listener; },
    removeEventListener() {},
  };
  const path = {
    style: {}, setAttribute() {}, getTotalLength: () => 1100,
    animate(frames, options) {
      const animation = { frames, options, onfinish: null, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    },
  };
  vm.runInNewContext(`(${initialize.toString()})(config)`, {
    config: { ...CONFIG, seed: 42 },
    document: { getElementById: () => path, documentElement: { dataset: {} } },
    matchMedia: () => preference,
    generateWalk: ({ seed }) => { seeds.push(seed); return { length: 1100, d: 'M 0 0 L 1100 0' }; },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    window: { addEventListener: (_, listener) => { pagehide = listener; } },
  });
  return { animations, timers, seeds, path,
    changeReduced(value) { preference.matches = value; preferenceChange(); },
    dispose() { pagehide({ persisted: false }); },
    runTimer() { const [id, callback] = timers.entries().next().value; timers.delete(id); callback(); },
  };
}

test('completed line holds, fades, then generates a different seeded route', () => {
  const h = harness();
  assert.deepEqual(h.seeds, [42]);
  assert.equal(h.animations[0].options.duration, 10000);
  h.animations[0].onfinish();
  assert.equal(h.timers.size, 1);
  assert.equal(h.animations.length, 1);
  h.runTimer();
  assert.equal(h.animations[1].frames.at(-1).opacity, 0);
  h.animations[1].onfinish();
  assert.deepEqual(h.seeds, [42, 43]);
  assert.equal(h.animations.length, 3);
  assert.equal(h.path.style.opacity, String(CONFIG.opacity));
});

test('reduced motion is static and cancels a pending restart', () => {
  const staticView = harness(true);
  assert.equal(staticView.animations.length, 0);
  assert.equal(staticView.timers.size, 0);
  const h = harness();
  h.animations[0].onfinish();
  h.changeReduced(true);
  assert.equal(h.timers.size, 0);
  assert.equal(h.path.style.strokeDasharray, 'none');
  assert.equal(h.animations[0].onfinish, null);
  h.changeReduced(false);
  assert.deepEqual(h.seeds, [42, 43]);
  h.animations.at(-1).onfinish();
  h.dispose();
  assert.equal(h.timers.size, 0);
  assert.equal(h.animations.at(-1).onfinish, null);
});
