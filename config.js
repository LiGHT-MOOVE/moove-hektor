// Lengths use native motif units unless noted; duration uses seconds.
export const CONFIG = {
  patternOffset: { x: 0, y: 0 }, // Fixed tile fractions for consistent framing; null = random.
  motifWidth: 360, // Displayed outline width in pixels; smaller screens crop the same pattern.
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
  pauseBetweenDrawings: true, // false = continuous movement; true uses each motif delay.
  loopDuration: 18, // Seconds per circuit, independent of pattern size.
  randomStartingPositions: true, // false starts every trail at position zero.
  trailFraction: 0.72, // Visible fraction of each closed loop, including both ramps.
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
  spacing: { x: 1, y: 1 }, // Positive center-spacing factors; motif size stays unchanged.
  // Motif centers in native units. Rotation is 0 or 180 degrees.
  // Delay is seconds before the first drawing and between complete cycles.
  motifs: [
    { x: 0, y: 0, rotation: 0, delay: 0 },
    { x: 238, y: 354, rotation: 180, delay: 3 },
    { x: 1333, y: 354, rotation: 0, delay: 6 },
    { x: 1571, y: 708, rotation: 180, delay: 9 },
  ],
};
