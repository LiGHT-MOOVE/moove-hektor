/** Shared Euclidean geometry; no walker state or SVG dependencies. */
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
  function pointDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  function segmentDistance(a, b, c, d) {
    if (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) return 0;
    return Math.min(pointDistance(a,c,d), pointDistance(b,c,d), pointDistance(c,a,b), pointDistance(d,a,b));
  }
  return { arcPoint, pointAt, segmentDistance };
}
