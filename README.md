![Moove Hektor](public/moove-hektor.jpg)

# Moove Hektor

A static Next.js and TypeScript studio for animated SVG motifs, inspired by
**Hektor**, the project by **Jürg Lehni**. Uses Tailwind CSS for the interface and
Zustand for project state. Projects can be saved as JSON, and every exported SVG
contains its own animation runtime with no external assets or dependencies.

## Get started

Requires Node.js **20.9 or newer** and pnpm.

```sh
pnpm install
pnpm dev
```

Open [Studio](http://localhost:3000).

| Command | Runs | Purpose |
| --- | --- | --- |
| `pnpm dev` | `next dev` | Develop Studio locally |
| `pnpm build` | `next build` | Check TypeScript and export the site to `out/` |
| `pnpm start` | `serve out` | Preview the built static site |
| `pnpm lint` | `eslint` | Check source code |

Run `pnpm build` before `pnpm start`. SVG files are exported from Studio using
**Download SVG**; building the site does not update the repository's `hektor.svg`.

## Projects

Valid control changes are saved automatically in this browser under
`hektor-project-v1`. Browser storage is local to the current origin and browser;
use **Download JSON** to keep or share a portable copy.

The **Project** panel shows the complete versioned `{ version: 1, config, pattern }`
project. Preview mode, animation toggle, selection, and unfinished JSON drafts
are not persisted or included in project downloads.

- **Load JSON** reads a file into the editor draft without changing the preview.
- **Apply JSON** validates the draft, updates the preview, and persists the project.
  You can also press **Cmd/Ctrl + Enter**.
- **Format** validates and formats the draft without applying it.
- **Download JSON** saves the applied project as `hektor-project.json`.
- **Revert edits** replaces the draft with the current applied project.
- **Restore defaults** restores the bundled project and clears the draft.

A clean JSON editor follows control changes. Once edited, its draft stays separate
until applied or reverted. Invalid JSON or geometry leaves the applied project
and animation intact. Storage errors are displayed; editing and downloads remain
available. Projects are not written back into this repository by the browser.

## Studio controls

| Section | Controls |
| --- | --- |
| Preview | Desktop / Mobile / Intersect viewport, Animate trails, Open SVG |
| Pattern | Motif width and tile dimensions |
| Pattern position | Random placement and horizontal / vertical offsets |
| Motifs | Select, add, remove, position, and invert motifs |
| Appearance | Trail color, stroke width, blur, shadow, and background gradient |
| Animation | Staggering, circuit duration, drawing duration, trail length, random starts, and pause |

Studio starts in **Desktop** with **Animate trails** enabled. Preview uses a fixed
seed of 42 for consistent inspection; it never changes the seed in your project.
**Open SVG** and **Download SVG** use the current applied project and its actual seed.

With **Pause = 0**, trails loop continuously. With a positive pause, each head
moves for **Drawing duration**, lets its tail disappear, then pauses. Circuit
duration controls speed independently; drawing can stop anywhere along the outline.
Staggering is random, left-to-right by column (Scan X), or top-to-bottom by row
(Scan Y). Scan groups share timing and regroup when the viewport changes.
Animations start with cycles already in progress. Random starting positions
choose a new outline starting point for each draw, independently of timing.
Continuous loops keep their initial offset to avoid jumps.

**Mobile** crops the center of the desktop layout at the same motif scale.
**Intersect viewport** outlines the 1440 × 900 desktop viewport in blue and reveals
its surroundings. Animation selects only motif copies whose bounding boxes intersect
that viewport, including partial motifs, while fully offscreen copies are excluded. Disable Animate trails
to inspect the complete pattern. Reduced motion also shows the static pattern.

## Animated SVG export

Click **Download SVG** to save the current project as `hektor.svg`. The result is a
self-contained animated SVG that works independently of Studio.

Load and apply a project JSON file to export that project, or choose **Restore
defaults** to export the bundled configuration.

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

## Static deployment

The Next.js configuration uses `output: "export"`. Run `pnpm build` and deploy
the generated `out/` directory to a static host. No API, database, or Next.js
production server is required. `pnpm start` uses `serve` because `next start`
cannot serve this static export.

Geist uses Next's built-in `next/font/google`. The build downloads the font,
then serves it locally with the exported site.

## Configuration

Bundled defaults live in `app/config.ts`: `CONFIG` defines appearance and animation,
and `PATTERN` defines geometry and layout. Together they form `DEFAULT_PROJECT`.

On startup, Zustand takes a copy of `DEFAULT_PROJECT`, then restores a valid saved
browser project when one exists. **Restore defaults** replaces the active project
with a fresh copy of the bundled defaults, clears the JSON draft, and saves the
result in the browser.

To change the defaults for everyone, edit `app/config.ts` and rebuild the site.
Existing browser projects keep their saved settings until **Restore defaults** is
used. To save an individual project, use **Download JSON**. Studio never rewrites
`app/config.ts`.

Studio edits and project imports preserve settings without a dedicated control.
Fractions displayed as percentages keep their precision until edited.

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
| `staggerMode` | `random`, `x` (columns), or `y` (rows); independent of outline starting positions |
| `pauseDuration` | Seconds after a trail disappears; 0 loops continuously |
| `drawDuration` | Seconds of head movement before draining; ignored when pause is 0 |
| `randomStartingPositions` | New starting point per draw; fixed initial offset for continuous loops; zero when false |
| `trailFraction` | Trail length as a fraction of the perimeter, including fades; greater than 0 and less than 1 |
| `headFadeLength`, `tailFadeLength`, `headFadePower` | Fade lengths and head taper; zero length disables that fade |
| `blurEnabled`, `shadowEnabled`, `gradientEnabled` | Independent effect toggles; disabling the gradient uses `backgroundTop` as a solid color |
| `strokeWidth`, `blurRatio`, `opacity`, `color` | Trail appearance |
| `shadowColor`, `shadowOpacity`, `shadowOffsetX`, `shadowOffsetY` | Optional shadow |
| `backgroundTop`, `backgroundMiddle`, `backgroundBottom` | Background gradient colors |
| `seed` | Integer for reproducible randomness; `null` for fresh randomness on load |

Stroke, fade lengths, and shadow offsets use native motif units and scale
with `motifWidth`. Blur radius is `strokeWidth × blurRatio`. Studio shows
fractions as percentages and uses whole-number controls. The Project panel exposes
every configuration field, including settings without a dedicated control.

## Source structure

All application source lives directly in `app/`:

- `page.tsx` / `layout.tsx`: static page generation, metadata, and Geist typography.
- `editor.tsx` / `ui.tsx`: Studio controls and shared Tailwind components.
- `preview.tsx`: SVG preview modes and animation lifecycle.
- `project-panel.tsx`: JSON drafts, file loading, validation, and downloads.
- `store.ts`: validated Zustand persistence and storage recovery.
- `project.ts`: Zod schemas, inferred types, and project serialization.
- `config.ts`: bundled defaults.
- `runtime.ts`: shared geometry, rendering, choreography, and animation.
- `svg.ts` / `export.ts`: SVG markup and complete animated SVG assembly.
- `compile.ts`: compile the standalone animation script during page generation.

The Server Component in `page.tsx` calls `compile.ts` during static generation.
TypeScript's compiler API turns `runtime.ts` into JavaScript and passes the script
to Studio as a prop. **Download SVG** embeds it with the applied project data.
Keep `runtime.ts` self-contained, with only type imports, so exported SVGs remain
independent of Studio. The compiler runs during page generation and stays outside
the browser bundle.

In development, reload the page after editing `runtime.ts` and before exporting
an SVG. This lets the Server Component read and compile the updated source.
Production builds always compile the current file.

Static assets live in `public/`, including the README image and reference drawings
in `public/docs/`. Framework configuration stays at the repository root.
