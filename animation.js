/** Runs inside the SVG document on every load. */
export function initialize(config) {
  const seed = config.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  const path = document.getElementById("trail");
  const walk = generateWalk({ ...config, seed });
  document.documentElement.dataset.seed = String(seed);
  path.setAttribute("d", walk.d);
  if (!walk.length) return;
  const length = path.getTotalLength();
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches) return;
  path.style.strokeDasharray = `${length} ${length}`;
  const animation = path.animate([
    { strokeDashoffset: String(length) },
    { strokeDashoffset: "0" },
  ], { duration: length / config.speed * 1000, easing: "linear", fill: "both" });
  preference.addEventListener("change", event => {
    if (event.matches) animation.finish();
  });
}
