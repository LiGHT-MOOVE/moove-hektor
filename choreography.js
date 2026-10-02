import { createRepeats } from './repeats.js';

/** Sequence selects visible locations; multiple loops visible copies independently. */
export function createChoreography(config, motif, tile, seed) {
  const repeats = createRepeats(tile.width, tile.height);
  let state = (seed ^ 0x9e3779b9) >>> 0;
  function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ state >>> 15, 1 | state);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  }
  const multiple = config.playback === 'multiple';
  // Position-based phases stay stable across resize without storing offscreen copies.
  function phaseFor(id) {
    if (!config.randomStartingPositions) return 0;
    let hash = seed >>> 0;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad);
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97);
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296 * motif.length;
  }
  let candidates = [], queue = [], active = null, lastId = null, time = 0;
  const duration = config.loopDuration * (1 + config.trailFraction);

  function refill() {
    queue = [...candidates];
    if (config.order === 'shuffle') {
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      if (queue.length > 1 && queue[0].id === lastId) [queue[0], queue[1]] = [queue[1], queue[0]];
    } else {
      const axes = config.order === 'rows' ? ['y', 'x'] : ['x', 'y'];
      queue.sort((a, b) => a[axes[0]] - b[axes[0]] || a[axes[1]] - b[axes[1]] || a.index - b.index);
    }
  }
  function next() {
    if (!queue.length) refill();
    const choice = queue.shift();
    if (!choice) { active = null; return; }
    active = { ...choice, phase: config.randomStartingPositions ? random() * motif.length : 0 };
    lastId = active.id;
  }
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
        const candidate = { x: x + offset.x, y: y + offset.y, sign: instance.sign, index,
          id: `${index}:${Math.round(offset.x / tile.width)}:${Math.round(offset.y / tile.height)}` };
        if (multiple) candidate.phase = phaseFor(candidate.id);
        candidates.push(candidate);
      }
    });
    if (multiple) return;
    queue = []; // Future choices follow the new viewport; an active sequence finishes.
    if (!active) {
      time = 0; next();
    }
  }
  function advance(seconds) {
    if (!multiple && !active) return;
    time += seconds;
    if (multiple) time %= config.loopDuration;
    else if (time >= duration + config.pauseDuration) {
      time %= duration + config.pauseDuration;
      next();
    }
  }
  function frame() {
    const progress = time * motif.length / config.loopDuration;
    const span = motif.length * config.trailFraction;
    if (multiple) return candidates.map(instance => {
      const head = instance.phase + progress;
      return { instance, head, tail: head - span };
    });
    if (!active || time >= duration || time <= 0) return [];
    return [{ instance: active, head: active.phase + Math.min(progress, motif.length),
      tail: active.phase + Math.max(0, progress - span) }];
  }
  return { setViewport, advance, frame };
}
