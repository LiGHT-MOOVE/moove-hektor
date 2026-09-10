/**
 * Browser-safe generator. Returns tangent-connected circular arcs and a sampled
 * collision mesh. Generation is bounded; the longest attempt wins if trapped.
 * Kept self-contained so the builder can embed it without a bundler.
 */
export function generateWalk(config) {
  const { width, height, margin, stepLength: step, minGap, strokeWidth } = config;
  if (![width, height, margin, step, minGap, strokeWidth].every(Number.isFinite) ||
      step <= 0 || minGap < 0 || strokeWidth <= 0 || margin < strokeWidth / 2 ||
      width <= margin * 2 || height <= margin * 2 ||
      ![config.maxSteps, config.searchBudget, config.attempts].every(n => Number.isInteger(n) && n > 0) ||
      !Array.isArray(config.radii) || config.radii.length !== 2 ||
      !config.radii.every(r => Number.isFinite(r) && r > 0)) {
    throw new Error("Invalid walker configuration");
  }
  let state = config.seed >>> 0;
  function random() {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const clearance = minGap + strokeWidth;
  const neighbors = Math.ceil(clearance / step) + 2;
  const maxTurn = step / Math.min(...config.radii);
  // Bound the exempt local neighborhood to less than a quarter turn.
  if (maxTurn * (neighbors + 1) >= Math.PI / 2) {
    throw new Error("Radii too small for the stroke width, gap, and step length");
  }
  const subdivisions = 4;
  const error = step * maxTurn / (8 * subdivisions ** 2);
  const distanceToSegment = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  function distance(a, b, c, d) {
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
    return Math.min(distanceToSegment(a, c, d), distanceToSegment(b, c, d),
      distanceToSegment(c, a, b), distanceToSegment(d, a, b));
  }
  function propose(p, heading, turn) {
    const points = [p];
    for (let i = 1; i <= subdivisions; i++) {
      const f = i / subdivisions;
      // Stable circular-arc evaluation, including nearly straight steps.
      const half = turn * f / 2;
      const length = step * f * (Math.abs(half) < 1e-10 ? 1 : Math.sin(half) / half);
      points.push({ x: p.x + length * Math.cos(heading + half), y: p.y + length * Math.sin(heading + half) });
    }
    return { points, turn, end: points.at(-1) };
  }
  function valid(candidate, mesh, arcIndex) {
    for (const p of candidate.points) {
      if (p.x < margin + error || p.x > width - margin - error ||
          p.y < margin + error || p.y > height - margin - error) return false;
    }
    for (let i = 1; i < candidate.points.length; i++) {
      const a = candidate.points[i - 1], b = candidate.points[i];
      for (const segment of mesh) {
        if (arcIndex - segment.arc < neighbors) continue;
        const gap = clearance + 2 * error;
        if (Math.max(a.x, b.x) + gap < Math.min(segment.a.x, segment.b.x) ||
            Math.min(a.x, b.x) - gap > Math.max(segment.a.x, segment.b.x) ||
            Math.max(a.y, b.y) + gap < Math.min(segment.a.y, segment.b.y) ||
            Math.min(a.y, b.y) - gap > Math.max(segment.a.y, segment.b.y)) continue;
        if (distance(a, b, segment.a, segment.b) < gap) return false;
      }
    }
    return true;
  }
  const turns = config.radii.flatMap(radius => [step / radius, -step / radius]);
  function choices(previous) {
    // Favor sustained circular sweeps while allowing a different lobe or neck.
    return turns.map(turn => ({ turn, rank: random() + (turn === previous ? 1.0 : 0) }))
      .sort((a, b) => b.rank - a.rank).map(item => item.turn);
  }
  let best = { arcs: [], mesh: [], d: "", length: 0 };
  for (let attempt = 0; attempt < config.attempts; attempt++) {
    const start = { x: margin + (width - 2 * margin) * (0.15 + random() * 0.7),
      y: margin + (height - 2 * margin) * (0.15 + random() * 0.7) };
    const heading = random() * Math.PI * 2;
    const arcs = [], mesh = [];
    const stack = [{ p: start, heading, options: choices(null) }];
    for (let work = 0; work < config.searchBudget && stack.length; work++) {
      const current = stack.at(-1);
      if (!current.options.length) {
        stack.pop();
        if (arcs.length) { arcs.pop(); mesh.splice(-subdivisions); }
        continue;
      }
      const turn = current.options.shift();
      const candidate = propose(current.p, current.heading, turn);
      if (!valid(candidate, mesh, arcs.length)) continue;
      for (let j = 1; j < candidate.points.length; j++) {
        mesh.push({ a: candidate.points[j - 1], b: candidate.points[j], arc: arcs.length });
      }
      arcs.push(candidate);
      if (arcs.length > best.arcs.length) {
        best = { arcs: arcs.slice(), mesh: mesh.slice(), start, length: arcs.length * step };
      }
      if (arcs.length === config.maxSteps) break;
      // Change steering preference after a randomly sized run, never the radii.
      const preferred = random() < 0.13 ? turns[Math.floor(random() * turns.length)] : turn;
      stack.push({ p: candidate.end, heading: current.heading + turn, options: choices(preferred) });
    }
    if (best.arcs.length === config.maxSteps) break;
  }
  best.d = best.start ? `M ${best.start.x} ${best.start.y}` : "";
  for (const arc of best.arcs) {
    const radius = step / Math.abs(arc.turn);
    best.d += ` A ${radius} ${radius} 0 0 ${arc.turn > 0 ? 1 : 0} ${arc.end.x} ${arc.end.y}`;
  }
  return best;
}
