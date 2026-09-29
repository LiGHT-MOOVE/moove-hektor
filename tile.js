/** Fixed repeat geometry; viewport size never changes internal spacing. */
export function createTile(pattern, motif, seed) {
  const { tileWidth: width, tileHeight: height, motifs } = pattern;
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid tile dimensions');
  if (!Array.isArray(motifs) || !motifs.length) throw new Error('Tile must contain at least one motif');
  for (const placement of motifs) {
    if (!placement || ![placement.x, placement.y].every(Number.isFinite) ||
        ![0, 180].includes(placement.rotation) ||
        !Number.isFinite(placement.delay) || placement.delay < 0) throw new Error('Each motif needs finite x/y and rotation 0 or 180, and a non-negative delay');
  }
  function random(key) {
    let x = (seed ^ Math.imul(key + 1, 0x9e3779b9)) >>> 0;
    x = Math.imul(x ^ x >>> 16, 0x21f0aaad);
    x = Math.imul(x ^ x >>> 15, 0x735a2d97);
    return ((x ^ x >>> 15) >>> 0) / 4294967296;
  }
  const instances = motifs.map(({ x, y, rotation, delay }, index) => ({
    x: x * width, y: y * height, delay, sign: rotation === 180 ? -1 : 1,
    phase: random(2 + index) * motif.length,
  }));
  return { width, height, instances, offset: { x: random(0) * width, y: random(1) * height } };
}
