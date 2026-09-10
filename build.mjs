/** Build a self-contained SVG. Geometry is generated in the browser on load. */
import { writeFile } from "node:fs/promises";
import { CONFIG } from "./config.js";
import { generateWalk } from "./walker.js";
import { initialize } from "./animation.js";

const esc = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[c]);

function assemble(config) {
  const script = `const generateWalk = ${generateWalk.toString()};\n(${initialize.toString()})(${JSON.stringify(config)});`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" role="img" aria-labelledby="title desc">
  <title id="title">Moove — a wandering line</title>
  <desc id="desc">A randomly generated smooth line draws itself without crossing its earlier route.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${esc(config.backgroundTop)}"/>
      <stop offset="48%" stop-color="${esc(config.backgroundMiddle)}"/>
      <stop offset="100%" stop-color="${esc(config.backgroundBottom)}"/>
    </linearGradient>
    <filter id="soften" filterUnits="userSpaceOnUse" x="0" y="0" width="${config.width}" height="${config.height}" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="${config.blur}"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#background)"/>
  <path id="trail" fill="none" stroke="${esc(config.color)}" stroke-width="${config.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${config.opacity}" filter="url(#soften)"/>
  <script><![CDATA[${script.replaceAll("]]>", "]]]]><![CDATA[>")}]]></script>
</svg>
`;
}

async function main() {
  if (!Number.isFinite(CONFIG.speed) || CONFIG.speed <= 0) throw new Error("Speed must be positive");
  if (![CONFIG.holdDuration, CONFIG.fadeDuration].every(n => Number.isFinite(n) && n >= 0)) {
    throw new Error("Cycle durations must be non-negative");
  }
  generateWalk({ ...CONFIG, seed: 1 }); // Validate configuration before writing.
  const svg = assemble(CONFIG);
  await writeFile(new URL("./hektor.svg", import.meta.url), svg, "utf8");
  console.log(`Built hektor.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB). Open in a browser to animate.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
