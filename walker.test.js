import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "./config.js";
import { generateWalk } from "./walker.js";

test("fixed seeds reproduce routes and different seeds vary them", () => {
  const first = generateWalk({ ...CONFIG, seed: 42 });
  assert.equal(first.d, generateWalk({ ...CONFIG, seed: 42 }).d);
  assert.notEqual(first.d, generateWalk({ ...CONFIG, seed: 43 }).d);
  assert.ok(first.arcs.length > 20);
});

test("sampled routes remain in bounds and do not cross across several seeds", () => {
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let seed = 0; seed < 12; seed++) {
    const { mesh, arcs } = generateWalk({ ...CONFIG, seed });
    assert.ok(arcs.length > 0);
    for (let i = 0; i < mesh.length; i++) {
      const { a, b } = mesh[i];
      assert.ok(b.x >= CONFIG.margin && b.x <= CONFIG.width - CONFIG.margin);
      assert.ok(b.y >= CONFIG.margin && b.y <= CONFIG.height - CONFIG.margin);
      for (let j = i + 2; j < mesh.length; j++) {
        const { a: c, b: d } = mesh[j];
        assert.ok(!(cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0), `Crossing at seed ${seed}`);
      }
    }
  }
});


test("uses exactly the configured radii and preserves tangent direction", () => {
  const walk = generateWalk({ ...CONFIG, seed: 3 });
  const used = new Set();
  for (let i = 0; i < walk.arcs.length; i++) {
    const arc = walk.arcs[i];
    const radius = CONFIG.stepLength / Math.abs(arc.turn);
    assert.ok(CONFIG.radii.some(r => Math.abs(r - radius) < 1e-9));
    used.add(Math.round(radius));
    if (i === 0) continue;
    const prev = walk.arcs[i - 1];
    const start = prev.points[0];
    const prevHeading = Math.atan2(prev.end.y - start.y, prev.end.x - start.x) + prev.turn / 2;
    const nextHeading = Math.atan2(arc.end.y - arc.points[0].y, arc.end.x - arc.points[0].x) - arc.turn / 2;
    assert.ok(Math.abs(Math.sin(nextHeading - prevHeading)) < 1e-10);
    assert.ok(Math.cos(nextHeading - prevHeading) > 0);
  }
  assert.equal(used.size, 2);
  assert.ok(walk.length >= 3000, "regression seed should sustain a long route");
});

test("rejects radii that cannot safely accommodate the stroke and gap", () => {
  assert.throws(() => generateWalk({ ...CONFIG, radii: [10, 20] }), /Radii too small/);
});
