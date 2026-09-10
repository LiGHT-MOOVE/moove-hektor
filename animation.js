/** Distance-based reveal and tail mask, with unlimited fresh-seed retries. */
export function initialize(config) {
  const path = document.getElementById("trail");
  const drawing = document.getElementById("drawing");
  const ramp = document.getElementById("tail-ramp");
  const body = document.getElementById("tail-body");
  const headRamp = document.getElementById("head-ramp");
  const headBody = document.getElementById("head-body");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const rampCount = 32;
  ramp.replaceChildren();
  const bands = Array.from({ length: rampCount }, () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ramp.appendChild(node); return node;
  });
  headRamp.replaceChildren();
  const headBands = Array.from({ length: rampCount }, () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    headRamp.appendChild(node); return node;
  });
  let walker, head = 0, cycle = 0, frame, previousTime, fading = false, fadeTime = 0, disposed = false;

  function reset() {
    cancelAnimationFrame(frame);
    const seed = config.seed == null ? crypto.getRandomValues(new Uint32Array(1))[0] : (config.seed + cycle) >>> 0;
    cycle++;
    document.documentElement.dataset.seed = String(seed);
    head = 0; previousTime = undefined; fading = false; fadeTime = 0;
    drawing.style.opacity = String(config.opacity);
    path.setAttribute("d", ""); body.setAttribute("d", "");
    [...bands, ...headBands].forEach(node => node.setAttribute("d", ""));
    headBody.setAttribute("d", "");
    if (preference.matches) {
      let d;
      if (config.wrapEdges) {
        const still = createTrail({ ...config, seed });
        let state;
        for (let distance = config.stepLength; distance <= config.trailLength + config.tailFadeLength; distance += config.stepLength) {
          state = still.advance(distance);
          if (state.blocked) break;
        }
        d = state?.d ?? "";
      } else d = generateWalk({ ...config, seed }).d;
      path.setAttribute("d", d); body.setAttribute("d", d);
      headBody.setAttribute("d", d);
      return;
    }
    walker = createTrail({ ...config, seed });
    frame = requestAnimationFrame(tick);
  }

  function render(state) {
    path.setAttribute("d", state.d);
    // A second mask multiplies the tail mask, including when both ramps overlap.
    const headSpan = Math.min(config.headFadeLength, head - state.tail);
    const headStart = head - headSpan;
    headBody.setAttribute("d", walker.slice(state.tail, headStart));
    for (let i = 0; i < rampCount; i++) {
      const from = headStart + headSpan * i / rampCount;
      const to = headStart + headSpan * (i + 1) / rampCount;
      const opacity = Math.pow(1 - (i + 0.5) / rampCount, config.headFadePower);
      const luminance = Math.round(255 * opacity);
      headBands[i].setAttribute("d", walker.slice(from, to));
      headBands[i].setAttribute("stroke", `rgb(${luminance},${luminance},${luminance})`);
    }
    // Always taper the visible tail, including while its starting point is fixed.
    const tailSpan = Math.min(config.tailFadeLength, head - state.tail);
    const fadeEnd = state.tail + tailSpan;
    body.setAttribute("d", walker.slice(fadeEnd, head));
    for (let i = 0; i < rampCount; i++) {
      const from = state.tail + (fadeEnd - state.tail) * i / rampCount;
      const to = state.tail + (fadeEnd - state.tail) * (i + 1) / rampCount;
      const luminance = Math.round(255 * (i + 0.5) / rampCount);
      bands[i].setAttribute("d", walker.slice(from, to));
      bands[i].setAttribute("stroke", `rgb(${luminance},${luminance},${luminance})`);
    }
  }

  function tick(timestamp) {
    if (disposed || preference.matches) return;
    const dt = previousTime === undefined ? 0 : Math.max(0, Math.min(50, timestamp - previousTime));
    previousTime = timestamp;
    if (fading) {
      fadeTime += dt;
      const t = Math.min(1, fadeTime / config.fadeDuration);
      drawing.style.opacity = String(config.opacity * (1 - t * t * (3 - 2 * t)));
      if (t >= 1) { reset(); return; }
    } else {
      let remaining = config.speed * dt / 1000;
      let state;
      // Small substeps preserve collision history even at high configured speed.
      do {
        const amount = Math.min(config.stepLength, remaining);
        state = walker.advance(head + amount);
        head = state.head;
        remaining -= amount;
      } while (remaining > 1e-9 && !state.blocked);
      render(state);
      if (state.blocked) { fading = true; fadeTime = 0; }
    }
    frame = requestAnimationFrame(tick);
  }

  function onPreferenceChange() { if (!disposed) reset(); }
  preference.addEventListener("change", onPreferenceChange);
  window.addEventListener("pagehide", event => {
    if (event.persisted) return;
    disposed = true; cancelAnimationFrame(frame);
    preference.removeEventListener("change", onPreferenceChange);
  });
  reset();
}
