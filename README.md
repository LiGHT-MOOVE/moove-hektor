# Moove Hektor

A standalone animated SVG drawing soft trails across a motif layout. Inspired
by **Hektor**, the project by **Jürg Lehni**. No runtime assets or dependencies.

## Build and embed

Requires Node.js 18 or newer. Run `pnpm run build` (or `npm run build`) to generate
`hektor.svg`. Rebuild after changing configuration or source files.

```html
<iframe
  src="/hektor.svg"
  sandbox="allow-scripts"
  title="Decorative animated background"
  aria-hidden="true"
  tabindex="-1"
  style="position:fixed;inset:0;width:100%;height:100%;border:0;pointer-events:none"
></iframe>
```

Adjust the asset path and place the iframe behind the site's content.
Keep `sandbox="allow-scripts"` without `allow-same-origin`: the animation can
update its own SVG but cannot access the parent page's DOM or origin-based storage.
The sandbox does not block all network requests; the SVG makes none.

The site's CSP must permit the frame, and any CSP served with the SVG must permit
its embedded script and styles. An `<img>` or CSS background will not run the
animation. Check the embed with the production CSP and target browsers.

## Use Studio

Run `pnpm run studio` and open [Studio](http://localhost:4173/docs/studio.html).
The local server enables saving and disables browser caching.

| Section | Controls |
| --- | --- |
| Sticky preview toolbar | Desktop / Mobile / Tile layout, Animate trails, Open saved SVG, Reset, Save |
| Pattern | Motif width and tile dimensions |
| Pattern position | Random placement and horizontal / vertical offsets |
| Motifs | Select, add, remove, position, and invert motifs |
| Appearance | Trail color, stroke width, blur, shadow, and background gradient |
| Animation | Playback, circuit duration, trail length, random starts, order, and pause |

Studio opens in **Desktop** with **Animate trails** enabled. Playback and other
design settings come from `config.js`.

- **Save** writes `config.js`, preserves comments, and rebuilds `hektor.svg`.
- **Reset** restores the last saved settings, or those loaded when the page opened.
- **Open saved SVG** opens the last build, not unsaved preview edits.
- Reload after editing `config.js` externally; Save rejects stale settings.
- Preview mode and Animate trails are not saved.

**Multiple trails** loops intersecting motif copies independently. **Sequence**
draws one motif at a time; Order and Pause apply only to this mode. A zero pause
removes the wait after the tail disappears. Random starts can be offscreen.

**Mobile** crops the center of the desktop layout at the same motif scale.
**Tile layout** shows a 3 × 3 repeat; animation selects motifs whose bounding boxes
intersect the blue rectangle, including partial motifs. Disable Animate trails
to inspect the complete pattern. Reduced motion also shows the static pattern.

## Configuration

All settings live in `config.js`: `PATTERN` defines geometry and layout; `CONFIG`
defines appearance and animation. Keep it a self-contained module of literal
settings for Studio loading and saving.

`PATTERN.tileWidth` and `tileHeight` control spacing in native motif units.
Motif placements use `{ x, y, rotation }`: x/y are tile fractions
(`0.5` = halfway), and rotation is 0 or 180 degrees. Positions outside the tile wrap.
Smaller tiles can cause overlaps.

For custom outlines, `turns` contains `{ radius, degrees }` entries. Radii must be
positive; positive angles turn clockwise. The outline must close in position
and tangent.

| CONFIG setting | Purpose |
| --- | --- |
| `motifWidth` | Displayed motif width in pixels |
| `patternOffset` | `{ x, y }` tile fractions relative to screen center; positive moves right/down; `null` randomizes placement |
| `loopDuration` | Seconds per circuit |
| `playback` | `sequence` for successive appearances; `multiple` to loop all motifs |
| `order` | `shuffle`, `rows`, or `columns` for sequence playback |
| `pauseDuration` | Seconds after a trail disappears before the next starts |
| `randomStartingPositions` | Random starting point when true; start at zero when false |
| `trailFraction` | Trail length as a fraction of the perimeter, including fades; greater than 0 and less than 1 |
| `headFadeLength`, `tailFadeLength`, `headFadePower` | Fade lengths and head taper; zero length disables that fade |
| `blurEnabled`, `shadowEnabled`, `gradientEnabled` | Independent effect toggles; disabling the gradient uses `backgroundTop` as a solid color |
| `strokeWidth`, `blurRatio`, `opacity`, `color` | Trail appearance |
| `shadowColor`, `shadowOpacity`, `shadowOffsetX`, `shadowOffsetY` | Optional shadow |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Background gradient colors |
| `seed` | Integer for reproducible randomness; `null` for fresh randomness on load |

Stroke, fade lengths, and shadow offsets use native motif units and scale
with `motifWidth`. Blur radius is `strokeWidth × blurRatio`. Studio shows
fractions as percentages and uses whole-number controls. A restrictive content security policy must allow Blob module scripts
for Studio to load configuration.

## Source structure

- `config.js`: layout, appearance, and animation settings.
- `motif.js`: closed motif geometry and bounds.
- `geometry.js`: circular arc point calculations.
- `tile.js`: tile-relative placements and seeded layout offset.
- `scene.js`: configuration validation and scene preparation.
- `repeats.js`: neighboring tile offsets for wrapping.
- `renderer.js`: visible path sections and wrapped fragments.
- `choreography.js`: visible candidates, drawing order, and playback timing.
- `animation.js`: trail rendering, fading, viewport updates, and lifecycle.
- `svg.js`: shared SVG markup for the build and Studio.
- `docs/studio.html` / `docs/studio.js`: Studio interface and preview controls.
- `docs/config-source.js`: comment-preserving configuration updates used by the Save endpoint.
- `studio.mjs`: local development server and Save endpoint.
- `build.mjs`: generate the standalone `hektor.svg` with embedded runtime.
