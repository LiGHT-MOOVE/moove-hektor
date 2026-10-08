import type { HektorConfig } from "./project";
import { renderPadding } from "./runtime";

const esc = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
} as Record<string, string>)[c]);

/** Shared markup for the standalone file and live Studio preview. */
export function createSvg(config: HektorConfig, tile: { width: number; height: number }, script = "") {
  const source = config.blurEnabled ? "blurred" : "SourceGraphic";
  const padding = renderPadding(config);
  const region = `x="${-padding}" y="${-padding}" width="${tile.width + 2 * padding}" height="${tile.height + 2 * padding}"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;overflow:hidden" role="img" aria-labelledby="title desc">
  <title id="title">Moove — flowing motifs</title>
  <desc id="desc">Softly tapered trails drawing motifs across a repeating layout.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${esc(config.backgroundTop)}"/>
      <stop offset="48%" stop-color="${esc(config.backgroundMiddle)}"/>
      <stop offset="100%" stop-color="${esc(config.backgroundBottom)}"/>
    </linearGradient>
    <filter id="soften" filterUnits="userSpaceOnUse" ${region} color-interpolation-filters="sRGB">
      ${config.blurEnabled ? `<feGaussianBlur stdDeviation="${config.strokeWidth * config.blurRatio}" result="blurred"/>` : ""}${config.shadowEnabled ? `
      <feOffset in="${source}" dx="${config.shadowOffsetX}" dy="${config.shadowOffsetY}" result="offset"/>
      <feFlood flood-color="${esc(config.shadowColor)}" flood-opacity="${config.shadowOpacity}" result="shadow-color"/>
      <feComposite in="shadow-color" in2="offset" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="${source}"/></feMerge>` : ""}
    </filter>
    <mask id="tail-mask" maskUnits="userSpaceOnUse" ${region} style="mask-type:luminance">
      <g id="tail-ramp" fill="none" stroke-width="${config.strokeWidth + 4}" stroke-linecap="butt" stroke-linejoin="round"/>
      <path id="tail-body" fill="none" stroke="white" stroke-width="${config.strokeWidth + 4}" stroke-linecap="butt" stroke-linejoin="round"/>
    </mask>
    <mask id="head-mask" maskUnits="userSpaceOnUse" ${region} style="mask-type:luminance">
      <g id="head-ramp" fill="none" stroke-width="${config.strokeWidth + 4}" stroke-linecap="butt" stroke-linejoin="round"/>
      <path id="head-body" fill="none" stroke="white" stroke-width="${config.strokeWidth + 4}" stroke-linecap="butt" stroke-linejoin="round"/>
    </mask>
    <pattern id="motifs" patternUnits="userSpaceOnUse" width="${tile.width}" height="${tile.height}" overflow="hidden">
  <g id="drawing" opacity="${config.opacity}"${config.blurEnabled || config.shadowEnabled ? ' filter="url(#soften)"' : ""}>
  <g mask="url(#head-mask)">
  <path id="trail" fill="none" stroke="${esc(config.color)}" stroke-width="${config.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" mask="url(#tail-mask)"/>
  </g>
  </g>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${config.gradientEnabled ? 'url(#background)' : esc(config.backgroundTop)}"/>
  <svg id="pattern-viewport" x="50%" y="50%" width="100%" height="100%" overflow="visible">
    <g id="active-trail"/>
    <rect id="field" x="-50%" y="-50%" width="100%" height="100%" fill="url(#motifs)"/>
  </svg>
${script ? `<script><![CDATA[${script.replaceAll("]]>", "]]]]><![CDATA[>")}]]></script>` : ""}
</svg>
`;
}
