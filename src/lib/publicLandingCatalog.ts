import { supabase } from './supabase';
import { parseCatalogRows, requireCatalogResponse, type CatalogRestaurant } from './catalogRequest';
import { parseLandingPromotions } from './landingPromotions';
import { isLandingBanner } from './landingBanner';
import { PublicResource } from './publicResource';

export const CATALOG_PAGE_SIZE = 100;
const pages = new Map<number, PublicResource<CatalogRestaurant[]>>();
export function catalogPage(page: number): PublicResource<CatalogRestaurant[]> {
  if (!Number.isInteger(page) || page < 0 || page >= 10) throw new Error('Vuelve al inicio para actualizar la lista.');
  const existing = pages.get(page);
  if (existing) return existing;
  const resource = new PublicResource(async signal => {
    const result = await supabase.from('storefront_restaurants')
      .select('id,nombre,telefono,direccion,foto_fachada_url,hora_apertura,hora_cierre,horarios,categorias,slug,lat,lng,matriz_id,nombre_sucursal,activo,perfil_completo')
      .eq('activo', true).eq('perfil_completo', true).order('nombre').order('id')
      .range(page * CATALOG_PAGE_SIZE, (page + 1) * CATALOG_PAGE_SIZE - 1).abortSignal(signal).returns<unknown>();
    return parseCatalogRows(requireCatalogResponse(result));
  });
  pages.set(page, resource);
  return resource;
}
export function cachedLandingCatalog() {
  const restaurants: CatalogRestaurant[] = [];
  let page = -1;
  let hasMore = true;
  for (let index = 0; index < pages.size; index++) {
    const data = pages.get(index)?.visible();
    if (!data) break;
    restaurants.push(...data);
    page = index;
    hasMore = data.length === CATALOG_PAGE_SIZE && index < 9;
    if (!hasMore) break;
  }
  return { restaurants, page: Math.max(0, page), hasMore, available: page >= 0 };
}
export function invalidateLandingCatalog(): void { pages.forEach(page => page.invalidate()); }

export const landingPromotions = new PublicResource(async signal => {
  const result = await supabase.from('menu_promociones')
    .select('id,restaurante_id,titulo,descripcion,precio_especial,foto_url,fecha_fin,activa,aplica_subsidio,dias_aplicacion,tipos_pedido,opciones,restaurantes:storefront_restaurants(id,nombre,slug,matriz_id,nombre_sucursal,activo,perfil_completo)')
    .eq('activa', true).order('id').limit(200).abortSignal(signal).returns<unknown>();
  return parseLandingPromotions(requireCatalogResponse(result));
});

export const landingCategories = new PublicResource(async signal => {
  const result = await supabase.from('storefront_restaurants').select('categorias')
    .eq('activo', true).limit(500).abortSignal(signal).returns<unknown>();
  const rows = requireCatalogResponse(result);
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('No pudimos leer las categorías.');
  const names = new Set<string>();
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || !('categorias' in row) || row.categorias == null) continue;
    if (!Array.isArray(row.categorias)) throw new Error('No pudimos leer las categorías.');
    for (const category of row.categorias) {
      if (typeof category !== 'string' || category.length > 100) throw new Error('Categoría inválida.');
      names.add(category);
    }
  }
  return [...names].sort();
});

export const landingBanners = new PublicResource(async signal => {
  const result = await supabase.from('app_banners').select('id,titulo,subtitulo,imagen_url,link_url').eq('activo', true)
    .order('orden').order('creado_en', { ascending: false }).limit(5).abortSignal(signal).returns<unknown>();
  const rows = requireCatalogResponse(result);
  if (!Array.isArray(rows) || rows.length > 5 || !rows.every(isLandingBanner)) throw new Error('No pudimos leer los banners.');
  return rows.filter(isLandingBanner);
});

interface LandingCoupon {
  id: string; codigo: string; tipo: string; valor: number; descripcion: string | null;
  fecha_fin: string | null; uso_maximo: number | null; usos_actuales: number;
}
export const landingCoupons = new PublicResource<LandingCoupon[]>(async signal => {
  const result = await supabase.from('cupones_plataforma')
    .select('id,codigo,tipo,valor,descripcion,fecha_fin,uso_maximo,usos_actuales')
    .eq('activo', true).not('codigo', 'is', null).order('created_at', { ascending: false }).limit(100)
    .abortSignal(signal).returns<unknown>();
  const rows = requireCatalogResponse(result);
  if (!Array.isArray(rows) || rows.length > 100) throw new Error('No pudimos leer los cupones.');
  return rows.map((row: unknown) => {
    if (typeof row !== 'object' || row === null || !('id' in row) || typeof row.id !== 'string'
      || !('codigo' in row) || typeof row.codigo !== 'string' || !('tipo' in row) || typeof row.tipo !== 'string'
      || !('valor' in row) || typeof row.valor !== 'number' || !Number.isFinite(row.valor) || row.valor < 0) throw new Error('Cupón incompleto.');
    return { id: row.id, codigo: row.codigo, tipo: row.tipo, valor: row.valor,
      descripcion: 'descripcion' in row && typeof row.descripcion === 'string' ? row.descripcion : null,
      fecha_fin: 'fecha_fin' in row && typeof row.fecha_fin === 'string' ? row.fecha_fin : null,
      uso_maximo: 'uso_maximo' in row && typeof row.uso_maximo === 'number' ? row.uso_maximo : null,
      usos_actuales: 'usos_actuales' in row && typeof row.usos_actuales === 'number' ? row.usos_actuales : 0,
    };
  });
});
