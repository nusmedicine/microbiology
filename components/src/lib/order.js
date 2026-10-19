// Display order for answer options. Authors tend to write the correct option first, so components
// show options in a shuffled order seeded by a stable key (the item's id): the same question shows the
// same order on every visit and for every student, and answers are still stored by the option's
// index in the data. `ordered: true` on an item keeps the authored order, for options that form a
// scale (concentrations, percentages).

function hash(s) {
  // FNV-1a, 32-bit
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  // mulberry32
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Indices 0..n-1 in display order for the item identified by `key`. */
export function optionOrder(n, key, ordered = false) {
  const idx = Array.from({ length: n }, (_, i) => i);
  if (ordered || n < 2) return idx;
  const rand = rng(hash(String(key)));
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
