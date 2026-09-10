import { createGeometry } from './geometry.js';
import { createPortals } from './portals.js';

/** Render short arcs and nearby periodic images; SVG clips after masks and blur. */
export function createPathRenderer(config) {
  const { pointAt } = createGeometry();
  const portals = config.wrapEdges ? createPortals(config.width, config.height) : null;
  const padding = config.strokeWidth / 2 + 4 * config.blur + 4;
  const origin = { x:0, y:0 }, corner = { x:config.width, y:config.height };
  return function slice(arcs, from, to) {
    if (to <= from) return '';
    let d = '', last;
    for (const arc of arcs) {
      if (arc.from >= to) break;
      if (arc.to <= from) continue;
      const a = Math.max(from, arc.from), b = Math.min(to, arc.to);
      const start = pointAt(arc,a), end = pointAt(arc,b);
      const straight = Math.abs(arc.turn) < 1e-10;
      const radius = straight ? 0 : (arc.to-arc.from)/Math.abs(arc.turn);
      const angle = Math.abs(arc.turn)*(b-a)/(arc.to-arc.from);
      // Short arcs lie within this distance of their chord, including edge grazes.
      const sagitta = radius * (1-Math.cos(angle/2));
      const offsets = portals ? portals.offsets(origin,corner,start,end,padding+sagitta) : [origin];
      for (const offset of offsets) {
        const p = { x:start.x+offset.x, y:start.y+offset.y };
        const q = { x:end.x+offset.x, y:end.y+offset.y };
        if (!last || Math.hypot(last.x-p.x,last.y-p.y)>1e-6) d += ` M ${p.x} ${p.y}`;
        d += straight ? ` L ${q.x} ${q.y}` : ` A ${radius} ${radius} 0 0 ${arc.turn>0?1:0} ${q.x} ${q.y}`;
        last = q;
      }
    }
    return d.trim();
  };
}
