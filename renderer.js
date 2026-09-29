import { createGeometry } from './geometry.js';
import { createRepeats } from './repeats.js';

export function renderPadding(config) {
  const shadow = config.shadowEnabled ? Math.max(Math.abs(config.shadowOffsetX), Math.abs(config.shadowOffsetY)) : 0;
  return config.strokeWidth / 2 + 4 * config.blur + shadow + 4;
}

/** Slice a closed loop and render its rotated instances through tile boundaries. */
export function createPathRenderer(config, motif, tile) {
  const { pointAt } = createGeometry();
  const repeats = createRepeats(tile.width, tile.height);
  const padding = renderPadding(config);
  const origin = { x: 0, y: 0 }, corner = { x: tile.width, y: tile.height };
  return function slice(instance, from, to) {
    if (to <= from) return '';
    const span = Math.min(to - from, motif.length);
    from = ((from % motif.length) + motif.length) % motif.length;
    to = from + span;
    let d = '', last;
    for (let lap = 0; lap <= (to > motif.length ? 1 : 0); lap++) {
      for (const arc of motif.arcs) {
        const a = Math.max(from - lap * motif.length, arc.from);
        const b = Math.min(to - lap * motif.length, arc.to);
        if (b <= a) continue;
        const transform = p => ({ x: instance.x + p.x * instance.sign, y: instance.y + p.y * instance.sign });
        const start = transform(pointAt(arc, a)), end = transform(pointAt(arc, b));
        const radius = (arc.to - arc.from) / Math.abs(arc.turn);
        const angle = Math.abs(arc.turn) * (b - a) / (arc.to - arc.from);
        const sagitta = radius * (1 - Math.cos(angle / 2));
        for (const offset of repeats.offsets(origin, corner, start, end, padding + sagitta)) {
          const p = { x: start.x + offset.x, y: start.y + offset.y };
          const q = { x: end.x + offset.x, y: end.y + offset.y };
          if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) d += ` M ${p.x} ${p.y}`;
          d += ` A ${radius} ${radius} 0 0 ${arc.turn > 0 ? 1 : 0} ${q.x} ${q.y}`;
          last = q;
        }
      }
    }
    return d.trim();
  };
}
