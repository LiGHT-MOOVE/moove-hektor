import { createMotif } from './motif.js';
import { createTile } from './tile.js?v=independent-effects';

/** Validate settings and prepare the geometry once for each animation. */
export function createScene(config, pattern) {
  for (const key of ['motifWidth', 'strokeWidth', 'loopDuration', 'drawDuration', 'headFadePower']) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`${key} must be positive`);
  }
  for (const key of ['blurRatio', 'headFadeLength', 'tailFadeLength', 'pauseDuration']) {
    if (!Number.isFinite(config[key]) || config[key] < 0) throw new Error(`${key} must be non-negative`);
  }
  if (!Number.isFinite(config.opacity) || config.opacity < 0 || config.opacity > 1) {
    throw new Error('Opacity must be between 0 and 1');
  }
  if (!Number.isFinite(config.trailFraction) || config.trailFraction <= 0 || config.trailFraction >= 1) {
    throw new Error('Trail fraction must be between 0 and 1, exclusive');
  }
  if (config.shadowEnabled &&
      (![config.shadowOpacity, config.shadowOffsetX, config.shadowOffsetY].every(Number.isFinite) ||
       config.shadowOpacity < 0 || config.shadowOpacity > 1)) {
    throw new Error('Shadow opacity must be between 0 and 1, and offsets finite');
  }
  if (config.seed != null && !Number.isSafeInteger(config.seed)) throw new Error('Seed must be an integer or null');
  if (config.patternOffset != null &&
      ![config.patternOffset.x, config.patternOffset.y].every(Number.isFinite)) {
    throw new Error('Pattern offset must be null or finite x/y tile fractions');
  }
  for (const key of ['blurEnabled', 'shadowEnabled', 'gradientEnabled']) {
    if (typeof config[key] !== 'boolean') throw new Error(`${key} must be a boolean`);
  }
  if (!['random', 'x', 'y'].includes(config.staggerMode)) throw new Error('Invalid stagger mode');
  if (typeof config.randomStartingPositions !== 'boolean') throw new Error('Random starting positions must be a boolean');
  const seed = config.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const motif = createMotif(pattern);
  const tile = createTile(pattern, seed);
  if (config.patternOffset != null) {
    tile.offset = {
      x: (config.patternOffset.x % 1) * tile.width,
      y: (config.patternOffset.y % 1) * tile.height,
    };
  }
  return { motif, tile, seed };
}
