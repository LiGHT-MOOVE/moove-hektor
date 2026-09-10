import { createGeometry } from './geometry.js';

/** Periodic coordinates and relevant tile offsets, independent of rendering. */
export function createPortals(width, height) {
  const { segmentDistance } = createGeometry();
  const wrap = (value, size) => ((value % size) + size) % size;
  const canonical = p => ({ x: wrap(p.x, width), y: wrap(p.y, height) });
  // Translate the c/d box to overlap the a/b box expanded by gap.
  function* offsets(a, b, c, d, gap) {
    const x0=Math.ceil((Math.min(a.x,b.x)-gap-Math.max(c.x,d.x))/width);
    const x1=Math.floor((Math.max(a.x,b.x)+gap-Math.min(c.x,d.x))/width);
    const y0=Math.ceil((Math.min(a.y,b.y)-gap-Math.max(c.y,d.y))/height);
    const y1=Math.floor((Math.max(a.y,b.y)+gap-Math.min(c.y,d.y))/height);
    for (let x=x0; x<=x1; x++) for (let y=y0; y<=y1; y++) yield { x:x*width, y:y*height };
  }
  function collides(a, b, c, d, gap) {
    for (const offset of offsets(a,b,c,d,gap)) {
      const shift = p => ({ x:p.x+offset.x, y:p.y+offset.y });
      if (segmentDistance(a,b,shift(c),shift(d)) < gap) return true;
    }
    return false;
  }
  return { canonical, offsets, collides };
}
