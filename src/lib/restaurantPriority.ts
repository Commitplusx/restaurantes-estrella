interface RestaurantBrandIdentity {
  id: string;
  matriz_id?: string | null;
}

// Public brand IDs: Makitán, then Pollo Robin's. Branches inherit their root's rank.
const PRIORITY_BRANDS: readonly string[] = [
  '010c7fdd-1c8a-4392-92d1-9a9f9e33c0a0',
  'fa1b9bc1-eefd-489d-8ae4-fd3682efe4dd',
];

function brandPriority(restaurant: RestaurantBrandIdentity): number {
  const rank = PRIORITY_BRANDS.indexOf(restaurant.matriz_id || restaurant.id);
  return rank < 0 ? PRIORITY_BRANDS.length : rank;
}

/** Stable ranking of the eligible input; never inserts a hidden or filtered restaurant. */
export function prioritizeRestaurantBrands<T extends RestaurantBrandIdentity>(restaurants: readonly T[]): T[] {
  return [...restaurants].sort((left, right) => brandPriority(left) - brandPriority(right));
}
