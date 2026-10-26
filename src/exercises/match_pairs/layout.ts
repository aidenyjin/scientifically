import { shuffledOrder } from "@/lib/rng";

/**
 * Independent shuffles for the two columns (pair indices, top to bottom).
 * The right column is re-rolled so no row lines up with its own match;
 * otherwise reading straight across would give answers away.
 */
export function columnOrders(length: number, seed: number): { left: number[]; right: number[] } {
  const left = shuffledOrder(length, seed);
  const aligned = (right: number[]) => right.some((pair, row) => pair === left[row]);
  for (let attempt = 1; attempt <= 12; attempt++) {
    const right = shuffledOrder(length, seed + attempt * 104729);
    if (!aligned(right)) return { left, right };
  }
  // Fallback: rotate the left order by one row, which never aligns (length > 1).
  return { left, right: length > 1 ? [...left.slice(1), left[0]] : left.slice() };
}
