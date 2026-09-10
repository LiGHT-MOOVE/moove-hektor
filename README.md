# Moove Hektor

Build a standalone SVG with embedded JavaScript, a teal gradient, and a soft,
continuously drawn trail. No external packages or runtime assets are required.

## Build and preview

Requires Node.js 18 or newer.

```sh
npm run build
npm test
```

Open `hektor.svg` in a browser, or embed it with an object:

```html
<object type="image/svg+xml" data="/hektor.svg"
        aria-label="Animated wandering line"
        style="display:block;width:100%;aspect-ratio:1200/706;border:0">
</object>
```

Rebuild after source changes and reload. An `<img>` or CSS background does not
execute embedded scripts. Your site's content security policy must permit the
chosen embedding and script method.

## Behavior

The visible tail always has an opacity ramp, even when its start is stationary.
The ramp grows with very short paths, up to `tailFadeLength`, and then keeps that
length as the tail begins moving. Tail removal follows distance travelled, never
the age of individual segments. At the default speed, the tail starts moving after approximately 23.2 seconds,
if the route survives that long.

`trailLength` defaults to 2,393 units, approximately the measured perimeter of
`ICON_MOOVE_B.svg` in its native viewBox. This is an aesthetic reference length,
not a promise that the walker traces the logo. `tailFadeLength` adds a 160-unit
fade zone, making the maximum visible span 2,553 units:

```text
visible tail starts at = max(0, headDistance - trailLength - tailFadeLength)
opaque trail starts at = min(headDistance, visibleTailStart + tailFadeLength)
```

A single colored SVG path is cropped analytically to this interval. A separate
luminance mask uses a fixed pool of 32 short bands to soften only the tail. Blur
is applied after masking, preserving the soft edge. Geometry is never split into
independently timed, fading colored strokes. No mask or path elements accumulate. A second fixed pool of 32 mask bands ramps
opacity down toward the head, giving the blurred stroke a visually tapered tip.
This is an opacity taper, not a change to the geometric stroke width. Increase
`headFadeLength` for a longer taper, or `headFadePower` for a finer tip. The two
masks multiply safely even on short trails. Reduced-motion mode shows the full
static stroke without an animated head taper.

The walker mainly uses the two logo-inspired turning radii, 96 and 142 units.
Occasional short straight passages ease curvature toward zero and back toward a
preferred radius. Tangents stay continuous; intermediate radii during these
transitions are intentional. The reverted straight-first behavior is not used.

An unseen opening route is explored within a bounded search budget, then the
head continues to extend it. Already displayed geometry is never backtracked.
Collision detection retains all still-visible tail geometry, including the fade
zone; entire old segments are released conservatively once fully behind the tail.
The solid stroke keeps a gap from non-neighboring sections, while blur halos may
blend. Earlier locations can be revisited only after their trail has disappeared.

When no valid continuation remains, the entire visible line fades immediately
and a new seeded attempt starts. The head does not wait for the tail to clear.
Retries continue for as long as the document is active. Some routes end before
they reach the tail threshold, depending on their geometry.

Reduced-motion mode shows one static path with no recurring animation. Background
frame gaps are capped to avoid large jumps on return. Frame callbacks and media
listeners are cleaned up on document disposal.

## Settings

Edit `config.js` and rebuild:

| Setting | Effect |
| --- | --- |
| `trailLength` | Full-opacity trail allowance, plus the tail fade zone before removal |
| `tailFadeLength` | Always-on tail ramp length, including before tail removal |
| `headFadeLength` | Leading opacity ramp length; 0 disables it (default 110) |
| `headFadePower` | Ramp shape: 1 is linear; higher values make a finer tip (default 1.8) |
| `speed` | Drawing speed in viewBox units per second |
| `fadeDuration` | Whole-line fade before retry, in milliseconds |
| `straightChance` | Chance of a short straight passage at a steering decision |
| `turnEase` | Maximum change of turn per step during transitions |
| `radii` | Two preferred circular turning sizes |
| `minGap` | Gap between solid strokes |
| `strokeWidth`, `blur`, `opacity`, `color` | Trail appearance |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Vertical gradient |
| `seed` | Null for random retries; an integer for a reproducible seed sequence |
| `searchBudget`, `attempts` | Bounded opening-route exploration |

A shorter trail threshold releases space sooner; a longer threshold keeps more
of the drawing visible but can cause earlier collisions. The seed for the current
attempt appears on the SVG root as `data-seed`.

## Source structure

- `build.mjs`: embeds all runtime functions and configuration into `hektor.svg`.
- `trail.js`: bounded-memory distance-based walker, geometry slicing, planning.
- `animation.js`: continuous reveal, fixed tail mask, collision fade and retries.
- `walker.js`: static full-route generator used for reduced motion.
- `config.js`: appearance, geometry, length and timing settings.
- `*.test.js`: geometry, bounded history, tail threshold, retry, and lifecycle checks.
