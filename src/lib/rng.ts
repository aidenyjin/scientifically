/** Deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a shuffled copy (Fisher–Yates). Same seed → same order. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const next = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffled index order for `length` items, re-rolled so it is never the
 * identity order when length > 1 (an unshuffled list gives the answer away).
 */
export function shuffledOrder(length: number, seed: number): number[] {
  const base = Array.from({ length }, (_, i) => i);
  if (length < 2) return base;
  for (let attempt = 0; attempt < 8; attempt++) {
    const order = shuffle(base, seed + attempt * 7919);
    if (order.some((v, i) => v !== i)) return order;
  }
  return [...base.slice(1), base[0]];
}

/** Stable 32-bit hash of a string, for deriving seeds from ids. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Integer in [min, max] inclusive. */
export function randInt(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1));
}
