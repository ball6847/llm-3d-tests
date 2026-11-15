# 3D scene bench

A static preview UI for the LLM Three.js test bench. One prompt was sent to many
models; each model returned a standalone HTML file. This site shows the prompt
and lets you open every raw render side by side, without restyling any of them.

Two pages:

- `index.html` shows the prompt and a grid of model cards with thumbnails.
- `view.html` renders one model's real HTML full-viewport in an iframe, with a
  sticky header to go back, switch models, or open the raw file.

## Live site

<https://ball6847.github.io/llm-3d-tests/>

Deployed from the `main` branch via GitHub Pages. Every push rebuilds it.

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

`prompts.js` holds the two prompts that were sent, one per version:

- `PROMPT_V1` is the brief given to every model in `v1/`.
- `PROMPT_V2` is the brief given to every model in `v2/`.

Both are plain JSON-quoted string literals, so backticks, quotes, and newlines
inside a prompt need no manual escaping. To edit one, change the text between
the quotes and keep the quotes. The index page reads these two constants and
nothing else needs to change.

## Adding new results

Drop the model's HTML file into `v1/` or `v2/`, then run the sync skill
(`.agents/skills/sync-bench/`) or its script directly from the project root:

```bash
node tools/sync-collection.mjs
```

It scans both folders, regenerates `manifest.js`, and captures a thumbnail for
every result that lacks one. It prints what was added, resized, or removed.
Useful flags: `--dry-run` to preview the diff, `--force` to re-capture every
thumbnail, `--prune` to delete thumbnails whose result file is gone. The sync
never edits or deletes the result HTML files themselves.

## Deep links

The viewer reads `v` (1 or 2) and `model` (the filename without `.html`) from the
query string, for example `view.html?v=1&model=tiel-coder-q3`. Version plus model
is the unique key, since `agnes-3.0-flash` and `tiel-coder-q3` exist in both
versions. Unknown or missing values show an error panel with links to the valid
models instead of a blank iframe.

## File layout

```
llm-3d-tests/
  index.html        prompt index + model grid
  view.html         full-viewport iframe viewer
  prompts.js        PROMPT_V1 / PROMPT_V2 (the real prompt text)
  manifest.js       generated model list + byte sizes (do not edit by hand)
  app.css           shell styles
  app.js            page logic (reads window.MANIFEST and window.PROMPTS)
  thumbs/           v1-<model>.png, v2-<model>.png
  tools/
    capture.mjs          shared headless-Chrome capture helpers
    sync-collection.mjs  add missing results + thumbnails (the sync skill)
    capture-thumbs.mjs   re-capture every thumbnail
  .agents/skills/sync-bench/   the sync skill (SKILL.md)
  v1/               17 raw model HTML files
  v2/               5 raw model HTML files
```

The model list and the byte sizes shown on the cards live in `manifest.js`,
which is generated from the files on disk by `tools/sync-collection.mjs`. Do not
edit it by hand; change the files and re-run the sync.

## Thumbnails

Real screenshots, not live iframes. Each scene is loaded in headless Chrome
(Playwright driving the system Chrome), waited for its canvas and loading
overlay, given a few seconds to settle, and captured at 960x540 to
`thumbs/<version>-<model>.png`. All 22 current results have a thumbnail. Cards
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