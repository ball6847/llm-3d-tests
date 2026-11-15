/* =========================================================================
   The scene variants in this bench.

   One entry per variant. The slug is the key used everywhere: the manifest,
   the prompts file, the URL (?v=<slug>) and the folder name on disk. The
   label is what people read, the short label is for tight spots like the
   viewer chip.

   To add a variant: add an entry here, create the folder with the same
   name, then run the sync script.
   ========================================================================= */

var BENCH_VERSIONS = [
  {
    slug: 'aurora-torus',
    label: 'Aurora torus',
    short: 'Aurora torus',
    legacy: '1'
  },
  {
    slug: 'aurora-torus-with-control',
    label: 'Aurora torus with control',
    short: 'Aurora + control',
    legacy: '2'
  }
];

if (typeof window !== 'undefined') window.VERSIONS = BENCH_VERSIONS;
if (typeof module !== 'undefined' && module.exports) module.exports = BENCH_VERSIONS;
