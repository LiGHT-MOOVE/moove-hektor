import { createScene } from "./runtime";
import { createSvg } from "./svg";
import { validateProject, type HektorProject } from "./project";

/** A complete animated SVG with no dependency on the Studio or its host. */
export function buildSvg(project: HektorProject, runtimeSource: string): string {
  const result = validateProject(project);
  if (!result.ok) throw new Error(result.error);
  const { config, pattern } = result.project;
  const { tile } = createScene({ ...config, seed: config.seed ?? 0 }, pattern);
  const script = `(() => {\nconst exports = {};\n${runtimeSource}\nexports.initialize(${JSON.stringify(config)}, ${JSON.stringify(pattern)});\n})();`;
  return createSvg(config, tile, script);
}

export function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Leave time for the browser to begin consuming the Blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
