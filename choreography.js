import { createRepeats } from './repeats.js';

/** Stagger independent draw/drain/pause cycles for visible motif copies. */
export function createChoreography(config, motif, tile, seed) {
  const repeats = createRepeats(tile.width, tile.height);
  // Position-based timing and phases stay stable across resize.
  function fractionFor(id) {
    let hash = seed >>> 0;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad);
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97);
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296;
  }
  let candidates = [], time = 0;
  const duration = config.loopDuration * (1 + config.trailFraction);
  const cycle = duration + config.pauseDuration;

  function setViewport(bounds) {
    const min = { x: bounds.x, y: bounds.y };
    const max = { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    candidates = [];
    tile.instances.forEach((instance, index) => {
      const x = ((instance.x % tile.width) + tile.width) % tile.width;
      const y = ((instance.y % tile.height) + tile.height) % tile.height;
      const a = { x: x - motif.width / 2, y: y - motif.height / 2 };
      const b = { x: x + motif.width / 2, y: y + motif.height / 2 };
      for (const offset of repeats.offsets(min, max, a, b, 0)) {
        const id = `${index}:${Math.round(offset.x / tile.width)}:${Math.round(offset.y / tile.height)}`;
        const candidate = { x: x + offset.x, y: y + offset.y, sign: instance.sign,
          phase: config.randomStartingPositions ? fractionFor(id + ':phase') * motif.length : 0,
          delay: fractionFor(id + ':timing') * cycle };
        candidates.push(candidate);
      }
    });
  }
  function advance(seconds) {
    time = (time + seconds) % cycle;
  }
  function trail(instance, elapsed) {
    if (elapsed <= 0 || elapsed >= duration) return [];
    const progress = elapsed * motif.length / config.loopDuration;
    return [{ instance, head: instance.phase + Math.min(progress, motif.length),
      tail: instance.phase + Math.max(0, progress - motif.length * config.trailFraction) }];
  }
  function frame() {
    return candidates.flatMap(instance => trail(instance, (time + instance.delay) % cycle));
  }
  return { setViewport, advance, frame };
}
