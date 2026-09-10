/** Runs inside the SVG document; every completed drawing starts another cycle. */
export function initialize(config) {
  const path = document.getElementById("trail");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let animation;
  let timer;
  let cycle = 0;
  let disposed = false;

  function clearPlayback() {
    clearTimeout(timer);
    if (animation) {
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    }
    path.style.strokeDasharray = "none";
    path.style.strokeDashoffset = "0";
    path.style.opacity = String(config.opacity);
  }

  function startCycle() {
    if (disposed) return;
    clearPlayback();
    // A configured seed reproduces the sequence, with a new route each cycle.
    const seed = config.seed == null ? crypto.getRandomValues(new Uint32Array(1))[0]
      : (config.seed + cycle) >>> 0;
    cycle++;
    const walk = generateWalk({ ...config, seed });
    document.documentElement.dataset.seed = String(seed);
    path.setAttribute("d", walk.d);
    if (!walk.length || preference.matches) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length} ${length}`;
    animation = path.animate([
      { strokeDashoffset: String(length) },
      { strokeDashoffset: "0" },
    ], { duration: length / config.speed * 1000, easing: "linear", fill: "both" });
    animation.onfinish = () => {
      if (disposed || preference.matches) return;
      timer = setTimeout(() => {
        if (disposed || preference.matches) return;
        clearPlayback();
        animation = path.animate([
          { opacity: config.opacity }, { opacity: 0 },
        ], { duration: config.fadeDuration, easing: "ease-in-out", fill: "both" });
        animation.onfinish = startCycle;
      }, config.holdDuration);
    };
  }

  function onPreferenceChange() {
    if (preference.matches) clearPlayback(); // One static, complete drawing.
    else startCycle();
  }
  preference.addEventListener("change", onPreferenceChange);
  window.addEventListener("pagehide", event => {
    // A bfcache page is suspended by the browser and may resume later.
    if (event.persisted) return;
    disposed = true;
    clearPlayback();
    preference.removeEventListener("change", onPreferenceChange);
  }, { once: true });
  startCycle();
}
