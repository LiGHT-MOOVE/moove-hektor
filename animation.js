import { createScene } from './scene.js';
import { createPathRenderer } from './renderer.js';

/** Animate one tile; native SVG pattern repetition fills any viewport. */
export function initialize(config, pattern, root = document.documentElement, still = false, scene = createScene(config, pattern)) {
  const get = id => root.querySelector(`#${id}`);
  const path = get('trail');
  const body = get('tail-body');
  const headBody = get('head-body');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const { motif, tile, seed } = scene;
  root.dataset.seed = String(seed);
  const slice = createPathRenderer(config, motif, tile);
  const scale = config.motifWidth / motif.width;
  get('motifs').setAttribute('patternTransform', `matrix(${scale} 0 0 ${scale} ${tile.offset.x * scale} ${tile.offset.y * scale})`);
  const isStatic = () => still || preference.matches;
  const count = 32;
  function bands(id, brightness) {
    const group = get(id);
    return Array.from({ length: count }, (_, i) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const value = Math.round(255 * brightness((i + 0.5) / count));
      node.setAttribute('stroke', `rgb(${value},${value},${value})`);
      group.appendChild(node);
      return node;
    });
  }
  const tails = bands('tail-ramp', t => t);
  const heads = bands('head-ramp', t => Math.pow(1 - t, config.headFadePower));
  let frame, previous, distance = 0, disposed = false;
  const span = motif.length * config.trailFraction;
  const tailSpan = Math.min(config.tailFadeLength, span);
  const headSpan = Math.min(config.headFadeLength, span);
  const cycling = config.pauseBetweenDrawings;
  const cycleDuration = config.loopDuration * (1 + config.trailFraction);
  const clocks = tile.instances.map(instance => ({ time: -instance.delay, delay: instance.delay }));
  function render() {
    let drawing = '', tailBody = '', leadingBody = '';
    const tailPaths = Array(count).fill(''), headPaths = Array(count).fill('');
    const staticMode = isStatic();
    for (const [index, instance] of tile.instances.entries()) {
      if (staticMode) {
        drawing += ' ' + slice(instance, 0, motif.length);
        continue;
      }
      let head = distance + instance.phase, tail = head - span;
      if (cycling) {
        const progress = clocks[index].time * motif.length / config.loopDuration;
        if (progress <= 0 || progress >= motif.length + span) continue;
        head = instance.phase + Math.min(progress, motif.length);
        tail = instance.phase + Math.max(0, progress - span);
      }
      const tailRamp = Math.min(tailSpan, head - tail);
      const headRamp = Math.min(headSpan, head - tail);
      drawing += ' ' + slice(instance, tail, head);
      tailBody += ' ' + slice(instance, tail + tailRamp, head);
      leadingBody += ' ' + slice(instance, tail, head - headRamp);
      for (let i = 0; i < count; i++) {
        tailPaths[i] += ' ' + slice(instance, tail + tailRamp * i / count, tail + tailRamp * (i + 1) / count);
        headPaths[i] += ' ' + slice(instance, head - headRamp + headRamp * i / count, head - headRamp + headRamp * (i + 1) / count);
      }
    }
    path.setAttribute('d', drawing);
    body.setAttribute('d', staticMode ? drawing : tailBody);
    headBody.setAttribute('d', staticMode ? drawing : leadingBody);
    tails.forEach((node, i) => node.setAttribute('d', tailPaths[i]));
    heads.forEach((node, i) => node.setAttribute('d', headPaths[i]));
  }
  function tick(timestamp) {
    if (disposed || isStatic()) return;
    const dt = previous === undefined ? 0 : Math.max(0, Math.min(50, timestamp - previous));
    previous = timestamp;
    if (cycling) {
      for (const clock of clocks) {
        clock.time += dt / 1000;
        if (clock.time >= cycleDuration) {
          clock.time = (clock.time + clock.delay) % (cycleDuration + clock.delay) - clock.delay;
        }
      }
    } else {
      distance = (distance + motif.length * dt / (config.loopDuration * 1000)) % motif.length;
    }
    render();
    frame = requestAnimationFrame(tick);
  }
  function onPreferenceChange() {
    cancelAnimationFrame(frame); previous = undefined;
    render();
    if (!isStatic()) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    disposed = true; cancelAnimationFrame(frame);
    preference.removeEventListener('change', onPreferenceChange);
    window.removeEventListener('pagehide', onPageHide);
  }
  function onPageHide(event) { if (!event.persisted) dispose(); }
  preference.addEventListener('change', onPreferenceChange);
  window.addEventListener('pagehide', onPageHide);
  onPreferenceChange();
  return dispose;
}
