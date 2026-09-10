/** Distance-based reveal and tail mask, with unlimited fresh-seed retries. */
export function initialize(config) {
  const path = document.getElementById("trail");
  const drawing = document.getElementById("drawing");
  const ramp = document.getElementById("tail-ramp");
  const body = document.getElementById("tail-body");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const rampCount = 32;
  ramp.replaceChildren();
  const bands = Array.from({ length: rampCount }, () => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    ramp.appendChild(node); return node;
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
    bands.forEach(node => node.setAttribute("d", ""));
    if (preference.matches) {
      const walk = generateWalk({ ...config, seed });
      path.setAttribute("d", walk.d); body.setAttribute("d", walk.d);
      return;
    }
    walker = createTrail({ ...config, seed });
    frame = requestAnimationFrame(tick);
  }

  function render(state) {
    path.setAttribute("d", state.d);
    const fadeEnd = Math.max(0, head - config.trailLength);
    body.setAttribute("d", walker.slice(fadeEnd, head));
    const rawTail = head - config.trailLength - config.tailFadeLength;
    for (let i = 0; i < rampCount; i++) {
      const from = state.tail + (fadeEnd - state.tail) * i / rampCount;
      const to = state.tail + (fadeEnd - state.tail) * (i + 1) / rampCount;
      const luminance = Math.round(255 * Math.max(0, Math.min(1, ((from + to) / 2 - rawTail) / config.tailFadeLength)));
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
