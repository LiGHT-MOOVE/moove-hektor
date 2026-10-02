// Lengths use native motif units unless noted; duration uses seconds.
export const CONFIG = {
  patternOffset: { x: 0, y: -0.15 }, // Fixed tile fractions for consistent framing; null = random.
  motifWidth: 800, // Displayed outline width in pixels; smaller screens crop the same pattern.
  strokeWidth: 38,
  blurEnabled: true, // Toggle blur without changing its ratio.
  blurRatio: 0.34210526315789475, // Blur radius / stroke width (13 / 38 preserves the original softness).
  opacity: 0.55,
  color: "#2466ce",
  shadowEnabled: true, // Set false to remove the depth effect.
  shadowColor: "#437bbc",
  shadowOpacity: 0.4, // Also follows the trail's overall opacity and fading.
  shadowOffsetX: -32,
  shadowOffsetY: 32,
  gradientEnabled: true, // False uses backgroundTop as a solid background.
  backgroundTop: "#f5fcff",
  backgroundMiddle: "#e3f2ff",
  backgroundBottom: "#8ac4ff",
  playback: "multiple", // sequence = draw, drain, pause, move on; multiple = loop all repeated motifs.
  order: "shuffle", // shuffle, rows, or columns; used by sequence playback.
  pauseDuration: 0, // Seconds between trails, after the tail disappears.
  loopDuration: 18, // Seconds per circuit, independent of pattern size.
  randomStartingPositions: true, // false starts at zero; true randomizes each Sequence appearance or each repeated motif.
  trailFraction: 0.35, // Visible fraction of each closed loop, including both ramps.
  headFadeLength: 110, // Leading opacity ramp in viewBox units; 0 disables it.
  headFadePower: 1.8, // 1 = linear; larger values give a finer, softer tip.
  tailFadeLength: 160, // Tail opacity ramp length; 0 disables it.
  seed: null, // Fresh on load; set an integer to reproduce pattern offset and phases.
};

/** Native geometry and placement of one complete repeat. */
export const PATTERN = {
  // One closed outline. Each radius is a positive native-unit distance.
  // Clockwise degrees are positive.
  turns: [
    { radius: 142, degrees: -90 },
    { radius: 96, degrees: 180 },
    { radius: 142, degrees: -180 },
    { radius: 96, degrees: 180 },
    { radius: 142, degrees: -90 },
    { radius: 96, degrees: 270 }, // Rounded right end.
    { radius: 142, degrees: -180 },
    { radius: 96, degrees: 180 },
    { radius: 142, degrees: -180 },
    { radius: 96, degrees: 270 }, // Close the left end.
  ],
  tileWidth: 2666,
  tileHeight: 708,
  // Motif centers as tile fractions (0.5 = halfway). Rotation is 0 or 180 degrees.
  motifs: [
    { x: 0, y: 0, rotation: 0 },
    { x: 0.08927231807951988, y: 0.5, rotation: 180 },
    { x: 0.5, y: 0.5, rotation: 0 },
    { x: 0.5892723180795199, y: 1, rotation: 180 },
  ],
};
