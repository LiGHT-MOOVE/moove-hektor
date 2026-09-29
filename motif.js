import { createGeometry } from './geometry.js';

/** Build one closed circular outline, centered on its exact bounds. */
export function createMotif(config) {
  const { arcPoint } = createGeometry();
  if (!Array.isArray(config.turns) || !config.turns.length) throw new Error('Empty motif');
  let p = { x: 0, y: 0 }, heading = 0, length = 0;
  const arcs = [], points = [p];
  for (const { radius, degrees } of config.turns) {
    const sweep = degrees * Math.PI / 180;
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(sweep) || !sweep) {
      throw new Error('Invalid circular turn');
    }
    const count = Math.ceil(Math.abs(sweep) / (Math.PI / 2));
    const turn = sweep / count, step = radius * Math.abs(turn);
    for (let i = 0; i < count; i++) {
      arcs.push({ start: p, heading, turn, from: length, to: length + step });
      // Include extrema where either tangent component vanishes.
      const low = Math.min(heading, heading + turn), high = Math.max(heading, heading + turn);
      for (let k = Math.ceil(low / (Math.PI / 2)); k * Math.PI / 2 <= high; k++) {
        points.push(arcPoint(p, heading, turn, step, (k * Math.PI / 2 - heading) / turn));
      }
      p = arcPoint(p, heading, turn, step, 1);
      points.push(p); heading += turn; length += step;
    }
  }
  if (Math.hypot(p.x, p.y) > 1e-6 || Math.abs(Math.sin(heading / 2)) > 1e-8) {
    throw new Error('Motif must close in position and tangent');
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  for (const arc of arcs) arc.start = { x: arc.start.x - cx, y: arc.start.y - cy };
  return { arcs, length, width, height };
}
