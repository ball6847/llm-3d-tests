/* =========================================================================
   Capture static thumbnails of EVERY scene into thumbs/.
   Dev utility. For adding only new/missing results, use sync-collection.mjs.

   Run:  node tools/capture-thumbs.mjs
   Env:  CHROME_PATH  THUMB_W  THUMB_H
   ========================================================================= */

import { mkdirSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, launchBrowser, captureScene, scanScenes } from './capture.mjs';

const OUT = path.join(ROOT, 'thumbs');
const W = Number(process.env.THUMB_W || 960);
const H = Number(process.env.THUMB_H || 540);
const CONCURRENCY = 3;

mkdirSync(OUT, { recursive: true });
const files = scanScenes(fs);
const browser = await launchBrowser();

const ok = [];
const failed = [];
let cursor = 0;

async function worker() {
  while (cursor < files.length) {
    const job = files[cursor++];
    const r = await captureScene(browser, job, OUT, { width: W, height: H });
    if (r.ok) { ok.push(`${job.v}/${job.slug}`); console.log(`ok   ${job.v}/${job.slug}`); }
    else { failed.push({ scene: `${job.v}/${job.slug}`, error: r.error }); console.log(`FAIL ${job.v}/${job.slug}: ${r.error}`); }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
await browser.close();

console.log(`\n${ok.length}/${files.length} captured`);
if (failed.length) console.log(JSON.stringify(failed, null, 2));
process.exit(failed.length ? 1 : 0);