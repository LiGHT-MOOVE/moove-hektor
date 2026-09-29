import { CONFIG, PATTERN } from '../config.js';
import { createScene } from '../scene.js';
import { createSvg } from '../svg.js';
import { initialize } from '../animation.js';
import { updateConfigSource } from './config-source.js';

let originalSource, sourceError;
try {
  const response = await fetch('../config.js', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load config.js (${response.status})`);
  originalSource = await response.text();
} catch (error) {
  sourceError = error;
}

const get = id => document.getElementById(id);
const controls = get('controls');
const motifControls = get('motif-controls');
let placements = [];
const animate = get('animate');
const effects = get('effects');
const randomPhases = get('random-phases');
const randomPlacement = get('random-placement');
const offsetInputs = [get('offset-x'), get('offset-y')];
const motifWidthInput = get('motifWidth');
const previewMode = get('preview-mode');
const screens = { desktop: [1440, 900], mobile: [390, 844] };
let dispose;

function attributes(node, values) {
  for (const [key, value] of Object.entries(values)) node.setAttribute(key, value);
}

function updateSliderLabels() {
  for (const input of document.querySelectorAll('input[type="range"]')) {
    get(input.id + '-value').value = Number(input.value).toFixed(1).replace(/\.0$/, '') + (input.dataset.unit || '');
  }
}

function setSlider(id, value) {
  const input = get(id);
  input.min = Math.min(Number(input.min), value);
  input.max = Math.max(Number(input.max), value);
  input.value = value;
}

function update() {
  updateSliderLabels();
  get('copy-config').disabled = true;
  get('config-source').textContent = '';
  if (!controls.reportValidity() || !motifControls.reportValidity()) {
    get('copy-status').textContent = 'Complete valid tile dimensions and motif positions before copying.';
    return;
  }
  const placement = {
    tileWidth: Number(get('tileWidth').value),
    tileHeight: Number(get('tileHeight').value),
    motifs: placements,
    spacing: { x: Number(get('spacing-x').value) / 100, y: Number(get('spacing-y').value) / 100 },
  };
  const pauseBetweenDrawings = get('pause-trails').checked;
  get('motif-delay').disabled = !pauseBetweenDrawings;
  const randomStartingPositions = randomPhases.checked;
  const motifWidth = Number(motifWidthInput.value);
  offsetInputs.forEach(input => { input.disabled = randomPlacement.checked; });
  const patternOffset = randomPlacement.checked ? null : {
    x: Number(offsetInputs[0].value) / 100,
    y: Number(offsetInputs[1].value) / 100,
  };

  const pattern = { ...PATTERN, ...placement };
  const configChanges = { motifWidth, patternOffset, randomStartingPositions, pauseBetweenDrawings,
    trailFraction: Number(get('trail-length').value) / 100 };
  const savedConfig = { ...CONFIG, ...configChanges };
  let scene;
  try {
    scene = createScene({ ...savedConfig, seed: 42 }, pattern);
    get('layout-error').textContent = '';
  } catch (error) {
    get('layout-error').textContent = error.message;
    get('copy-status').textContent = 'Fix the settings before copying.';
    return;
  }
  try {
    if (sourceError) throw sourceError;
    get('config-source').textContent = updateConfigSource(originalSource, {
      CONFIG: configChanges,
      PATTERN: placement,
    });
    get('copy-config').disabled = false;
    get('copy-status').textContent = '';
  } catch (error) {
    get('copy-status').textContent = `Export unavailable: ${error.message}`;
  }
  const config = {
    ...savedConfig, seed: 42,
    ...(effects.checked ? {} : {
      strokeWidth: 8, blur: 0, shadowEnabled: false, opacity: 1, color: '#26384a',
      backgroundTop: 'white', backgroundMiddle: 'white', backgroundBottom: 'white',
    }),
  };
  const { width, height } = scene.tile;
  const template = new DOMParser().parseFromString(createSvg(config, scene.tile), 'image/svg+xml');
  const svg = document.importNode(template.documentElement, true);
  const screen = screens[previewMode.value];
  const bounds = screen
    ? { x: 0, y: 0, width: screen[0], height: screen[1] }
    : { x: -width, y: -height, width: width * 3, height: height * 3 };
  attributes(svg, { viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` });
  get('canvas').style.setProperty('--ratio', String(bounds.width / bounds.height));
  // Fit the simulated screen into the Studio without changing its logical pixel size.
  get('canvas').style.maxWidth = screen ? `${screen[0]}px` : '';
  get('canvas').setAttribute('aria-label', screen ? `${previewMode.value} screen preview` : 'Nine repeated pattern tiles');
  for (const rect of svg.querySelectorAll(':scope > rect')) attributes(rect, bounds);
  const scale = motifWidth / scene.motif.width;
  get('density').textContent = screen
    ? `${(screen[0] / (width * scale)).toFixed(2)} tile columns × ${(screen[1] / (height * scale)).toFixed(2)} tile rows (including partial tiles). Preview may be scaled to fit this page.`
    : 'Tile layout shows a fixed 3 × 3 repeat. Adjusting scale switches to screen preview.';
  if (!effects.checked) svg.querySelector('#drawing').removeAttribute('filter');

  dispose?.();
  get('canvas').replaceChildren(svg);
  dispose = initialize(config, pattern, svg, !animate.checked, scene);
  if (!screen) {
    // Layout mode uses native tile coordinates without the fullscreen crop offset.
    svg.querySelector('#motifs').removeAttribute('patternTransform');
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    attributes(outline, {
      x: 0, y: 0, width, height, fill: 'none', stroke: '#287be0',
      'stroke-width': 8, 'stroke-dasharray': '24 16',
    });
    svg.appendChild(outline);
  }
}

function showSelectedMotif() {
  const motif = placements[Number(get('selected-motif').value)];
  setSlider('motif-x', motif.x);
  setSlider('motif-y', motif.y);
  get('motif-invert').checked = motif.rotation === 180;
  setSlider('motif-delay', motif.delay);
  get('remove-motif').disabled = placements.length === 1;
  updateSliderLabels();
}

function refreshMotifList(selected = 0) {
  get('selected-motif').replaceChildren(...placements.map((_, i) => new Option(`Motif ${i + 1}`, i)));
  get('selected-motif').value = selected;
  showSelectedMotif();
}

function reset() {
  get('pause-trails').checked = CONFIG.pauseBetweenDrawings;
  setSlider('trail-length', CONFIG.trailFraction * 100);
  motifWidthInput.min = Math.min(100, CONFIG.motifWidth);
  motifWidthInput.max = Math.max(1000, CONFIG.motifWidth);
  motifWidthInput.value = CONFIG.motifWidth;
  previewMode.value = 'layout';
  randomPlacement.checked = CONFIG.patternOffset == null;
  offsetInputs.forEach((input, i) => {
    const fraction = CONFIG.patternOffset?.[i === 0 ? 'x' : 'y'] ?? 0;
    input.value = (fraction % 1) * 100;
  });
  animate.checked = false;
  effects.checked = false;
  randomPhases.checked = CONFIG.randomStartingPositions;
  setSlider('tileWidth', PATTERN.tileWidth);
  setSlider('tileHeight', PATTERN.tileHeight);
  setSlider('spacing-x', PATTERN.spacing.x * 100);
  setSlider('spacing-y', PATTERN.spacing.y * 100);
  placements = PATTERN.motifs.map(motif => ({ ...motif }));
  refreshMotifList();
  update();
}

function updateStartingPositions() {
  animate.checked = true;
  update();
}

randomPhases.addEventListener('change', updateStartingPositions);
get('pause-trails').addEventListener('change', updateStartingPositions);
get('trail-length').addEventListener('input', updateStartingPositions);
controls.addEventListener('input', update);
get('selected-motif').addEventListener('change', showSelectedMotif);
motifControls.addEventListener('input', event => {
  if (event.target.id === 'selected-motif' || !motifControls.reportValidity()) return;
  placements[Number(get('selected-motif').value)] = {
    x: Number(get('motif-x').value), y: Number(get('motif-y').value),
    rotation: get('motif-invert').checked ? 180 : 0,
    delay: Number(get('motif-delay').value),
  };
  if (event.target.id === 'motif-delay') animate.checked = true;
  update();
});
get('add-motif').addEventListener('click', () => {
  placements.push({ x: Number(get('tileWidth').value) / 2, y: Number(get('tileHeight').value) / 2, rotation: 0, delay: 0 });
  refreshMotifList(placements.length - 1);
  update();
});
get('remove-motif').addEventListener('click', () => {
  if (placements.length === 1) return;
  placements.splice(Number(get('selected-motif').value), 1);
  refreshMotifList();
  update();
});
for (const form of [controls, motifControls, get('preview-controls'), get('pattern-placement')]) {
  form.addEventListener('submit', event => event.preventDefault());
}
for (const toggle of [animate, effects]) toggle.addEventListener('change', update);
function updateScreenPreview() {
  if (previewMode.value === 'layout') previewMode.value = 'desktop';
  update();
}
motifWidthInput.addEventListener('input', updateScreenPreview);
get('pattern-placement').addEventListener('input', updateScreenPreview);
randomPlacement.addEventListener('change', updateScreenPreview);
previewMode.addEventListener('change', update);
get('reset').addEventListener('click', reset);
get('copy-config').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(get('config-source').textContent);
    get('copy-status').textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(get('config-source'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    get('copy-status').textContent = 'Copy unavailable. Text selected—press Cmd/Ctrl+C.';
  }
});
reset();
