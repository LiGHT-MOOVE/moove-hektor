// Distances use SVG viewBox units; speed uses units per second.
export const CONFIG = {
  width: 1200,
  height: 706,
  margin: 54, // Used only when wrapEdges is false.
  wrapEdges: true, // Opposite viewport edges connect as portals.
  strokeWidth: 38,
  blur: 13,
  opacity: 0.55,
  color: "#2466ce",
  shadowEnabled: true, // Set false to remove the depth effect.
  shadowColor: "#437bbc",
  shadowOpacity: 0.4, // Also follows the trail's overall opacity and fading.
  shadowOffsetX: -32,
  shadowOffsetY: 32,
  backgroundTop: "#f5fcff",
  backgroundMiddle: "#e3f2ff",
  backgroundBottom: "#8ac4ff",
  speed: 200,
  trailLength: 2393, // Approximate perimeter of ICON_MOOVE_B.svg in native units.
  headFadeLength: 110, // Leading opacity ramp in viewBox units; 0 disables it.
  headFadePower: 1.8, // 1 = linear; larger values give a finer, softer tip.
  tailFadeLength: 160, // Always-on tail opacity ramp length, including before the tail moves.
  fadeDuration: 1400, // Clear the old line before starting another.
  travelDirection: "right", // "left", "right", or "random" for each new trail.
  motifRandomStart: true, // Choose a starting section for each attempt.
  motifMirror: true, // Randomly mirror the whole sequence.
  motif: [ // Alternating ±Math.PI half-turns; radius = diameter / 2.
    { radius: 96, sweep: Math.PI },
    { radius: 142, sweep: -Math.PI },
  ],
  seed: null, // Fresh on load; set an integer to reproduce a route.
  stepLength: 18,
  minGap: 18, // Gap between solid strokes; soft blur halos may overlap.
};
