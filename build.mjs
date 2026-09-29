/** Build a self-contained SVG. Geometry is generated in the browser on load. */
import { writeFile } from "node:fs/promises";
import { createGeometry } from "./geometry.js";
import { createPathRenderer, renderPadding } from "./renderer.js";
import { CONFIG, PATTERN } from "./config.js";
import { createMotif } from "./motif.js";
import { createRepeats } from "./repeats.js";
import { createTile } from "./tile.js";
import { initialize } from "./animation.js";

import { createScene } from "./scene.js";
import { createSvg } from "./svg.js";

async function main() {
  const { tile } = createScene({ ...CONFIG, seed: CONFIG.seed ?? 0 }, PATTERN);
  const runtime = [renderPadding, createGeometry, createPathRenderer, createMotif,
    createRepeats, createTile, createScene, initialize]
    .map(fn => `const ${fn.name} = ${fn.toString()};`).join("\n");
  const script = `${runtime}\ninitialize(${JSON.stringify(CONFIG)}, ${JSON.stringify(PATTERN)});`;
  const svg = createSvg(CONFIG, tile, script);
  await writeFile(new URL("./hektor.svg", import.meta.url), svg, "utf8");
  console.log(`Built hektor.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB). Open in a browser to animate.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
