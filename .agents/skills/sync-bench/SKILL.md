---
name: sync-bench
description: Add new LLM result files to the 3D scene bench collection and keep it in sync with disk. Use whenever the user drops new model HTML into v1/ or v2/, says there are new or missing results, asks to add a model to the grid, refresh or regenerate thumbnails, update the model list or manifest, or wonders why a result file is not showing up in index.html. Also use after renaming or deleting result files. If the user mentions the bench, the collection, the model grid, or thumbnails being out of date, run this skill rather than editing manifest.js by hand.
---

# Sync the 3D scene bench collection

The bench shows one card per result file in `v1/` and `v2/`. The pages read a
generated `manifest.js` (model slugs + byte sizes) and a `thumbs/` folder of PNG
previews. When result files change on disk, those two artifacts go stale. This
skill reconciles them in one command instead of hand-editing anything.

The result folders are the source of truth. The sync never edits or deletes the
model HTML files themselves; it only regenerates `manifest.js` and captures or
prunes thumbnails.

## When to use

- New `.html` results were added to `v1/` or `v2/` and should appear in the grid.
- A result was renamed or removed and the grid or a thumbnail is now wrong.
- Thumbnails are missing, blank, or out of date after a scene changed.
- The user asks to "add the missing models", "refresh the collection", or
  "regenerate thumbnails".

## Do this

From the project root (`llm-3d-tests/`), run:

```bash
node tools/sync-collection.mjs
```

That scans `v1/` and `v2/`, rewrites `manifest.js`, and captures a thumbnail for
every result that lacks one. It prints what was added, resized, or removed, and
which thumbnails it captured. Read that summary and report it to the user.

Useful flags:

- `--dry-run` report the diff without writing anything. Good first step when you
  want to confirm what will change before touching files.
- `--force` re-capture every thumbnail, not just missing ones. Use after editing
  existing scenes so their previews match the new render.
- `--prune` also delete thumbnail PNGs whose result file no longer exists.
  Without this, orphaned PNGs are left on disk and only reported.

A typical careful pass is `--dry-run` first, then the real run, adding `--prune`
only if the user confirms removed results should lose their previews.

## Verify it worked

After syncing, open `index.html` (double-click, or `python3 -m http.server` and
visit it). Confirm the model count next to "Results" matches the number of files
in the selected version, the new cards show real thumbnails, and clicking a new
card opens `view.html` with that scene rendering. The viewer's model select should
also list the new model. If a card shows the "No preview" tile, its capture
failed; re-run with `--force` or check the failure line in the sync output.

## How it fits together

- `tools/sync-collection.mjs` is the entry point described above.
- `tools/capture.mjs` holds the shared headless-Chrome capture logic (wait for the
  canvas, wait for the loading overlay to hide, settle, screenshot at 960x540).
- `tools/capture-thumbs.mjs` re-captures everything; prefer the sync script for
  routine adds so existing thumbnails are not needlessly regenerated.
- `manifest.js` is generated. Do not edit it by hand; change the files on disk and
  re-run the sync. `app.js` reads `window.MANIFEST` from it.
- `prompts.js` is separate and holds the prompt text. The sync does not touch it.

## Dependencies and troubleshooting

The capture step needs Node, Playwright, and a Chrome/Chromium binary. The script
resolves Playwright via `require('playwright')` first, then falls back to a
neighboring project's copy on this machine. If neither resolves, install
Playwright somewhere on `NODE_PATH` or adjust the fallback path in
`tools/capture.mjs`. Set `CHROME_PATH` to point at a different browser, and
`THUMB_W` / `THUMB_H` to change capture size.

Scenes fetch Three.js from a CDN, so capture needs a network connection. A scene
that never hides its loading overlay will still be captured after the wait
timeout; if the thumbnail looks like a loading screen, give the scene a longer
settle or check that its overlay id is one of `#loader`, `#loading`, `#overlay`,
`#boot` (add new ids to `LOADER_HIDDEN` in `tools/capture.mjs`).