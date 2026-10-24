import { supabase } from './supabase';
import { RESTAURANT_PUBLIC_FIELDS, UUID_PATTERN } from './restaurantBranches';
import type { PublicMenuData } from './publicMenuData';
import { PublicResource, PublicResourcePool, PUBLIC_MENU_POLICY } from './publicResource';
import { requireCatalogResponse } from './catalogRequest';
import { cachedLandingCatalog } from './publicLandingCatalog';
import { readPublicMenu, type PublicMenuSource } from './publicMenuRequest';

const source: PublicMenuSource = {
  async restaurant(identifier, signal) {
    const result = await supabase.from('storefront_restaurants').select(RESTAURANT_PUBLIC_FIELDS)
      .eq(UUID_PATTERN.test(identifier) ? 'id' : 'slug', identifier).abortSignal(signal).maybeSingle().returns<unknown>();
    if (result.error) throw new Error('No pudimos consultar el restaurante. Revisa tu conexión y reintenta.');
    return result.data;
  },
  async rows(kind, restaurantId, signal) {
    const query = kind === 'categories' ? supabase.from('menu_categorias').select('id,restaurante_id,nombre,emoji,orden,activa').eq('restaurante_id', restaurantId).order('orden').limit(501)
      : kind === 'items' ? supabase.from('menu_items').select('id,restaurante_id,categoria_id,nombre,descripcion,precio,foto_url,disponible,es_popular,activo,orden,opciones,aplica_subsidio,agotado_hoy,agotado_hasta,hora_inicio_disponible,hora_fin_disponible').eq('restaurante_id', restaurantId).eq('disponible', true).order('orden').limit(501)
      : kind === 'combos' ? supabase.from('menu_combos').select('id,restaurante_id,nombre,descripcion,precio,foto_url,incluye,disponible,opciones,aplica_subsidio').eq('restaurante_id', restaurantId).eq('disponible', true).limit(501)
      : supabase.from('menu_promociones').select('id,restaurante_id,titulo,descripcion,precio_especial,foto_url,fecha_fin,activa,aplica_subsidio,dias_aplicacion,tipos_pedido,opciones').eq('restaurante_id', restaurantId).eq('activa', true).limit(101);
    return requireCatalogResponse(await query.abortSignal(signal).returns<unknown>());
  },
};
const menus = new PublicResourcePool<PublicMenuData | null>(20);
export function publicMenuResource(identifier: string): PublicResource<PublicMenuData | null> {
  const key = identifier.trim().toLowerCase();
  return menus.get(key, () => new PublicResource(signal => {
    const hint = cachedLandingCatalog().restaurants.find(row => row.id === key || row.slug === key);
    return readPublicMenu(key, source, signal, hint);
  }, PUBLIC_MENU_POLICY));
}
export function invalidatePublicMenus(): void { menus.invalidateAll(); }

let prefetching = false;
/** Only explicit pointer/keyboard intent; one speculative request at a time. */
export async function prefetchPublicMenu(identifier: string): Promise<void> {
  if (prefetching || typeof document === 'undefined' || document.hidden || navigator.onLine === false) return;
  prefetching = true;
  try { await publicMenuResource(identifier).refresh(); }
  finally { prefetching = false; }
}
