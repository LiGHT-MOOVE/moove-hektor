/** Small distance-driven sequencer; no target positions or outline geometry. */
export function createMotif(config, random) {
  if (!Array.isArray(config.motif) || !config.motif.length || config.motif.some((item, index, items) =>
    !Number.isFinite(item.radius) || item.radius <= 0 || !Number.isFinite(item.sweep) ||
    Math.abs(Math.abs(item.sweep) - Math.PI) > 1e-10 ||
    item.radius * Math.PI < config.stepLength ||
    Math.sign(item.sweep) === Math.sign(items[(index + 1) % items.length].sweep))) {
    throw new Error('Horizontal motif requires alternating positive and negative half-turns');
  }
  let index = config.motifRandomStart ? Math.floor(random() * config.motif.length) : 0;
  const mirror = config.motifMirror && random() < 0.5 ? -1 : 1;
  let remaining = Math.PI;
  return {
    peek(maxLength = config.stepLength) {
      const item = config.motif[index];
      const length = Math.min(maxLength, remaining * item.radius);
      return { index, radius: item.radius, length,
        turn: Math.sign(item.sweep) * mirror * length / item.radius,
        remainingLength: remaining * item.radius,
        sectionStart: remaining === Math.PI };
    },
    consume(length) {
      remaining -= length / config.motif[index].radius;
      if (remaining <= 1e-9) {
        index = (index + 1) % config.motif.length;
        remaining = Math.PI;
      }
    },
  };
}
