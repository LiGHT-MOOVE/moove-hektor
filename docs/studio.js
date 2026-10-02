import { createScene } from '../scene.js?v=per-draw-phase';
import { createSvg } from '../svg.js?v=relative-blur';
import { initialize } from '../animation.js?v=per-draw-phase';

let originalSource, CONFIG, PATTERN;
try {
  const response = await fetch('../config.js', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load config.js (${response.status})`);
  originalSource = await response.text();
  // Keep the loaded source for detecting external edits when saving.
  const url = URL.createObjectURL(new Blob([originalSource], { type: 'text/javascript' }));
  try {
    ({ CONFIG, PATTERN } = await import(url));
    if (!CONFIG || !PATTERN) throw new Error('config.js must export CONFIG and PATTERN');
  } finally {
    URL.revokeObjectURL(url);
  }
} catch (error) {
  document.getElementById('layout-error').textContent = `Configuration unavailable: ${error.message}`;
  for (const input of document.querySelectorAll('input, select, button')) input.disabled = true;
  throw error;
}

const get = id => document.getElementById(id);
const controls = get('controls');
const motifControls = get('motif-controls');
let placements = [];
const animate = get('animate');
const effectKeys = ['blurEnabled', 'shadowEnabled', 'gradientEnabled'];
const randomPhases = get('random-phases');
const randomPlacement = get('random-placement');
const offsetInputs = [get('offset-x'), get('offset-y')];
const motifWidthInput = get('motifWidth');
const previewMode = get('preview-mode');
const screens = { desktop: [1440, 900], mobile: [390, 844] };
let dispose, settingsToSave, saving = false;

function attributes(node, values) {
  for (const [key, value] of Object.entries(values)) node.setAttribute(key, value);
}

function updateSliderLabels() {
  for (const input of document.querySelectorAll('input[type="range"]')) {
    get(input.id + '-value').value = Math.round(Number(input.value)) + (input.dataset.unit || '');
  }
}

function setSlider(id, value) {
  const input = get(id);
  value = Math.round(value);
  input.min = Math.min(Number(input.min), value);
  input.max = Math.max(Number(input.max), value);
  input.value = value;
}

function update() {
  updateSliderLabels();
  get('save').disabled = true;
  settingsToSave = null;
  get('save-status').textContent = '';
  if (!controls.reportValidity() || !motifControls.reportValidity()) {
    get('save-status').textContent = 'Complete valid tile dimensions and motif positions before saving.';
    return;
  }
  const placement = {
    tileWidth: Number(get('tileWidth').value),
    tileHeight: Number(get('tileHeight').value),
    motifs: placements,
  };
  get('draw-duration').disabled = Number(get('pause-duration').value) === 0;
  const randomStartingPositions = randomPhases.checked;
  const motifWidth = Number(motifWidthInput.value);
  offsetInputs.forEach(input => { input.disabled = randomPlacement.checked; });
  const patternOffset = randomPlacement.checked ? null : {
    x: Number(offsetInputs[0].value) / 100,
    y: Number(offsetInputs[1].value) / 100,
  };

  const pattern = { ...PATTERN, ...placement };
  const configChanges = { ...Object.fromEntries(effectKeys.map(key => [key, get(key).checked])), motifWidth, patternOffset, randomStartingPositions,
    color: get('trail-color').value, strokeWidth: Number(get('stroke-width').value),
    staggerMode: get('stagger-mode').value, pauseDuration: Number(get('pause-duration').value),
    drawDuration: Number(get('draw-duration').value),
    loopDuration: Number(get('loop-duration').value),
    trailFraction: Number(get('trail-length').value) / 100 };
  const savedConfig = { ...CONFIG, ...configChanges };
  let scene;
  try {
    scene = createScene({ ...savedConfig, seed: 42 }, pattern);
    get('layout-error').textContent = '';
  } catch (error) {
    get('layout-error').textContent = error.message;
    return;
  }
  settingsToSave = { config: savedConfig, pattern };
  get('save').disabled = saving;
  const config = { ...savedConfig, seed: 42 };
  const template = new DOMParser().parseFromString(createSvg(config, scene.tile), 'image/svg+xml');
  const svg = document.importNode(template.documentElement, true);
  const inspect = previewMode.value === 'intersect';
  const [width, height] = screens[previewMode.value] || screens.desktop;
  const margin = inspect ? 0.15 : 0;
  const bounds = { x: -width * margin, y: -height * margin,
    width: width * (1 + 2 * margin), height: height * (1 + 2 * margin) };
  attributes(svg, { viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` });
  get('canvas').style.setProperty('--ratio', String(bounds.width / bounds.height));
  get('canvas').setAttribute('aria-label', inspect
    ? 'Desktop visibility preview: intersecting motifs inside the blue viewport outline'
    : `${previewMode.value} screen preview`);
  for (const rect of svg.querySelectorAll(':scope > rect')) attributes(rect, bounds);
  // Keep the desktop origin and selection bounds unchanged when revealing its surroundings.
  attributes(svg.querySelector('#pattern-viewport'), { x: width / 2, y: height / 2 });
  attributes(svg.querySelector('#field'), {
    x: bounds.x - width / 2, y: bounds.y - height / 2, width: bounds.width, height: bounds.height,
  });

  dispose?.();
  get('canvas').replaceChildren(svg);
  dispose = initialize(config, pattern, svg, !animate.checked, scene, { width, height });
  if (inspect) {
    const surround = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    attributes(surround, {
      d: `M ${bounds.x} ${bounds.y} h ${bounds.width} v ${bounds.height} h ${-bounds.width} Z M 0 0 h ${width} v ${height} H 0 Z`,
      fill: '#1b3045', 'fill-opacity': 0.12, 'fill-rule': 'evenodd', 'pointer-events': 'none',
    });
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    attributes(outline, {
      x: 0, y: 0, width, height, fill: 'none', stroke: '#287be0',
      'stroke-width': 1.5, 'stroke-dasharray': '6 4', 'vector-effect': 'non-scaling-stroke',
      'pointer-events': 'none',
    });
    svg.append(surround, outline);
  }
}

function showSelectedMotif() {
  const motif = placements[Number(get('selected-motif').value)];
  setSlider('motif-x', motif.x * 100);
  setSlider('motif-y', motif.y * 100);
  get('motif-invert').checked = motif.rotation === 180;
  get('remove-motif').disabled = placements.length === 1;
  updateSliderLabels();
}

function refreshMotifList(selected = 0) {
  get('selected-motif').replaceChildren(...placements.map((_, i) => new Option(`Motif ${i + 1}`, i)));
  get('selected-motif').value = selected;
  showSelectedMotif();
}

function reset() {
  get('trail-color').value = CONFIG.color;
  setSlider('stroke-width', CONFIG.strokeWidth);
  get('stagger-mode').value = CONFIG.staggerMode;
  setSlider('pause-duration', CONFIG.pauseDuration);
  setSlider('draw-duration', CONFIG.drawDuration);
  setSlider('loop-duration', CONFIG.loopDuration);
  setSlider('trail-length', CONFIG.trailFraction * 100);
  setSlider('motifWidth', CONFIG.motifWidth);
  previewMode.value = 'desktop';
  randomPlacement.checked = CONFIG.patternOffset == null;
  offsetInputs.forEach((input, i) => {
    const fraction = CONFIG.patternOffset?.[i === 0 ? 'x' : 'y'] ?? 0;
    input.value = (fraction % 1) * 100;
  });
  animate.checked = true;
  effectKeys.forEach(key => { get(key).checked = CONFIG[key]; });
  randomPhases.checked = CONFIG.randomStartingPositions;
  setSlider('tileWidth', PATTERN.tileWidth);
  setSlider('tileHeight', PATTERN.tileHeight);
  placements = PATTERN.motifs.map(motif => ({ ...motif }));
  refreshMotifList();
  update();
}

function updateStartingPositions() {
  animate.checked = true;
  update();
}

for (const id of ['stagger-mode', 'random-phases', 'draw-duration', 'loop-duration', 'pause-duration', 'trail-length']) {
  get(id).addEventListener('input', updateStartingPositions);
}
for (const id of ['tileWidth', 'tileHeight', 'trail-color', 'stroke-width']) {
  get(id).addEventListener('input', update);
}
get('selected-motif').addEventListener('change', showSelectedMotif);
motifControls.addEventListener('input', event => {
  if (event.target.id === 'selected-motif' || !motifControls.reportValidity()) return;
  placements[Number(get('selected-motif').value)] = {
    x: Number(get('motif-x').value) / 100, y: Number(get('motif-y').value) / 100,
    rotation: get('motif-invert').checked ? 180 : 0,
  };
  update();
});
get('add-motif').addEventListener('click', () => {
  placements.push({ x: 0.5, y: 0.5, rotation: 0 });
  refreshMotifList(placements.length - 1);
  update();
});
get('remove-motif').addEventListener('click', () => {
  if (placements.length === 1) return;
  placements.splice(Number(get('selected-motif').value), 1);
  refreshMotifList();
  update();
});
for (const form of document.querySelectorAll('form')) {
  form.addEventListener('submit', event => event.preventDefault());
}
effectKeys.forEach(key => get(key).addEventListener('change', update));
animate.addEventListener('change', update);
motifWidthInput.addEventListener('input', update);
offsetInputs.forEach(input => input.addEventListener('input', update));
randomPlacement.addEventListener('change', update);
previewMode.addEventListener('change', update);
get('reset').addEventListener('click', reset);
get('save').addEventListener('click', async () => {
  if (!settingsToSave || saving) return;
  const snapshot = settingsToSave;
  saving = true;
  get('save').disabled = true;
  get('save-status').textContent = 'Saving…';
  try {
    const response = await fetch('/api/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseSource: originalSource, ...snapshot }),
    });
    if (!(response.headers.get('content-type') || '').includes('application/json')) {
      throw new Error('Save requires pnpm run studio. Open http://localhost:4173.');
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Save failed.');
    originalSource = result.source;
    CONFIG = snapshot.config;
    PATTERN = snapshot.pattern;
    // Keep edits made while saving; Reset now restores the last successful save.
    update();
    get('save-status').textContent = 'Saved and SVG rebuilt.';
  } catch (error) {
    get('save-status').textContent = error.message;
  } finally {
    saving = false;
    get('save').disabled = !settingsToSave;
  }
});

reset();
