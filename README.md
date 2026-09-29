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
the age of individual segments. At the default speed, the tail starts moving after approximately 12.8 seconds,
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

The trail follows a horizontal motif of alternating half-circles: radius 96,
then radius 142. `travelDirection` selects rightward, leftward, or a random
horizontal direction per attempt. Starting position, starting section, and
mirroring provide variation. The initial tangent accounts for the first turn's
sign and mirroring, so every half-circle advances in the chosen direction.

Before starting a section, the walker checks the entire arc against the visible
trail and its own future segments. If it cannot fit, drawing stops at the previous
section boundary, fades, and restarts elsewhere. It does not detour or change
orientation. Clearance is checked again before committing each small step.
Tangents remain continuous, and the final step is shortened to finish each
half-turn exactly. The motif must alternate positive and negative π sweeps,
including across its repeat boundary; radii remain configurable.

Collision detection retains all still-visible tail geometry, including the fade
zone; entire old segments are released conservatively once fully behind the tail.
The solid stroke keeps a gap from non-neighboring sections, while blur halos may
blend. Earlier locations can be revisited only after their trail has disappeared.

When the next complete section cannot fit, the entire visible line fades immediately
and a new seeded attempt starts. The head does not wait for the tail to clear.
Retries continue for as long as the document is active. Horizontal routes can wrap into their own history and stop before the tail starts
moving. A shorter trail allowance releases space earlier; a longer one can produce
more frequent draw–fade cycles. Full-section checks conservatively treat the
currently visible tail as an obstacle throughout the forecast.

SVG paths are constructed after simulation substeps finish, rather than on every
walker advance. Reduced-motion mode likewise renders only its final geometry.

Reduced-motion mode uses the same walker to produce one static snapshot with no
recurring animation, with or without portals. Background
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
| `travelDirection` | Horizontal travel: `"right"` (default), `"left"`, or `"random"` per attempt |
| `motif` | Ordered `{ radius, sweep }` turns; sweeps must alternate +π and −π |
| `motifRandomStart`, `motifMirror` | Vary the starting section and mirror per attempt |
| `wrapEdges` | Connect opposite edges; false restores solid boundaries |
| `margin` | Boundary inset when wrapping is disabled |
| `minGap` | Gap between solid strokes |
| `strokeWidth`, `blur`, `opacity`, `color` | Trail appearance |
| `shadowEnabled` | Enable the subtle drop shadow; false removes it |
| `shadowColor`, `shadowOpacity` | Shadow tint and strength (default muted blue, 0.4) |
| `shadowOffsetX`, `shadowOffsetY` | Shadow displacement in viewBox units (default -32, 32) |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Vertical gradient |
| `seed` | Null for random retries; an integer for a reproducible seed sequence |

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
- `motif.js`: alternating half-turn sequence and section progress.
- `trail.js`: horizontal motif simulation, section clearance, and bounded collision history.
- `geometry.js`: shared arc evaluation and segment-distance mathematics.
- `renderer.js`: distance slicing and SVG path construction with local tile offsets.
- `animation.js`: continuous reveal, fixed tail mask, collision fade and retries.
- `portals.js`: coordinate wrapping, relevant tile offsets, and periodic collision checks.
- `config.js`: appearance, geometry, length and timing settings.
