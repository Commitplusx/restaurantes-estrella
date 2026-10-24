import { UUID_PATTERN } from './restaurantBranches';
import { parsePublicMenu, type PublicMenuData } from './publicMenuData';

export type MenuRowsKind = 'categories' | 'items' | 'combos' | 'promos';
export interface PublicMenuSource {
  restaurant(identifier: string, signal: AbortSignal): Promise<unknown>;
  rows(kind: MenuRowsKind, restaurantId: string, signal: AbortSignal): Promise<unknown>;
}
export interface MenuRestaurantHint { id: string; slug?: string }
function identity(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' || !UUID_PATTERN.test(value.id)) {
    throw new Error('No pudimos identificar el restaurante.');
  }
  return value.id;
}

/** A listing hint is routing metadata only. Every displayed field still comes from the full server read. */
export async function readPublicMenu(identifier: string, source: PublicMenuSource, signal: AbortSignal, hint?: MenuRestaurantHint): Promise<PublicMenuData | null> {
  const key = identifier.trim().toLowerCase();
  if (!key || key.length > 160 || !/^[a-z0-9-]+$/.test(key)) throw new Error('El enlace del restaurante no es válido.');
  const knownId = UUID_PATTERN.test(key) ? key
    : hint && UUID_PATTERN.test(hint.id) && hint.slug === key ? hint.id : null;
  const restaurantRead = source.restaurant(knownId || key, signal);
  const readRows = (id: string) => Promise.all((['categories', 'items', 'combos', 'promos'] as const)
    .map(kind => source.rows(kind, id, signal)));
  let restaurant: unknown;
  let results: unknown[];
  if (knownId) {
    [restaurant, results] = await Promise.all([restaurantRead, readRows(knownId)]);
    if (identity(restaurant) === null) return null;
    if (identity(restaurant) !== knownId) throw new Error('El restaurante cambió. Vuelve a abrir su menú.');
    if (!UUID_PATTERN.test(key) && (typeof restaurant !== 'object' || restaurant === null || !('slug' in restaurant) || restaurant.slug !== key)) {
      throw new Error('El enlace del menú cambió. Vuelve a elegir el restaurante.');
    }
  } else {
    restaurant = await restaurantRead;
    const id = identity(restaurant);
    if (id === null) return null;
    results = await readRows(id);
  }
  return parsePublicMenu(restaurant, results[0], results[1], results[2], results[3]);
}
