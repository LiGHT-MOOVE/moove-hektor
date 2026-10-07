/** Shared Studio / standalone SVG engine. Keep all runtime dependencies in this file. */
import type { HektorConfig, HektorPattern } from "./project";

export type Point = { x: number; y: number };
export type Bounds = Point & { width: number; height: number };
type Arc = { start: Point; heading: number; turn: number; from: number; to: number };
type Motif = { arcs: Arc[]; length: number; width: number; height: number };
type Instance = Point & { sign: number };
type Candidate = Instance & { id: string; delay: number };
type Tile = ReturnType<typeof createTile>;

/** Shared Euclidean geometry; no animation state or SVG dependencies. */
export function createGeometry() {
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  function arcPoint(start: Point, heading: number, turn: number, length: number, fraction: number) {
    const half = turn * fraction / 2;
    const chord = length * fraction * (Math.abs(half) < 1e-10 ? 1 : Math.sin(half) / half);
    return { x: start.x + chord * Math.cos(heading + half),
      y: start.y + chord * Math.sin(heading + half) };
  }
  function pointAt(arc: Arc, distance: number) {
    const length = arc.to - arc.from;
    return arcPoint(arc.start, arc.heading, arc.turn, length,
      clamp((distance - arc.from) / length, 0, 1));
  }
  return { arcPoint, pointAt };
}


/** Build one closed circular outline, centered on its exact bounds. */
export function createMotif(config: HektorPattern): Motif {
  const { arcPoint } = createGeometry();
  if (!Array.isArray(config.turns) || !config.turns.length) throw new Error('Empty motif');
  let p = { x: 0, y: 0 }, heading = 0, length = 0;
  const arcs: Arc[] = [], points = [p];
  for (const { radius, degrees } of config.turns) {
    const sweep = degrees * Math.PI / 180;
    if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(sweep) || !sweep) {
      throw new Error('Invalid circular turn');
    }
    const count = Math.ceil(Math.abs(sweep) / (Math.PI / 2));
    const turn = sweep / count, step = radius * Math.abs(turn);
    for (let i = 0; i < count; i++) {
      arcs.push({ start: p, heading, turn, from: length, to: length + step });
      // Include extrema where either tangent component vanishes.
      const low = Math.min(heading, heading + turn), high = Math.max(heading, heading + turn);
      for (let k = Math.ceil(low / (Math.PI / 2)); k * Math.PI / 2 <= high; k++) {
        points.push(arcPoint(p, heading, turn, step, (k * Math.PI / 2 - heading) / turn));
      }
      p = arcPoint(p, heading, turn, step, 1);
      points.push(p); heading += turn; length += step;
    }
  }
  if (Math.hypot(p.x, p.y) > 1e-6 || Math.abs(Math.sin(heading / 2)) > 1e-8) {
    throw new Error('Motif must close in position and tangent');
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  for (const arc of arcs) arc.start = { x: arc.start.x - cx, y: arc.start.y - cy };
  return { arcs, length, width, height };
}

/** Relevant periodic tile offsets, independent of rendering. */
export function createRepeats(width: number, height: number) {
  // Translate the c/d box to overlap the a/b box expanded by gap.
  function* offsets(a: Point, b: Point, c: Point, d: Point, gap: number) {
    const x0=Math.ceil((Math.min(a.x,b.x)-gap-Math.max(c.x,d.x))/width);
    const x1=Math.floor((Math.max(a.x,b.x)+gap-Math.min(c.x,d.x))/width);
    const y0=Math.ceil((Math.min(a.y,b.y)-gap-Math.max(c.y,d.y))/height);
    const y1=Math.floor((Math.max(a.y,b.y)+gap-Math.min(c.y,d.y))/height);
    for (let x=x0; x<=x1; x++) for (let y=y0; y<=y1; y++) yield { x:x*width, y:y*height };
  }
  return { offsets };
}

/** Fixed repeat geometry; viewport size never changes internal spacing. */
export function createTile(pattern: HektorPattern, seed: number) {
  const { tileWidth: width, tileHeight: height, motifs } = pattern;
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid tile dimensions');
  if (!Array.isArray(motifs) || !motifs.length) throw new Error('Tile must contain at least one motif');
  for (const placement of motifs) {
    if (!placement || ![placement.x, placement.y].every(Number.isFinite) ||
        ![0, 180].includes(placement.rotation)) throw new Error('Each motif needs finite x/y and rotation 0 or 180');
  }
  function random(key: number) {
    let x = (seed ^ Math.imul(key + 1, 0x9e3779b9)) >>> 0;
    x = Math.imul(x ^ x >>> 16, 0x21f0aaad);
    x = Math.imul(x ^ x >>> 15, 0x735a2d97);
    return ((x ^ x >>> 15) >>> 0) / 4294967296;
  }
  const instances = motifs.map(({ x, y, rotation }) => ({
    x: x * width, y: y * height, sign: rotation === 180 ? -1 : 1,
  }));
  return { width, height, instances, offset: { x: random(0) * width, y: random(1) * height } };
}



/** Validate settings and prepare the geometry once for each animation. */
export function createScene(config: HektorConfig, pattern: HektorPattern) {
  for (const key of ['motifWidth', 'strokeWidth', 'loopDuration', 'drawDuration', 'headFadePower'] as const) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`${key} must be positive`);
  }
  for (const key of ['blurRatio', 'headFadeLength', 'tailFadeLength', 'pauseDuration'] as const) {
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
  for (const key of ['blurEnabled', 'shadowEnabled', 'gradientEnabled'] as const) {
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



export function renderPadding(config: HektorConfig) {
  const shadow = config.shadowEnabled ? Math.max(Math.abs(config.shadowOffsetX), Math.abs(config.shadowOffsetY)) : 0;
  return config.strokeWidth / 2 + 4 * (config.blurEnabled ? config.strokeWidth * config.blurRatio : 0) + shadow + 4;
}

/** Slice a closed loop and render its rotated instances through tile boundaries. */
export function createPathRenderer(config: HektorConfig, motif: Motif, tile: Tile | null = null) {
  const { pointAt } = createGeometry();
  const repeats = tile && createRepeats(tile.width, tile.height);
  const padding = renderPadding(config);
  const origin = { x: 0, y: 0 }, corner = tile && { x: tile.width, y: tile.height };
  return function slice(instance: Instance, from: number, to: number) {
    if (to <= from) return '';
    const span = Math.min(to - from, motif.length);
    from = ((from % motif.length) + motif.length) % motif.length;
    to = from + span;
    let d = '', last: Point | undefined;
    for (let lap = 0; lap <= (to > motif.length ? 1 : 0); lap++) {
      for (const arc of motif.arcs) {
        const a = Math.max(from - lap * motif.length, arc.from);
        const b = Math.min(to - lap * motif.length, arc.to);
        if (b <= a) continue;
        const transform = (p: Point) => ({ x: instance.x + p.x * instance.sign, y: instance.y + p.y * instance.sign });
        const start = transform(pointAt(arc, a)), end = transform(pointAt(arc, b));
        const radius = (arc.to - arc.from) / Math.abs(arc.turn);
        const angle = Math.abs(arc.turn) * (b - a) / (arc.to - arc.from);
        const sagitta = radius * (1 - Math.cos(angle / 2));
        for (const offset of repeats ? repeats.offsets(origin, corner!, start, end, padding + sagitta) : [origin]) {
          const p = { x: start.x + offset.x, y: start.y + offset.y };
          const q = { x: end.x + offset.x, y: end.y + offset.y };
          if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) d += ` M ${p.x} ${p.y}`;
          d += ` A ${radius} ${radius} 0 0 ${arc.turn > 0 ? 1 : 0} ${q.x} ${q.y}`;
          last = q;
        }
      }
    }
    return d.trim();
  };
}


/** Stagger independent draw/drain/pause cycles for visible motif copies. */
export function createChoreography(config: HektorConfig, motif: Motif, tile: Tile, seed: number) {
  const repeats = createRepeats(tile.width, tile.height);
  // Random timing and outline phases stay stable across resize.
  function fractionFor(id: string) {
    let hash = seed >>> 0;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad);
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97);
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296;
  }
  let candidates: Candidate[] = [], time = 0;
  const continuous = config.pauseDuration === 0;
  const speed = motif.length / config.loopDuration;
  const span = motif.length * config.trailFraction;
  const duration = config.drawDuration + config.loopDuration * config.trailFraction;
  const cycle = continuous ? config.loopDuration : duration + config.pauseDuration;

  function setViewport(bounds: Bounds) {
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
      const axis = config.staggerMode;
      const position = (instance: Instance) => Math.round(instance[axis] * 1e6) / 1e6;
      const positions = [...new Set(candidates.map(position))].sort((a, b) => a - b);
      const offsets = new Map(positions.map((value, index) => [value, cycle * (1 - index / positions.length)]));
      for (const instance of candidates) instance.delay = offsets.get(position(instance))!;
    }
  }
  function advance(seconds: number) {
    time += seconds;
    if (continuous) time %= cycle;
  }
  function trail(instance: Candidate, elapsed: number) {
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




/** Animate visible instances; use the native repeat for static inspection. */
export function initialize(config: HektorConfig, pattern: HektorPattern, root: SVGSVGElement = document.documentElement as unknown as SVGSVGElement, still = false, scene = createScene(config, pattern), viewport: { width: number; height: number } | null = null) {
  const get = (id: string): SVGElement => {
    const node = root.querySelector<SVGElement>(`#${id}`);
    if (!node) throw new Error(`Missing SVG element: ${id}`);
    return node;
  };
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
  let bounds: Bounds | undefined;
  const scale = config.motifWidth / motif.width;
  const offset = tile.offset;
  patternNode.setAttribute('patternTransform', `matrix(${scale} 0 0 ${scale} ${offset.x * scale} ${offset.y * scale})`);
  activeLayer.setAttribute('transform', patternNode.getAttribute('patternTransform')!);
  const isStatic = () => still || preference.matches;
  const count = 32;
  function bands(id: string, brightness: (fraction: number) => number) {
    const group = get(id);
    return Array.from({ length: count }, (_, i) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const value = Math.round(255 * brightness((i + 0.5) / count));
      node.setAttribute('stroke', `rgb(${value},${value},${value})`);
      group.appendChild(node);
      return node;
    });
  }
  // Paint both ramps from the transparent tip toward the solid body.
  const tails = bands('tail-ramp', t => t);
  const heads = bands('head-ramp', t => Math.pow(t, config.headFadePower));
  let frame = 0, previous: number | undefined, disposed = false;
  const span = motif.length * config.trailFraction;
  const tailSpan = Math.min(config.tailFadeLength, span);
  const headSpan = Math.min(config.headFadeLength, span);
  function setRegion(region: Bounds) {
    for (const id of ['soften', 'tail-mask', 'head-mask']) {
      for (const [key, value] of Object.entries(region)) get(id).setAttribute(key, String(value));
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
        headPaths[i] += ' ' + slice(instance, head - headRamp * (i + 1) / count, head - headRamp * i / count);
      }
    }
    path.setAttribute('d', drawing);
    body.setAttribute('d', staticMode ? drawing : tailBody);
    headBody.setAttribute('d', staticMode ? drawing : leadingBody);
    tails.forEach((node, i) => node.setAttribute('d', tailPaths[i]));
    heads.forEach((node, i) => node.setAttribute('d', headPaths[i]));
  }
  function tick(timestamp: number) {
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
  function onPageHide(event: PageTransitionEvent) { if (!event.persisted) dispose(); }
  const observer = viewport ? null : new ResizeObserver(updateViewport);
  observer?.observe(root);
  updateViewport();
  preference.addEventListener('change', onPreferenceChange);
  window.addEventListener('pagehide', onPageHide);
  onPreferenceChange();
  return dispose;
}
