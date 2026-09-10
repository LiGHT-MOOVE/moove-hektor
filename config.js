// Distances use SVG viewBox units; speed uses units per second.
export const CONFIG = {
  width: 1200,
  height: 706,
  margin: 54,
  strokeWidth: 38,
  blur: 13,
  opacity: 0.55,
  color: "#168c88",
  backgroundTop: "#eff9f9",
  backgroundMiddle: "#c5eeeb",
  backgroundBottom: "#43c6bc",
  speed: 110,
  trailLength: 2393, // Approximate perimeter of ICON_MOOVE_B.svg in native units.
  headFadeLength: 110, // Leading opacity ramp in viewBox units; 0 disables it.
  headFadePower: 1.8, // 1 = linear; larger values give a finer, softer tip.
  tailFadeLength: 160, // Always-on tail opacity ramp length, including before the tail moves.
  straightChance: 0.22, // Chance of a short straight passage at a steering decision.
  turnEase: 0.035, // Maximum change in turn per step; eases into/out of straights.
  fadeDuration: 1400, // Clear the old line before starting another.
  seed: null, // Fresh on load; set an integer to reproduce a route.
  stepLength: 18,
  minGap: 18, // Gap between solid strokes; soft blur halos may overlap.
  radii: [96, 142], // Logo-inspired ratio: approximately 64 : 94.5.
  searchBudget: 2400, // Bounded candidate/backtracking operations per attempt.
  attempts: 6,
};
