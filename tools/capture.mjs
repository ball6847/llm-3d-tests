/* =========================================================================
   Shared headless-Chrome capture helpers for the 3D scene bench.
   Used by tools/capture-thumbs.mjs (capture everything) and
   tools/sync-collection.mjs (capture only what's missing).

   Requires Node + Playwright + a Chrome/Chromium binary. Playwright is
   resolved via require('playwright') first, then a neighboring project's
   copy on this machine. Override the browser with CHROME_PATH.
   ========================================================================= */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The collections live in collections.js so the pages and the tools read the
   same list. Each collection owns a folder under collections/ named after
   its slug. */
export const COLLECTIONS = require(path.join(ROOT, 'collections.js'));

export function resolvePlaywright() {
  try {
    return require('playwright');
  } catch {
    return require('/home/ball6847/Projects/personal/pi-web/node_modules/playwright');
  }
}

export async function launchBrowser() {
  const pw = resolvePlaywright();
  return pw.chromium.launch({
    executablePath: process.env.CHROME_PATH || '/bin/google-chrome',
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--hide-scrollbars', '--force-color-profile=srgb'],
  });
}

/* Every scene hides one of these overlays once its first frame renders. */
const LOADER_HIDDEN = () => {
  const sels = ['#loader', '#loading', '#overlay', '#boot'];
  return sels.every((s) => {
    const el = document.querySelector(s);
    if (!el) return true;
    const st = getComputedStyle(el);
    return st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.05;
  });
};

/* Some scenes open on an intro card that only clears when the visitor
   presses start. Click it so the capture shows the scene, not the card. */
const DISMISS_INTRO = () => {
  const btn = document.querySelector('#startBtn, #start, [data-start]');
  if (btn) { btn.click(); return true; }
  const intro = document.querySelector('#intro');
  if (intro) { intro.classList.add('gone'); return true; }
  return false;
};

/* Capture one scene to <outDir>/<v>-<slug>.png. Returns true on success.
   Failures are reported, never thrown, so a batch can skip and continue. */
export async function captureScene(browser, job, outDir, opts = {}) {
  const W = opts.width || 960;
  const H = opts.height || 540;
  const settle = opts.settle ?? 3000;
  const out = path.join(outDir, `${job.v}-${job.slug}.png`);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  try {
    await page.goto(pathToFileURL(job.file).href, { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 20000 });
    await page.waitForFunction(LOADER_HIDDEN, null, { timeout: 25000 }).catch(() => {});
    await page.evaluate(DISMISS_INTRO).catch(() => {});
    await page.waitForTimeout(settle);
    await page.screenshot({ path: out });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, error: String(e.message || e).split('\n')[0] };
  } finally {
    await page.close();
    await ctx.close();
  }
}

/* List every result file on disk as { v, slug, file, bytes }. The v is the
   collection slug, which is also the thumbnail prefix. */
export function scanScenes(fs) {
  const jobs = [];
  for (const collection of COLLECTIONS) {
    const dir = path.join(ROOT, 'collections', collection.slug);
    let names = [];
    try { names = fs.readdirSync(dir); } catch { continue; }
    for (const f of names.sort()) {
      if (!f.endsWith('.html')) continue;
      const file = path.join(dir, f);
      jobs.push({ v: collection.slug, slug: f.slice(0, -5), file, bytes: fs.statSync(file).size });
    }
  }
  return jobs;
}