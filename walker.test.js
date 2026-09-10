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
