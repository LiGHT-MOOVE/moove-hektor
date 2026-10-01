# Moove Hektor

A standalone animated SVG of repeating motifs with soft moving trails. Inspired
by **Hektor**, the project by **Jürg Lehni**. No runtime assets or dependencies.

## Build and embed

Requires Node.js 18 or newer. Run `pnpm run build` (or `npm run build`) to generate
`hektor.svg`. Rebuild after changing configuration or source files.

```html
<object type="image/svg+xml" data="/hektor.svg"
        aria-label="Animated Moove pattern"
        style="position:fixed;inset:0;width:100%;height:100%;border:0;pointer-events:none">
</object>
```

Give the object an explicit size. An `<img>` or CSS background does not execute
embedded scripts. The site's content security policy must allow the embedding
and script method.

## Use Studio

1. Open [moove-hektor studio](docs/pattern-preview.html) through a local web server.
2. Adjust tile dimensions for spacing, motif positions for arrangement, and motif width for displayed size. Add, remove, or invert motifs as needed.
3. Inspect repetition and overlaps in **Tile layout**, then check framing in **Desktop** and **Mobile**. Enable **Animate trails** and **Blur and shadow** to preview the effect.
4. Choose **Copy config.js**, replace the project's `config.js` with the copied text, and rebuild. Comments and untouched settings are preserved.
5. Reload Studio after editing the file externally. **Reset** restores the settings loaded when the page opened.

Edits are not saved automatically. **Fullscreen animation** opens the last built
SVG. Preview mode and the animation/effects toggles are not exported.

Mobile crops the pattern's center at the same motif scale as desktop. Repeated
copies of each motif share its animation timing. Reduced-motion preferences show
complete static outlines.

## Configuration

All settings live in `config.js`: `PATTERN` defines geometry and layout; `CONFIG`
defines appearance and animation. Keep it a self-contained module of literal
settings for Studio loading and export.

`PATTERN.tileWidth` and `tileHeight` control spacing in native motif units.
Motif placements use `{ x, y, rotation, delay }`: x/y are tile fractions
(`0.5` = halfway), rotation is 0 or 180 degrees, and delay is seconds before the
first drawing and between completed cycles. Positions outside the tile wrap.
Smaller tiles can cause overlaps.

For custom outlines, `turns` contains `{ radius, degrees }` entries. Radii must be
positive; positive angles turn clockwise. The outline must close in position
and tangent.

| CONFIG setting | Purpose |
| --- | --- |
| `motifWidth` | Displayed motif width in pixels |
| `patternOffset` | `{ x, y }` tile fractions relative to screen center; positive moves right/down; `null` randomizes placement |
| `loopDuration` | Seconds per circuit |
| `pauseBetweenDrawings` | Use motif delays when true; continuous movement, ignoring delays, when false |
| `randomStartingPositions` | Random trail starting points when true; start at zero when false |
| `trailFraction` | Trail length as a fraction of the perimeter, including fades; greater than 0 and less than 1 |
| `headFadeLength`, `tailFadeLength`, `headFadePower` | Fade lengths and head taper; zero length disables that fade |
| `strokeWidth`, `blur`, `opacity`, `color` | Trail appearance |
| `shadowEnabled`, `shadowColor`, `shadowOpacity`, `shadowOffsetX`, `shadowOffsetY` | Optional shadow |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Background gradient colors |
| `seed` | Integer for reproducible randomness; `null` for fresh randomness on load |

Stroke, blur, fade lengths, and shadow offsets use native motif units and scale
with `motifWidth`. Studio shows fractions as percentages and uses whole-number
controls. A restrictive content security policy must allow Blob module scripts
for Studio to load configuration.

## Source structure

- `config.js`: layout, appearance, and animation settings.
- `motif.js`: closed motif geometry and bounds.
- `geometry.js`: circular arc point calculations.
- `tile.js`: tile-relative placements and seeded starting positions.
- `scene.js`: configuration validation and scene preparation.
- `repeats.js`: neighboring tile offsets for wrapping.
- `renderer.js`: visible path sections and wrapped fragments.
- `animation.js`: trail timing, fading, and animation lifecycle.
- `svg.js`: shared SVG markup for the build and Studio.
- `docs/pattern-preview.html` / `docs/pattern-preview.js`: Studio interface and preview controls.
- `docs/config-source.js`: comment-preserving configuration export.
- `build.mjs`: generate the standalone `hektor.svg` with embedded runtime.
