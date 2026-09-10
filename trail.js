import { createGeometry } from "./geometry.js";
import { createMotif } from "./motif.js";
import { createPortals } from "./portals.js";

/** Distance-driven, bounded-memory walker. All helpers are embedded at build time. */
export function createTrail(config) {
  const { width, height, margin, stepLength: step, minGap, strokeWidth } = config;
  if (![width, height, margin, step, minGap, strokeWidth].every(Number.isFinite) ||
      step <= 0 || minGap < 0 || strokeWidth <= 0 || margin < strokeWidth / 2 ||
      width <= margin * 2 || height <= margin * 2 ||
      ![config.searchBudget, config.attempts].every(n => Number.isInteger(n) && n > 0) ||
      !Array.isArray(config.radii) || config.radii.length !== 2 ||
      !config.radii.every(r => Number.isFinite(r) && r > 0)) {
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
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const clearance = minGap + strokeWidth;
  const neighbors = Math.ceil(clearance / step) + 2;
  // Validate the motif before including its curvature in collision tolerances.
  if (config.motifEnabled) createMotif(config, () => 0.5);
  const maxTurn = step / Math.min(...config.radii,
    ...(config.motifEnabled ? config.motif.map(item => item.radius) : []));
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

  if (![config.trailLength, config.tailFadeLength, config.turnEase].every(n => Number.isFinite(n) && n > 0) ||
      config.tailFadeLength >= config.trailLength || !Number.isFinite(config.straightChance) ||
      config.straightChance < 0 || config.straightChance > 1) throw new Error("Invalid trail settings");
  const turns = config.radii.flatMap(radius => [step / radius, -step / radius]);
  let p = { x: width * (0.3 + random() * 0.4), y: height * (0.3 + random() * 0.4) };
  let heading = random() * Math.PI * 2;
  let turn = turns[Math.floor(random() * turns.length)];
  let target = turn, straightLeft = 0, nextChoice = 10;
  let arcs = [], mesh = [], endDistance = 0, head = 0, blocked = false, index = 0;
  const motif = config.motifEnabled ? createMotif(config,random) : null;
  const approach = targetTurn => turn + clamp(targetTurn - turn, -config.turnEase, config.turnEase);

  function options() {
    if (straightLeft > 0) {
      target = 0;
      if (Math.abs(turn) < 1e-10 && --straightLeft === 0) {
        target = turns[Math.floor(random() * turns.length)]; nextChoice = 12;
      }
    } else if (--nextChoice <= 0) {
      if (random() < config.straightChance) { straightLeft = 3 + Math.floor(random() * 4); target = 0; }
      else target = turns[Math.floor(random() * turns.length)];
      nextChoice = 8 + Math.floor(random() * 9);
    }
    const alternatives = turns.map(value => ({ value, rank: random() }))
      .sort((a,b) => a.rank-b.rank).map(item => item.value);
    const options = [...new Set([approach(target), ...alternatives.map(approach)])];
    const candidates = options.map(value => propose(p, heading, value))
      .filter(curve => valid(curve, mesh, index));
    // A few unseen steps reserve turning space; nothing already displayed backtracks.
    function hasRoom(curve) {
      let point = curve.end, direction = heading + curve.turn;
      for (let i = 0; i < 7; i++) {
        const ahead = propose(point, direction, curve.turn);
        if (!valid(ahead, mesh, index + i + 1)) return false;
        point = ahead.end; direction += curve.turn;
      }
      return true;
    }
    const preferred = candidates.filter(hasRoom);
    return [...preferred, ...candidates.filter(curve => !preferred.includes(curve))];
  }
  function commit(chosen) {
    arcs.push({ ...chosen, start: p, heading, from: endDistance, to: endDistance + chosen.length, id: index });
    for (let j=1; j<chosen.points.length; j++) mesh.push({ a:chosen.points[j-1], b:chosen.points[j], arc:index });
    p = portals ? portals.canonical(chosen.end) : chosen.end; heading += chosen.turn; turn = chosen.turn;
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
    if (motif) {
      const instruction=motif.peek();
      const curve=propose(p,heading,instruction.turn,instruction.length);
      const sectionStart = instruction.sectionStart;
      if (valid(curve,mesh,index) && (!(instruction.interrupted || sectionStart) || motifHasRoom(instruction))) {
        commit({...curve,source:'motif',motifIndex:instruction.index});
        motif.consume(instruction.length);
        return;
      }
      motif.interrupt();
    }
    const chosen = options()[0];
    if (!chosen) { blocked = true; return; }
    commit({...chosen,source:'avoidance'});
  }
  function snapshot() {
    return { p, heading, turn, target, straightLeft, nextChoice, endDistance, index };
  }
  function restore(saved) {
    ({ p, heading, turn, target, straightLeft, nextChoice, endDistance, index } = saved);
    arcs.length = index; mesh.length = index * subdivisions;
  }
  if (!motif) {
    // Explore an unseen opening route so early local dead ends do not dominate.
    // The retained route is bounded by the visible trail length plus one step.
    const openingSteps = Math.ceil((config.trailLength + config.tailFadeLength) / step) + 1;
    let best;
    for (let attempt = 0; attempt < config.attempts; attempt++) {
      p = { x: width * (0.3 + random() * 0.4), y: height * (0.3 + random() * 0.4) };
      heading = random() * Math.PI * 2; turn = turns[Math.floor(random() * turns.length)];
      target = turn; straightLeft = 0; nextChoice = 10; endDistance = 0; index = 0;
      arcs = []; mesh = [];
      let first = options();
      const stack = [{ saved: snapshot(), choices: first }];
      for (let work = 0; work < config.searchBudget && stack.length; work++) {
        const node = stack.at(-1);
        restore(node.saved);
        if (!node.choices.length) { stack.pop(); continue; }
        commit(node.choices.shift());
        if (!best || index > best.saved.index) best = { saved: snapshot(), arcs: arcs.slice(), mesh: mesh.slice() };
        if (index >= openingSteps) break;
        const next = options();
        stack.push({ saved: snapshot(), choices: next });
      }
      if (best?.saved.index >= openingSteps) break;
    }
    if (best) {
      arcs = best.arcs; mesh = best.mesh; restore(best.saved);
    } else { arcs = []; mesh = []; index = 0; endDistance = 0; blocked = true; }

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
