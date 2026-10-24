import type { CartItem } from '../types';
import type { PublicMenuData } from './publicMenuData';

export interface MenuCartEntry { item: CartItem; cantidad: number }
/** Called only for a complete new server snapshot, never for partial/failed reads or initial cached data. */
export function reconcileMenuCart(cart: MenuCartEntry[], origin: string | null, data: PublicMenuData): MenuCartEntry[] {
  if (origin !== data.restaurante.id || !cart.length) return cart;
  let changed = false;
  const next = cart.flatMap(entry => {
    const latest = entry.item.tipo === 'item' ? data.items.find(row => row.id === entry.item.id)
      : entry.item.tipo === 'combo' ? data.combos.find(row => row.id === entry.item.id)
      : data.promos.find(row => row.id === entry.item.id);
    if (!latest) { changed = true; return []; }
    if (entry.item.aplica_subsidio !== latest.aplica_subsidio) {
      changed = true;
      return [{ ...entry, item: { ...entry.item, aplica_subsidio: latest.aplica_subsidio } }];
    }
    return [entry];
  });
  return changed ? next : cart;
}
