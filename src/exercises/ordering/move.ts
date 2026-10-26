/** Returns a copy of `order` with the entry at `from` moved to `to` (clamped). */
export function moveItem<T>(order: readonly T[], from: number, to: number): T[] {
  const next = order.slice();
  const target = Math.max(0, Math.min(order.length - 1, to));
  if (from < 0 || from >= order.length || from === target) return next;
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
