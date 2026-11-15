/* =========================================================================
   The collections in this bench.

   One entry per collection. The slug is the key used everywhere: the
   folder under collections/, the manifest key, the prompts file key, the
   thumbnail prefix, and the ?v= value in the URL. The label is what people
   read, the short label is for tight spots like the viewer chip.

   To add a collection: add an entry here, create collections/<slug>/, add
   the prompt text to prompts.js, then run the sync script.
   ========================================================================= */

var BENCH_COLLECTIONS = [
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

if (typeof window !== 'undefined') window.COLLECTIONS = BENCH_COLLECTIONS;
if (typeof module !== 'undefined' && module.exports) module.exports = BENCH_COLLECTIONS;
