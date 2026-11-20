# 3D scene bench

A static preview UI for the LLM Three.js test bench. One prompt was sent to many
models; each model returned a standalone HTML file. This site shows the prompt
and lets you open every raw render side by side, without restyling any of them.

Two pages:

- `index.html` shows the prompt and a grid of model cards with thumbnails.
- `view.html` renders one model's real HTML full-viewport in an iframe, with a
  sticky header to go back, switch models, or open the raw file.

On a phone the viewer header is one row: back arrow, collection chip, model
name, and a sliders button. The button opens a drop-down with the two selects
and the raw file link, so the scene keeps the rest of the screen. On wider
screens the same controls sit inline in the header as usual.

## Collections

A collection is one prompt sent to many models. `collections.js` lists them, and
each owns a folder under `collections/` named after its slug.

| slug | label | folder | models |
|---|---|---|---|
| `aurora-torus` | Aurora torus | `collections/aurora-torus/` | 23 |
| `aurora-torus-with-control` | Aurora torus with control | `collections/aurora-torus-with-control/` | 6 |
| `llamacpp-expert-cache-viz` | llama.cpp expert cache | `collections/llamacpp-expert-cache-viz/` | 1 |

The slug is also the thumbnail prefix (`thumbs/<slug>-<model>.png`) and the
`?v=` value in the URL.

## Live site

<https://ball6847.github.io/llm-3d-tests/>

Deployed from the `main` branch via GitHub Pages. Every push rebuilds it.

## Fonts

The shell sets in JetBrains Mono for technical text and IBM Plex Sans for
prose, both self-hosted in `fonts/`. IBM Plex Sans Thai covers the Thai
prompts, which have no monospaced face. All three families are under the
SIL Open Font License; the license files travel with the fonts in
`fonts/`. See `fonts/README.md`.

## Open it locally

No build step, no dependencies. Either works:

- Double-click `index.html`, or open `file:///.../llm-3d-tests/index.html`.
- Or serve the folder: `python3 -m http.server 8000` and visit
  `http://localhost:8000`.

The scenes themselves fetch Three.js from a CDN, so they need a network
connection either way.

One difference between the two modes, on purpose:

- Over http, switching models in the viewer swaps the iframe without reloading
  the page, and the URL stays a clean shareable link (`view.html?v=2&model=...`).
- Over `file://`, Chrome treats every local file as a separate opaque origin.
  That blocks the trick used to swap the iframe without adding browser-history
  entries, so on `file://` a model switch does a normal page navigation instead.
  Back, Forward, and deep links still work in both modes. If you want the
  no-reload switching, use the local server.

## The prompts

`prompts.js` holds the prompt for each collection:

- `PROMPT_AURORA_TORUS` is the brief given to every model in
  `collections/aurora-torus/`.
- `PROMPT_AURORA_TORUS_WITH_CONTROL` is the brief for
  `collections/aurora-torus-with-control/`.
- `PROMPT_LLAMACPP_EXPERT_CACHE_VIZ` is the brief given to every model in
  `collections/llamacpp-expert-cache-viz/`.

They are plain JSON-quoted string literals, so backticks, quotes, and newlines
inside a prompt need no manual escaping. To edit one, change the text between
the quotes and keep the quotes. The index page reads these constants and
nothing else needs to change.

The `aurora-torus` prompt was revised after the first 16 runs: the camera now
orbits by dragging instead of following the pointer, and the wheel zooms.
Only `qwen-3.8-27b-q3`, `hy4-flash`, `gemini-4-hydrogen`,
`qoder-sonus-xhigh`, `minimax-3.1-flash-xhigh`, `daisyrose-27b-q3`, and
`meituan-longcat-2.5` were run against the revised text.

`qoder-sonus-xhigh` also shipped a control panel, sliders, a geometry
switcher and keyboard shortcuts that the aurora-torus brief never asked for.
It stays in this collection because it answers that prompt, and the extra
interface is the model's own addition.

`minimax-3.1-flash` was rerun at a higher reasoning effort and the newer
file replaced the older one, so the collection lists
`minimax-3.1-flash-xhigh` instead.

The `aurora-torus-with-control` prompt was revised the same way: orbit by
dragging, wheel zooms. `qwen-3.8-q3-v` answers the revised text. The other 5
results in that collection predate the revision.

## Adding a new collection

1. Add an entry to `collections.js` (slug, label, short label).
2. Create `collections/<slug>/` and drop the model HTML files in.
3. Add the prompt string to `prompts.js`, keyed by the slug.
4. Run the sync script.

## Adding new results

Drop the model's HTML file into the folder for its collection, then run the sync
skill (`.agents/skills/sync-bench/`) or its script directly from the project
root:

```bash
node tools/sync-collection.mjs
```

It scans every collection folder, regenerates `manifest.js`, and captures a
thumbnail for every result that lacks one. It prints what was added, resized,
or removed. Useful flags: `--dry-run` to preview the diff, `--force` to
re-capture every thumbnail, `--prune` to delete thumbnails whose result file is
gone. The sync never edits or deletes the result HTML files themselves.

## Deep links

The viewer reads `v` (the collection slug) and `model` (the filename without
`.html`) from the query string, for example
`view.html?v=aurora-torus&model=tiel-coder-q3`. Collection plus model is the
unique key, since `agnes-3.0-flash` and `tiel-coder-q3` were run for both
collections. Unknown or missing values show an error panel with links to the
valid models instead of a blank iframe.

The old numbered values (`?v=1`, `?v=2`) still resolve, so links made before
the rename keep working.

## File layout

```
llm-3d-tests/
  index.html        prompt index + model grid
  view.html         full-viewport iframe viewer
  prompts.js        the prompt text, one string per collection
  collections.js    the collection list (slug, label)
  manifest.js       generated model list + byte sizes (do not edit by hand)
  app.css           shell styles
  app.js            page logic (reads window.MANIFEST, window.COLLECTIONS, window.PROMPTS)
  thumbs/           <collection>-<model>.png
  fonts/            JetBrains Mono, IBM Plex Sans, IBM Plex Sans Thai (OFL)
  tools/
    capture.mjs          shared headless-Chrome capture helpers
    sync-collection.mjs  add missing results + thumbnails (the sync skill)
    capture-thumbs.mjs   re-capture every thumbnail
  .agents/skills/sync-bench/   the sync skill (SKILL.md)
  collections/
    aurora-torus/               23 raw model HTML files
    aurora-torus-with-control/   6 raw model HTML files
    llamacpp-expert-cache-viz/   1 raw model HTML file
```

The model list and the byte sizes shown on the cards live in `manifest.js`,
which is generated from the files on disk by `tools/sync-collection.mjs`. Do not
edit it by hand; change the files and re-run the sync.

## Thumbnails

Real screenshots, not live iframes. Each scene is loaded in headless Chrome
(Playwright driving the system Chrome), waited for its canvas and loading
overlay, given a few seconds to settle, and captured at 960x540 to
`thumbs/<variant>-<model>.png`. All 30 current results have a thumbnail. Cards
load these lazily; if a PNG is ever missing, the card falls back to a
"No preview" tile.

The sync script captures only what is missing. To re-capture everything after
editing existing scenes:

```bash
node tools/capture-thumbs.mjs
```

Both scripts need Node, Playwright, and a Chrome binary. They look for Playwright
via `require('playwright')` first, then fall back to a neighboring project's copy
on this machine. Set `CHROME_PATH` to point at a different browser, and
`THUMB_W` / `THUMB_H` to change the capture size.