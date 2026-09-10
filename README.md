# Moove Hektor

A dependency-free starting point for a progressively drawn, randomized SVG line.
Inspired by the structure of the partners-map builder: configuration, geometry,
SVG assembly, and embedded browser code are kept separate.

## Run

Requires Node.js 18 or newer. No packages need installing.

```sh
npm run build
npm test
```

Open `hektor.svg` in a browser. Reload to generate another route. After changing
the source or configuration, rebuild the SVG. The build writes next to `build.mjs`,
regardless of the directory from which it is invoked.

## Files

| File | Purpose |
| --- | --- |
| `config.js` | Dimensions, appearance, seed, walker limits, and drawing speed |
| `walker.js` | Browser-safe seeded walker and curve collision checks |
| `animation.js` | Generate on load, then reveal the SVG stroke |
| `build.mjs` | Embed the functions and configuration into one SVG |
| `hektor.svg` | Generated, self-contained output |
| `walker.test.js` | Determinism, bounds, and intersection checks |

## Website embedding

```html
<object type="image/svg+xml" data="/hektor.svg"
        aria-label="Animated wandering line"
        style="display:block;width:100%;aspect-ratio:1200/706;border:0">
</object>
```

Use an object or integrate the SVG and initialization into your page. An `<img>`
or CSS background will not run the embedded JavaScript. Your site's content
security policy must permit the chosen embedding and script execution method.
For a strict policy, move the runtime into an allowed external script.

## Generation and animation

The build packages code, not a fixed route. On each SVG document load, the runtime
chooses a fresh seed with `crypto.getRandomValues`, generates several bounded
attempts, and uses the longest route. It then animates the stroke at constant
distance per second. Reduced-motion preference shows the completed route.

The walker takes short circular-arc steps with matching tangents, using exactly
two radii: 96 and 142 viewBox units. Their ratio follows the approximately 64 and
94.5 unit curves in the MOOVE logo. It can turn either way at either radius.
Randomness changes the duration and order of these sweeps, avoiding corners. Circular arcs are used
directly in the SVG so later smoothing cannot introduce crossings. Curvature
can change between arcs; this is tangent continuity, not exact curvature continuity.

Collision checks subdivide arcs into chords and include a conservative arc
approximation margin. Non-neighboring sections keep `minGap` plus stroke width
between centerlines. An adjoining neighborhood is exempt from spacing checks;
its total turn is capped to prevent local folding. Boundaries include a margin.

This scaffold uses bounding-box rejection and a linear scan of nearby segments.
When trapped, it backtracks through alternate turns, with a bounded search budget
per attempt. It keeps the longest result across several starts. A shorter route
is valid: finite space and positive spacing cannot accommodate unlimited growth.
For much longer paths, a spatial index and worker-based generation are natural
extensions. Generation happens synchronously before animation; tune the work
limits for your target devices.

## Customize

- Set `seed` to `null` for new routes, or an integer for repeatable output. The
  active seed is recorded on the SVG root as `data-seed`.
- Increase `minGap` for more open compositions.
- Adjust the two `radii` for the inner/outer bend sizes. Invalid combinations of
  small radii and large spacing are rejected rather than silently changing radii.
- Adjust `maxSteps`, `attempts`, and `searchBudget` for length versus startup work.
  The target is 9,000 units; available space can produce a shorter valid result.
- Adjust `speed`, `color`, `strokeWidth`, `opacity`, and `blur` for the soft stroke.
- Adjust `backgroundTop`, `backgroundMiddle`, and `backgroundBottom` for the
  vertical light-to-teal gradient. Everything is vector-based and embedded;
  the reference background image is not loaded at runtime.

The visible stroke is now 38 units wide with a 13-unit Gaussian blur. Collision
spacing accounts for the solid stroke width; translucent blur halos may overlap.
Fixed radii refer to the centerline, not the edges of the expanded stroke.

Self-avoidance produces open curls and sweeps, rather than crossing loops.
This is a scaffold for tuning the visual style, not a reproduction of the reference.
