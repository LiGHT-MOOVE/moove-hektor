/** Build a self-contained SVG. Geometry is generated in the browser on load. */
import { writeFile } from "node:fs/promises";
import { createGeometry } from "./geometry.js";
import { createPathRenderer } from "./renderer.js";
import { CONFIG } from "./config.js";
import { createMotif } from "./motif.js";
import { createPortals } from "./portals.js";
import { createTrail } from "./trail.js";
import { initialize } from "./animation.js";

const esc = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[c]);

function assemble(config) {
  const padding = config.wrapEdges ? config.strokeWidth / 2 + 4 * config.blur + 4 : 0;
  const region = `x="${-padding}" y="${-padding}" width="${config.width + 2*padding}" height="${config.height + 2*padding}"`;
  const script = `const createGeometry = ${createGeometry.toString()};
const createPathRenderer = ${createPathRenderer.toString()};
const createMotif = ${createMotif.toString()};
const createPortals = ${createPortals.toString()};
const createTrail = ${createTrail.toString()};\n(${initialize.toString()})(${JSON.stringify(config)});`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-labelledby="title desc">
  <title id="title">Moove — a wandering line</title>
  <desc id="desc">A randomly generated smooth line draws itself without crossing its earlier route.</desc>
  <defs>
    <clipPath id="viewport"><rect width="${config.width}" height="${config.height}"/></clipPath>
    <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${esc(config.backgroundTop)}"/>
      <stop offset="48%" stop-color="${esc(config.backgroundMiddle)}"/>
      <stop offset="100%" stop-color="${esc(config.backgroundBottom)}"/>
    </linearGradient>
    <filter id="soften" filterUnits="userSpaceOnUse" ${region} color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="${config.blur}"/>
    </filter>
    <mask id="tail-mask" maskUnits="userSpaceOnUse" ${region} style="mask-type:luminance">
      <g id="tail-ramp" fill="none" stroke-width="${config.strokeWidth + 4}" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="tail-body" fill="none" stroke="white" stroke-width="${config.strokeWidth + 4}" stroke-linecap="round" stroke-linejoin="round"/>
    </mask>
    <mask id="head-mask" maskUnits="userSpaceOnUse" ${region} style="mask-type:luminance">
      <path id="head-body" fill="none" stroke="white" stroke-width="${config.strokeWidth + 4}" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="head-ramp" fill="none" stroke-width="${config.strokeWidth + 4}" stroke-linecap="round" stroke-linejoin="round"/>
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="url(#background)"/>
  <g clip-path="url(#viewport)">
  <g id="drawing" opacity="${config.opacity}" filter="url(#soften)">
  <g mask="url(#head-mask)">
  <path id="trail" fill="none" stroke="${esc(config.color)}" stroke-width="${config.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" mask="url(#tail-mask)"/>
  </g>
  </g>
  </g>
  <script><![CDATA[${script.replaceAll("]]>", "]]]]><![CDATA[>")}]]></script>
</svg>
`;
}

async function main() {
  if (!Number.isFinite(CONFIG.speed) || CONFIG.speed <= 0) throw new Error("Speed must be positive");
  if (![CONFIG.fadeDuration].every(n => Number.isFinite(n) && n >= 0)) {
    throw new Error("Cycle durations must be non-negative");
  }
  if (!Number.isFinite(CONFIG.headFadeLength) || CONFIG.headFadeLength < 0 ||
      !Number.isFinite(CONFIG.headFadePower) || CONFIG.headFadePower <= 0) {
    throw new Error("Head fade length must be non-negative and power must be positive");
  }
  createTrail({ ...CONFIG, seed: 1 });
  const svg = assemble(CONFIG);
  await writeFile(new URL("./hektor.svg", import.meta.url), svg, "utf8");
  console.log(`Built hektor.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB). Open in a browser to animate.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
