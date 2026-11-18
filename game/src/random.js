// A small seeded random number generator (mulberry32): the same seed gives the
// same city and the same traffic, which is what makes the screenshot scenes
// repeatable.  Convenience helpers pick integers, floats and list members.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [lo, hi). */
export function range(random, lo, hi) {
  return lo + random() * (hi - lo);
}

/** An integer in [lo, hi]. */
export function int(random, lo, hi) {
  return lo + Math.floor(random() * (hi - lo + 1));
}

/** A random member of a non-empty array. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** True with probability p. */
export function chance(random, p) {
  return random() < p;
}
