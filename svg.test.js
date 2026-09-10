import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { CONFIG } from './config.js';

const svg = readFileSync(new URL('./hektor.svg', import.meta.url), 'utf8');
const script = svg.match(/<script><!\[CDATA\[([\s\S]*?)\]\]><\/script>/)[1];

function run(reduced, config = CONFIG) {
  const nodes = new Map(), frames = new Map();
  let frameId = 0, seed = 0;
  const node = () => ({ attrs: {}, style: {}, children: [],
    setAttribute(name, value) { this.attrs[name] = value; },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); },
  });
  const root = { dataset: {} };
  vm.runInNewContext(script.replace(JSON.stringify(CONFIG), JSON.stringify(config)), {
    document: { documentElement: root, createElementNS: node,
      getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); } },
    matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }),
    window: { addEventListener() {} },
    crypto: { getRandomValues(array) { array[0] = seed++; return array; } },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  return { nodes, frames, root,
    tick(time) {
      const [id, fn] = frames.entries().next().value;
      frames.delete(id); fn(time);
    },
  };
}

test('standalone SVG runs its embedded walker, masks and collision retries', () => {
  assert.ok(script.includes(JSON.stringify(CONFIG)), 'rebuild SVG after changing configuration');
  const h = run(false);
  let drawn = false;
  for (let frame = 0; frame < 1200; frame++) {
    h.tick(frame * 50);
    const d = h.nodes.get('trail').attrs.d;
    drawn ||= d.length > 0;
    assert.ok(!/NaN|Infinity/.test(d));
    assert.equal(h.frames.size, 1);
  }
  assert.ok(drawn);
  assert.notEqual(h.root.dataset.seed, '0', 'blocked trails must retry');
  for (const id of ['tail-ramp', 'head-ramp']) assert.equal(h.nodes.get(id).children.length, 32);
});

test('embedded reduced-motion snapshot works with every motif and portal combination', () => {
  for (const motifEnabled of [false, true]) for (const wrapEdges of [false, true]) {
    const h = run(true, { ...CONFIG, motifEnabled, wrapEdges, seed: 0 });
    const d = h.nodes.get('trail').attrs.d;
    assert.ok(d.startsWith('M '));
    assert.ok(!/NaN|Infinity/.test(d));
    assert.equal(h.nodes.get('head-body').attrs.d, d);
    assert.equal(h.nodes.get('tail-body').attrs.d, d);
    assert.equal(h.frames.size, 0);
  }
});
