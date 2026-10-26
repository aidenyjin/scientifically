/** Assignment of each item (by original index) to a category id, or null while still in the tray. */
export type Placement = readonly (string | null)[];

export function isComplete(placement: Placement): placement is readonly string[] {
  return placement.every((categoryId) => categoryId !== null);
}

/**
 * The item the next bin key/click will place: the one the learner picked if
 * it's still in the tray, else the first unplaced item in tray order.
 */
export function activeItem(trayOrder: readonly number[], placement: Placement, chosen: number | null): number | null {
  if (chosen !== null && placement[chosen] === null) return chosen;
  return trayOrder.find((item) => placement[item] === null) ?? null;
}

/** Step the active item through the tray (wrapping), for ←/→. */
export function cycleActive(
  trayOrder: readonly number[],
  placement: Placement,
  active: number | null,
  delta: number,
): number | null {
  const tray = trayOrder.filter((item) => placement[item] === null);
  if (tray.length === 0) return null;
  const at = active === null ? -1 : tray.indexOf(active);
  return tray[(((at + delta) % tray.length) + tray.length) % tray.length];
}
