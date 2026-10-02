import { createScene } from './scene.js?v=trails-only';
import { createPathRenderer, renderPadding } from './renderer.js?v=relative-blur';
import { createChoreography } from './choreography.js?v=trails-only';

/** Animate visible instances; use the native repeat for static inspection. */
export function initialize(config, pattern, root = document.documentElement, still = false, scene = createScene(config, pattern), viewport = null) {
  const get = id => root.querySelector(`#${id}`);
  const path = get('trail');
  const body = get('tail-body');
  const headBody = get('head-body');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const { motif, tile, seed } = scene;
  root.dataset.seed = String(seed);
  const slice = createPathRenderer(config, motif);
  const repeatSlice = createPathRenderer(config, motif, tile);
  const choreography = createChoreography(config, motif, tile, seed);
  const drawingGroup = get('drawing');
  const patternNode = get('motifs');
  const activeLayer = get('active-trail');
  const padding = renderPadding(config);
  let bounds;
  const scale = config.motifWidth / motif.width;
  const offset = tile.offset;
  patternNode.setAttribute('patternTransform', `matrix(${scale} 0 0 ${scale} ${offset.x * scale} ${offset.y * scale})`);
  activeLayer.setAttribute('transform', patternNode.getAttribute('patternTransform'));
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
  let frame, previous, disposed = false;
  const span = motif.length * config.trailFraction;
  const tailSpan = Math.min(config.tailFadeLength, span);
  const headSpan = Math.min(config.headFadeLength, span);
  function setRegion(region) {
    for (const id of ['soften', 'tail-mask', 'head-mask']) {
      for (const [key, value] of Object.entries(region)) get(id).setAttribute(key, value);
    }
  }
  function updateViewport() {
    const width = viewport?.width ?? root.clientWidth;
    const height = viewport?.height ?? root.clientHeight;
    if (!(width > 0 && height > 0)) return;
    bounds = { x: -width / (2 * scale) - tile.offset.x, y: -height / (2 * scale) - tile.offset.y,
      width: width / scale, height: height / scale };
    choreography.setViewport(bounds);
    configureLayer();
    render();
  }
  function configureLayer() {
    const patternMode = isStatic();
    (patternMode ? patternNode : activeLayer).appendChild(drawingGroup);
    get('field').style.display = patternMode ? '' : 'none';
    const region = patternMode ? { x: 0, y: 0, width: tile.width, height: tile.height } : bounds;
    if (region) setRegion({ x: region.x - padding, y: region.y - padding,
      width: region.width + 2 * padding, height: region.height + 2 * padding });
  }
  function render() {
    let drawing = '', tailBody = '', leadingBody = '';
    const tailPaths = Array(count).fill(''), headPaths = Array(count).fill('');
    const staticMode = isStatic();
    if (staticMode) {
      drawing = tile.instances.map(instance => repeatSlice(instance, 0, motif.length)).join(' ');
    } else for (const { instance, head, tail } of choreography.frame()) {
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
    choreography.advance(dt / 1000);
    render();
    frame = requestAnimationFrame(tick);
  }
  function onPreferenceChange() {
    cancelAnimationFrame(frame); previous = undefined;
    configureLayer();
    render();
    if (!isStatic()) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    disposed = true; cancelAnimationFrame(frame);
    observer?.disconnect();
    preference.removeEventListener('change', onPreferenceChange);
    window.removeEventListener('pagehide', onPageHide);
  }
  function onPageHide(event) { if (!event.persisted) dispose(); }
  const observer = viewport ? null : new ResizeObserver(updateViewport);
  observer?.observe(root);
  updateViewport();
  preference.addEventListener('change', onPreferenceChange);
  window.addEventListener('pagehide', onPageHide);
  onPreferenceChange();
  return dispose;
}
