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
  <rect width="100%" height="100%" fill="${esc(config.background)}"/>
  <path id="trail" fill="none" stroke="${esc(config.color)}" stroke-width="${config.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
  <script><![CDATA[${script.replaceAll("]]>", "]]]]><![CDATA[>")}]]></script>
</svg>
`;
}

async function main() {
  if (!Number.isFinite(CONFIG.speed) || CONFIG.speed <= 0) throw new Error("Speed must be positive");
  generateWalk({ ...CONFIG, seed: 1 }); // Validate configuration before writing.
  const svg = assemble(CONFIG);
  await writeFile(new URL("./hektor.svg", import.meta.url), svg, "utf8");
  console.log(`Built hektor.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB). Open in a browser to animate.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
