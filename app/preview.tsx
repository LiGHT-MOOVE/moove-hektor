"use client";

import { useEffect, useMemo, useRef } from "react";
import type { HektorProject } from "./project";
import { createScene, initialize } from "./runtime";
import { createSvg } from "./svg";
import { ErrorMessage } from "./ui";

export type PreviewMode = "desktop" | "mobile" | "intersect";

function attributes(node: Element, values: Record<string, string | number>) {
  for (const [key, value] of Object.entries(values)) node.setAttribute(key, String(value));
}

export default function Preview({ project, mode, animate }: { project: HektorProject; mode: PreviewMode; animate: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const prepared = useMemo(() => {
    try {
      const config = { ...project.config, seed: 42 };
      const scene = createScene(config, project.pattern);
      return { config, scene, markup: createSvg(config, scene.tile), error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not render the preview." };
    }
  }, [project]);
  const width = mode === "mobile" ? 390 : 1440;
  const height = mode === "mobile" ? 844 : 900;
  const margin = mode === "intersect" ? 0.15 : 0;

  useEffect(() => {
    if (!host.current || !prepared.scene) return;
    const { config, scene, markup } = prepared;
    const container = host.current;
    const template = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = document.importNode(template.documentElement, true) as unknown as SVGSVGElement;
    const bounds = { x: -width * margin, y: -height * margin, width: width * (1 + 2 * margin), height: height * (1 + 2 * margin) };
    attributes(svg, { viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` });
    for (const rect of svg.querySelectorAll(":scope > rect")) attributes(rect, bounds);
    attributes(svg.querySelector("#pattern-viewport")!, { x: width / 2, y: height / 2 });
    attributes(svg.querySelector("#field")!, { x: bounds.x - width / 2, y: bounds.y - height / 2, width: bounds.width, height: bounds.height });
    container.replaceChildren(svg);
    const dispose = initialize(config, project.pattern, svg, !animate, scene, { width, height });
    if (mode === "intersect") {
      const surround = document.createElementNS("http://www.w3.org/2000/svg", "path");
      attributes(surround, {
        d: `M ${bounds.x} ${bounds.y} h ${bounds.width} v ${bounds.height} h ${-bounds.width} Z M 0 0 h ${width} v ${height} H 0 Z`,
        fill: "#1b3045", "fill-opacity": 0.12, "fill-rule": "evenodd", "pointer-events": "none",
      });
      const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      attributes(outline, { x: 0, y: 0, width, height, fill: "none", stroke: "#287be0", "stroke-width": 1.5, "stroke-dasharray": "6 4", "vector-effect": "non-scaling-stroke", "pointer-events": "none" });
      svg.append(surround, outline);
    }
    return () => { dispose(); container.replaceChildren(); };
  }, [prepared, project.pattern, mode, animate, width, height, margin]);

  if (prepared.error) return <ErrorMessage>{prepared.error}</ErrorMessage>;
  return <div className="flex w-full justify-center">
    <div ref={host} role="img" aria-label={mode === "intersect" ? "Desktop visibility preview: intersecting motifs inside the blue viewport outline" : `${mode} screen preview`}
      style={{ aspectRatio: width / height, width: `min(100%, ${42 * width / height}vh)` }} className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_8px_24px_rgb(15_23_42_/_0.10)] [&>svg]:block [&>svg]:h-full [&>svg]:w-full" />
  </div>;
}
