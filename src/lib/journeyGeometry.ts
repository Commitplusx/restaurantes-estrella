export interface JourneyBounds { left: number; top: number; width: number; height: number }

export interface MotionCartRow {
  item: { id: string; tipo: string; cartItemId?: string; foto_url?: string };
  cantidad: number;
}

export function validJourneyBounds(bounds: JourneyBounds): boolean {
  return [bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) && bounds.width >= 1 && bounds.height >= 1;
}

/** The frame changes aspect ratio, while its photo keeps a uniform scale. */
export function journeyTransform(origin: JourneyBounds, destination: JourneyBounds) {
  if (!validJourneyBounds(origin) || !validJourneyBounds(destination)) return null;
  const scaleX = destination.width / origin.width;
  const scaleY = destination.height / origin.height;
  return {
    x: destination.left + destination.width / 2 - origin.left - origin.width / 2,
    y: destination.top + destination.height / 2 - origin.top - origin.height / 2,
    scaleX, scaleY, photoScale: Math.min(scaleX, scaleY),
  };
}

/** Ignore restoration, edits and reductions: only one committed addition earns a flight. */
export function addedCartProduct(previous: readonly MotionCartRow[], next: readonly MotionCartRow[]) {
  const key = (row: MotionCartRow) => `${row.item.tipo}:${row.item.cartItemId || row.item.id}`;
  const before = new Map(previous.map(row => [key(row), row.cantidad]));
  const after = new Map(next.map(row => [key(row), row.cantidad]));
  if (previous.some(row => (after.get(key(row)) ?? 0) < row.cantidad)) return null;
  const additions = next.filter(row => row.cantidad > (before.get(key(row)) ?? 0));
  if (additions.length !== 1) return null;
  const added = additions[0];
  if (added.cantidad - (before.get(key(added)) ?? 0) !== 1 || !added.item.foto_url) return null;
  return { key: `${added.item.tipo}:${added.item.id}`, image: added.item.foto_url };
}
