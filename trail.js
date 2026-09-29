import { createGeometry } from "./geometry.js";
import { createMotif } from "./motif.js";
import { createPortals } from "./portals.js";

/** Distance-driven, bounded-memory walker. All helpers are embedded at build time. */
export function createTrail(config) {
  const { width, height, margin, stepLength: step, minGap, strokeWidth } = config;
  if (![width, height, margin, step, minGap, strokeWidth].every(Number.isFinite) ||
      step <= 0 || minGap < 0 || strokeWidth <= 0 || margin < strokeWidth / 2 ||
      width <= margin * 2 || height <= margin * 2 ||
      !["left", "right", "random"].includes(config.travelDirection)) {
    throw new Error("Invalid walker configuration");
  }
  const { arcPoint, segmentDistance } = createGeometry();
  const portals = config.wrapEdges ? createPortals(width, height) : null;
  let state = config.seed >>> 0;
  function random() {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const clearance = minGap + strokeWidth;
  const neighbors = Math.ceil(clearance / step) + 2;
  const motif = createMotif(config, random);
  const maxTurn = step / Math.min(...config.motif.map(item => item.radius));
  // Bound the exempt local neighborhood to less than a quarter turn.
  if (maxTurn * (neighbors + 1) >= Math.PI / 2) {
    throw new Error("Radii too small for the stroke width, gap, and step length");
  }
  if (portals && Math.min(width, height) <= 2 * ((neighbors + 1) * step + clearance)) {
    throw new Error("Portal viewport too small for the local stroke neighborhood");
  }
  const subdivisions = 4;
  const error = step * maxTurn / (8 * subdivisions ** 2);
  function propose(p, heading, turn, arcLength = step) {
    const points = [p];
    for (let i = 1; i <= subdivisions; i++) {
      points.push(arcPoint(p, heading, turn, arcLength, i / subdivisions));
    }
    return { points, turn, length: arcLength, end: points.at(-1) };
  }
  function valid(candidate, mesh, arcIndex) {
    if (!portals) for (const p of candidate.points) {
      if (p.x < margin + error || p.x > width - margin - error ||
          p.y < margin + error || p.y > height - margin - error) return false;
    }
    for (let i = 1; i < candidate.points.length; i++) {
      const a = candidate.points[i - 1], b = candidate.points[i];
      for (const segment of mesh) {
        if (arcIndex - segment.arc < neighbors) continue;
        const gap = clearance + 2 * error;
        if (portals) {
          if (portals.collides(a, b, segment.a, segment.b, gap)) return false;
          continue;
        }
        if (Math.max(a.x, b.x) + gap < Math.min(segment.a.x, segment.b.x) ||
            Math.min(a.x, b.x) - gap > Math.max(segment.a.x, segment.b.x) ||
            Math.max(a.y, b.y) + gap < Math.min(segment.a.y, segment.b.y) ||
            Math.min(a.y, b.y) - gap > Math.max(segment.a.y, segment.b.y)) continue;
        if (segmentDistance(a, b, segment.a, segment.b) < gap) return false;
      }
    }
    return true;
  }

  if (![config.trailLength, config.tailFadeLength].every(n => Number.isFinite(n) && n > 0) ||
      config.tailFadeLength >= config.trailLength) throw new Error("Invalid trail settings");
  let p = { x: width * (0.3 + random() * 0.4), y: height * (0.3 + random() * 0.4) };
  const left = config.travelDirection === "left" || (config.travelDirection === "random" && random() < 0.5);
  // A half-circle advances perpendicular to its initial tangent.
  let heading = (left ? Math.PI : 0) - Math.sign(motif.peek().turn) * Math.PI / 2;
  let arcs = [], mesh = [], endDistance = 0, head = 0, blocked = false, index = 0;

  function commit(chosen) {
    arcs.push({ ...chosen, start: p, heading, from: endDistance, to: endDistance + chosen.length, id: index });
    for (let j=1; j<chosen.points.length; j++) mesh.push({ a:chosen.points[j-1], b:chosen.points[j], arc:index });
    p = portals ? portals.canonical(chosen.end) : chosen.end; heading += chosen.turn;
    endDistance += chosen.length; index++;
  }

  function motifHasRoom(instruction) {
    let point=p, direction=heading, remaining=instruction.remainingLength, aheadIndex=index;
    const future=[];
    while (remaining > 1e-8) {
      const length=Math.min(step,remaining);
      const curve=propose(point,direction,Math.sign(instruction.turn)*length/instruction.radius,length);
      if (!valid(curve,mesh,aheadIndex) || !valid(curve,future,aheadIndex)) return false;
      for(let j=1;j<curve.points.length;j++) future.push({a:curve.points[j-1],b:curve.points[j],arc:aheadIndex});
      point=portals?portals.canonical(curve.end):curve.end;
      direction+=curve.turn;remaining-=length;aheadIndex++;
    }
    return true;
  }
  function extend() {
    const instruction = motif.peek();
    // Stop at a motif boundary rather than starting a section that cannot fit.
    if (instruction.sectionStart && !motifHasRoom(instruction)) {
      blocked = true;
      return;
    }
    const curve = propose(p, heading, instruction.turn, instruction.length);
    if (!valid(curve, mesh, index)) { blocked = true; return; }
    commit({ ...curve, motifIndex:instruction.index });
    motif.consume(instruction.length);
  }

  return {
    advance(distance) {
      if (!Number.isFinite(distance) || distance < head) throw new Error("Head distance must increase");
      // Generate only at the head; retain all geometry still visible at this instant.
      // Callers advance by at most one step, preventing jumps across collision history.
      if (distance - head > step + 1e-7) throw new Error("Advance by at most one step");
      while (!blocked && endDistance < distance) extend();
      head = Math.min(distance, endDistance);
      const tail = Math.max(0, head - config.trailLength - config.tailFadeLength);
      arcs = arcs.filter(arc => arc.to > tail);
      const first = arcs.length ? arcs[0].id : index;
      mesh = mesh.filter(segment => segment.arc >= first);
      return { head, tail, blocked: blocked && head >= endDistance,
        arcs, mesh, length: head - tail };
    },
  };
}
