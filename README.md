# Moove Hektor

Build a standalone SVG with embedded JavaScript, a blue gradient, and a soft,
continuously drawn trail. No external packages or runtime assets are required.

This project is inspired by **Hektor**, the project by **Jürg Lehni**.

## Build and preview

Requires Node.js 18 or newer.

```sh
npm run build
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

The default movement repeats two signed circular turns: a small outward
half-turn (radius 96), then a larger inward half-turn (radius 142). This echoes
the logo's alternating convex lobes and concave connections without targeting
an exact outline. Each attempt randomizes its starting section and can mirror
the sequence. Turns join with continuous tangents, and their final step is
shortened to finish the configured sweep exactly.

Before starting a section, the walker checks that the arc has room. If blocked,
the existing local steering takes over, including occasional eased straights.
The interrupted section restarts from the current position and heading once
there is room for it. No target positions or rejoining paths are stored.

Set `motifEnabled: false` to restore the free walker and its bounded opening-route
search. Already displayed geometry is never backtracked.
Collision detection retains all still-visible tail geometry, including the fade
zone; entire old segments are released conservatively once fully behind the tail.
The solid stroke keeps a gap from non-neighboring sections, while blur halos may
blend. Earlier locations can be revisited only after their trail has disappeared.

When no valid continuation remains, the entire visible line fades immediately
and a new seeded attempt starts. The head does not wait for the tail to clear.
Retries continue for as long as the document is active. Some routes end before
they reach the tail threshold, depending on their geometry.

SVG paths are constructed after simulation substeps finish, rather than on every
walker advance. Reduced-motion mode likewise renders only its final geometry.

Reduced-motion mode uses the same walker to produce one static snapshot with no
recurring animation, including when the motif and portals are disabled. Background
frame gaps are capped to avoid large jumps on return. Frame callbacks and media
listeners are cleaned up on document disposal.

## Edge portals

`wrapEdges: true` connects left/right and top/bottom edges. The walker preserves
its direction, curvature, and travelled distance through each crossing. Coordinates
are normalized after every step, keeping geometry numerically bounded.

The renderer emits each short arc at the tile offsets where its bounds, expanded
for stroke and blur, overlap the viewport. SVG clips the result after masking
and blur, so no boundary-intersection search or explicit edge splitting is needed.
Disconnected pieces use `M` subpaths inside the same SVG path; they never create
long connections across the screen. Corner crossings naturally use both offsets.

These local translated arcs are render-only pieces, not copies of the full route
or extra collision objects. Both opacity masks use the same renderer. All visible
geometry shares one collision history, with periodic proximity checks across
opposite edges and corners. Fading pieces remain obstacles until fully removed.
Edges themselves never cause a retry in portal mode. The background gradient
remains fixed.

Set `wrapEdges: false` to restore solid boundaries and the configured `margin`.
Reduced-motion mode also uses wrapped geometry when portals are enabled.

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
| `motifEnabled` | Prefer the repeating motif; false restores free movement |
| `motif` | Ordered `{ radius, sweep }` turns; signed sweeps in radians, diameter = twice radius |
| `motifRandomStart`, `motifMirror` | Vary the starting section and mirror per attempt |
| `straightChance` | Chance of a short straight passage during free steering |
| `turnEase` | Maximum change of turn per step during transitions |
| `radii` | Two preferred circular turning sizes |
| `wrapEdges` | Connect opposite edges; false restores solid boundaries |
| `margin` | Boundary inset when wrapping is disabled |
| `minGap` | Gap between solid strokes |
| `strokeWidth`, `blur`, `opacity`, `color` | Trail appearance |
| `shadowEnabled` | Enable the subtle drop shadow; false removes it |
| `shadowColor`, `shadowOpacity` | Shadow tint and strength (default muted blue, 0.4) |
| `shadowOffsetX`, `shadowOffsetY` | Shadow displacement in viewBox units (default -32, 32) |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Vertical gradient |
| `seed` | Null for random retries; an integer for a reproducible seed sequence |
| `searchBudget`, `attempts` | Bounded opening-route exploration when motif is disabled |

A shorter trail threshold releases space sooner; a longer threshold keeps more
of the drawing visible but can cause earlier collisions. The seed for the current
attempt appears on the SVG root as `data-seed`.

The shadow reuses the already-blurred trail's alpha, offsets and tints it, then
composites the trail above it. Only one Gaussian blur is needed; shadow softness
uses the same `blur` setting as the trail. It follows both tip ramps and whole-line
fading. Portal rendering includes its additional
extent to preserve edge continuity. It does not affect collision clearance.
Set `shadowEnabled: false` and rebuild to restore the appearance without shadow.

## Source structure

- `build.mjs`: embeds all runtime functions and configuration into `hektor.svg`.
- `motif.js`: repeating turn sequence and interrupted-section progress.
- `trail.js`: bounded-memory simulation, collision history, and movement planning.
- `geometry.js`: shared arc evaluation and segment-distance mathematics.
- `renderer.js`: distance slicing and SVG path construction with local tile offsets.
- `animation.js`: continuous reveal, fixed tail mask, collision fade and retries.
- `portals.js`: coordinate wrapping, relevant tile offsets, and periodic collision checks.
- `config.js`: appearance, geometry, length and timing settings.
