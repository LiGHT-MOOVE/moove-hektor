/** Shared Euclidean geometry; no animation state or SVG dependencies. */
export function createGeometry() {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function arcPoint(start, heading, turn, length, fraction) {
    const half = turn * fraction / 2;
    const chord = length * fraction * (Math.abs(half) < 1e-10 ? 1 : Math.sin(half) / half);
    return { x: start.x + chord * Math.cos(heading + half),
      y: start.y + chord * Math.sin(heading + half) };
  }
  function pointAt(arc, distance) {
    const length = arc.to - arc.from;
    return arcPoint(arc.start, arc.heading, arc.turn, length,
      clamp((distance - arc.from) / length, 0, 1));
  }
  return { arcPoint, pointAt };
}
