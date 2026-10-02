/** Build a self-contained SVG. Geometry is generated in the browser on load. */
import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";
import { createGeometry } from "./geometry.js";
import { createPathRenderer, renderPadding } from "./renderer.js";
import { CONFIG, PATTERN } from "./config.js";
import { createMotif } from "./motif.js";
import { createRepeats } from "./repeats.js";
import { createTile } from "./tile.js";
import { createChoreography } from "./choreography.js";
import { initialize } from "./animation.js";

import { createScene } from "./scene.js";
import { createSvg } from "./svg.js";

export function buildSvg(config, pattern) {
  const { tile } = createScene({ ...config, seed: config.seed ?? 0 }, pattern);
  const runtime = [renderPadding, createGeometry, createPathRenderer, createMotif,
    createRepeats, createTile, createScene, createChoreography, initialize]
    .map(fn => `const ${fn.name} = ${fn.toString()};`).join("\n");
  const script = `${runtime}\ninitialize(${JSON.stringify(config)}, ${JSON.stringify(pattern)});`;
  return createSvg(config, tile, script);
}

async function main() {
  const svg = buildSvg(CONFIG, PATTERN);
  await writeFile(new URL("./hektor.svg", import.meta.url), svg, "utf8");
  console.log(`Built hektor.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB). Open in a browser to animate.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
