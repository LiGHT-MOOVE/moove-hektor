// All distances use SVG viewBox units; speed uses units per second.
export const CONFIG = {
  width: 1200,
  height: 650,
  margin: 40,
  strokeWidth: 3,
  color: "#c64b45",
  background: "#faf9f6",
  speed: 180,
  seed: null, // null creates a fresh seed on load; use an integer to reproduce a route.
  stepLength: 12,
  minGap: 18, // Minimum visible gap between non-neighboring sections.
  maxTurn: 0.22, // Radians per step; capped by the walker for local safety.
  turnChange: 0.035,
  maxSteps: 420,
  candidatesPerStep: 28,
  attempts: 5,
};
