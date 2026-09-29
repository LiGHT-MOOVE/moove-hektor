/** Relevant periodic tile offsets, independent of rendering. */
export function createRepeats(width, height) {
  // Translate the c/d box to overlap the a/b box expanded by gap.
  function* offsets(a, b, c, d, gap) {
    const x0=Math.ceil((Math.min(a.x,b.x)-gap-Math.max(c.x,d.x))/width);
    const x1=Math.floor((Math.max(a.x,b.x)+gap-Math.min(c.x,d.x))/width);
    const y0=Math.ceil((Math.min(a.y,b.y)-gap-Math.max(c.y,d.y))/height);
    const y1=Math.floor((Math.max(a.y,b.y)+gap-Math.min(c.y,d.y))/height);
    for (let x=x0; x<=x1; x++) for (let y=y0; y<=y1; y++) yield { x:x*width, y:y*height };
  }
  return { offsets };
}
