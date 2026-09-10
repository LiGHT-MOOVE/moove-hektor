/** Small distance-driven sequencer; no target positions or outline geometry. */
export function createMotif(config, random) {
  if (!Array.isArray(config.motif) || !config.motif.length || config.motif.some(item =>
    !Number.isFinite(item.radius) || item.radius <= 0 || !Number.isFinite(item.sweep) ||
    item.sweep === 0 || Math.abs(item.sweep) > Math.PI * 2 ||
    item.radius * Math.abs(item.sweep) < config.stepLength)) throw new Error('Invalid turn motif');
  let index = config.motifRandomStart ? Math.floor(random() * config.motif.length) : 0;
  const mirror = config.motifMirror && random() < 0.5 ? -1 : 1;
  let remaining = Math.abs(config.motif[index].sweep);
  let interrupted = false;
  return {
    peek(maxLength = config.stepLength) {
      const item = config.motif[index];
      const length = Math.min(maxLength, remaining * item.radius);
      return { index, radius: item.radius, length,
        turn: Math.sign(item.sweep) * mirror * length / item.radius,
        remainingLength: remaining * item.radius, interrupted };
    },
    consume(length) {
      remaining -= length / config.motif[index].radius;
      interrupted = false;
      if (remaining <= 1e-9) {
        index = (index + 1) % config.motif.length;
        remaining = Math.abs(config.motif[index].sweep);
      }
    },
    interrupt() {
      // Restart the interrupted section once there is room, without advancing it.
      if (!interrupted) remaining = Math.abs(config.motif[index].sweep);
      interrupted = true;
    },
  };
}
