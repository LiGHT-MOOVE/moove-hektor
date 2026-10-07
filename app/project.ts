import { z } from "zod";
import { createScene } from "./runtime";

const positive = z.number().positive();
const nonnegative = z.number().nonnegative();
const opacity = z.number().min(0).max(1);
const color = z.string().trim().min(1).max(128);
const point = z.strictObject({ x: z.number(), y: z.number() });

export const configSchema = z.strictObject({
  patternOffset: point.nullable(),
  motifWidth: positive,
  strokeWidth: positive,
  blurEnabled: z.boolean(),
  blurRatio: nonnegative,
  opacity,
  color,
  shadowEnabled: z.boolean(),
  shadowColor: color,
  shadowOpacity: opacity,
  shadowOffsetX: z.number(),
  shadowOffsetY: z.number(),
  gradientEnabled: z.boolean(),
  backgroundTop: color,
  backgroundMiddle: color,
  backgroundBottom: color,
  staggerMode: z.enum(["random", "x", "y"]),
  pauseDuration: nonnegative,
  drawDuration: positive,
  loopDuration: positive,
  randomStartingPositions: z.boolean(),
  trailFraction: z.number().gt(0).lt(1),
  headFadeLength: nonnegative,
  headFadePower: positive,
  tailFadeLength: nonnegative,
  seed: z.number().int().nullable(),
});

export const patternSchema = z.strictObject({
  turns: z.array(z.strictObject({ radius: positive, degrees: z.number().min(-3600).max(3600).refine(value => value !== 0, "Turn must be nonzero") })).min(1).max(256),
  tileWidth: positive,
  tileHeight: positive,
  motifs: z.array(z.strictObject({ x: z.number(), y: z.number(), rotation: z.union([z.literal(0), z.literal(180)]) })).min(1).max(256),
});

export const projectSchema = z.strictObject({
  version: z.literal(1),
  config: configSchema,
  pattern: patternSchema,
});

export type HektorConfig = z.infer<typeof configSchema>;
export type HektorPattern = z.infer<typeof patternSchema>;
export type HektorProject = z.infer<typeof projectSchema>;
export type ProjectResult = { ok: true; project: HektorProject } | { ok: false; error: string };

export function validateProject(value: unknown): ProjectResult {
  const result = projectSchema.safeParse(value);
  if (!result.success) return { ok: false, error: z.prettifyError(result.error) };
  try {
    // Validate geometry without consuming randomness or replacing the saved seed.
    createScene({ ...result.data.config, seed: result.data.config.seed ?? 0 }, result.data.pattern);
    return { ok: true, project: result.data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid geometry." };
  }
}

export function parseProject(json: string): ProjectResult {
  try { return validateProject(JSON.parse(json)); }
  catch { return { ok: false, error: "Invalid JSON. Check the syntax before applying." }; }
}

export function serializeProject(project: HektorProject): string {
  return JSON.stringify(project, null, 2) + "\n";
}
