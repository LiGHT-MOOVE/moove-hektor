import { createRepeats } from './repeats.js';

/** Stagger independent draw/drain/pause cycles for visible motif copies. */
export function createChoreography(config, motif, tile, seed) {
  const repeats = createRepeats(tile.width, tile.height);
  // Random timing and outline phases stay stable across resize.
  function fractionFor(id) {
    let hash = seed >>> 0;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad);
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97);
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296;
  }
  let candidates = [], time = 0;
  const continuous = config.pauseDuration === 0;
  const speed = motif.length / config.loopDuration;
  const span = motif.length * config.trailFraction;
  const duration = config.drawDuration + config.loopDuration * config.trailFraction;
  const cycle = continuous ? config.loopDuration : duration + config.pauseDuration;

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
        const candidate = { id, x: x + offset.x, y: y + offset.y, sign: instance.sign,
          delay: fractionFor(id + ':timing') * cycle };
        candidates.push(candidate);
      }
    });
    if (config.staggerMode !== 'random') {
      // Group equal coordinates, ignoring floating-point noise at tile boundaries.
      const position = instance => Math.round(instance[config.staggerMode] * 1e6) / 1e6;
      const positions = [...new Set(candidates.map(position))].sort((a, b) => a - b);
      const offsets = new Map(positions.map((value, index) => [value, cycle * (1 - index / positions.length)]));
      for (const instance of candidates) instance.delay = offsets.get(position(instance));
    }
  }
  function advance(seconds) {
    time += seconds;
    if (continuous) time %= cycle;
  }
  function trail(instance, elapsed) {
    const draw = continuous ? '' : `:${Math.floor(elapsed / cycle)}`;
    elapsed %= cycle;
    if (!continuous && (elapsed <= 0 || elapsed >= duration)) return [];
    const phase = config.randomStartingPositions ? fractionFor(instance.id + ':phase' + draw) * motif.length : 0;
    const progress = elapsed * speed;
    return [{ instance,
      head: phase + (continuous ? progress : Math.min(progress, config.drawDuration * speed)),
      tail: phase + (continuous ? progress - span : Math.max(0, progress - span)) }];
  }
  function frame() {
    return candidates.flatMap(instance => trail(instance, time + instance.delay));
  }
  return { setViewport, advance, frame };
}
