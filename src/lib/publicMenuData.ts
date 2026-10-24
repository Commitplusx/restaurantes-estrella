import type { Restaurante } from '../types/restaurant';
import type { MenuCategoria, MenuItem, MenuCombo, MenuPromocion, MenuConfiguration } from '../types/menu';
import type { OpcionGrupo, OpcionItem } from './menuOptions';
import { parseRestaurantBranches } from './restaurantBranches';
import { PROMOTION_DAYS, promotionDeliveries, promotionRuleIssue } from './promotionRules';

export interface PublicMenuData {
  restaurante: Restaurante;
  categorias: MenuCategoria[];
  items: MenuItem[];
  combos: MenuCombo[];
  promos: MenuPromocion[];
}
export interface MenuPauseEvent {
  id: string;
  paused: boolean;
  observed: PublicMenuData | null | undefined;
}
/** A realtime pause is provisional until a complete newer read reconciles it. */
export function publicMenuIsPaused(data: PublicMenuData | null | undefined, event: MenuPauseEvent | null): boolean {
  return data?.restaurante.activo === false ||
    (data !== undefined && data !== null && event?.id === data.restaurante.id && event.observed === data && event.paused);
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function rows(value: unknown, restaurantId: string, max = 500): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('No pudimos leer el menú completo.');
  const ids = new Set<string>();
  return value.map((row: unknown) => {
    if (!record(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id) || row.restaurante_id !== restaurantId) throw new Error('El menú contiene información de otra sucursal o datos incompletos.');
    ids.add(row.id);
    return row;
  });
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 10_000) throw new Error('El menú contiene un nombre inválido.');
  return value;
}
function money(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('No pudimos comprobar un precio del menú.');
  return value;
}
function nullableText(value: unknown): string | null { return typeof value === 'string' ? value : null; }
function options(value: unknown): MenuConfiguration & { opciones?: OpcionGrupo[] } {
  if (value == null) return {};
  // Historical records contain descriptive/rule metadata, not choice groups.
  // Keep the product visible and explicitly unavailable; never treat these
  // rules as an empty choice list that checkout could silently bypass.
  if (record(value)) return { catalog_issue: 'options_format' };
  if (!Array.isArray(value) || value.length > 30) throw new Error('Opciones del menú inválidas.');
  return { opciones: value.map((group: unknown) => {
    if (!record(group) || typeof group.requerido !== 'boolean' || !Number.isInteger(group.maximo_selecciones)
      || typeof group.maximo_selecciones !== 'number' || group.maximo_selecciones < 1
      || !Array.isArray(group.opciones) || group.opciones.length > 100) throw new Error('Opciones del menú inválidas.');
    return { titulo: text(group.titulo), requerido: group.requerido, maximo_selecciones: group.maximo_selecciones,
      ...(typeof group.id === 'string' ? { id: group.id } : {}),
      opciones: group.opciones.map((option: unknown): OpcionItem => {
        if (!record(option)) throw new Error('Opción inválida.');
        return { nombre: text(option.nombre), precio_extra: money(option.precio_extra),
          ...(typeof option.id === 'string' ? { id: option.id } : {}),
          ...(typeof option.menu_item_id === 'string' ? { menu_item_id: option.menu_item_id } : {}),
        };
      }),
    };
  }) };
}
export function menuConfigurationIssue(entry: MenuConfiguration): string | undefined {
  return entry.catalog_issue === 'options_format' ? 'Opciones en actualización' : undefined;
}
export function parsePublicMenu(restaurant: unknown, categories: unknown, items: unknown, combos: unknown, promos: unknown): PublicMenuData {
  const rest = parseRestaurantBranches([restaurant])[0];
  return {
    restaurante: rest,
    categorias: rows(categories, rest.id).map(row => {
      if (typeof row.activa !== 'boolean' || typeof row.orden !== 'number' || !Number.isFinite(row.orden)) throw new Error('Categoría inválida.');
      return { id: String(row.id), restaurante_id: rest.id, nombre: text(row.nombre), emoji: typeof row.emoji === 'string' ? row.emoji : '', orden: row.orden, activa: row.activa };
    }),
    items: rows(items, rest.id).map(row => {
      if (typeof row.disponible !== 'boolean') throw new Error('Disponibilidad del producto inválida.');
      return { id: String(row.id), restaurante_id: rest.id, categoria_id: nullableText(row.categoria_id), nombre: text(row.nombre),
        descripcion: nullableText(row.descripcion), precio: money(row.precio), foto_url: nullableText(row.foto_url), disponible: row.disponible,
        es_popular: row.es_popular === true, activo: typeof row.activo === 'boolean' ? row.activo : undefined,
        orden: typeof row.orden === 'number' ? row.orden : 0,
        ...options(row.opciones), aplica_subsidio: typeof row.aplica_subsidio === 'boolean' ? row.aplica_subsidio : undefined,
        agotado_hoy: row.agotado_hoy === true, agotado_hasta: nullableText(row.agotado_hasta),
        hora_inicio_disponible: nullableText(row.hora_inicio_disponible), hora_fin_disponible: nullableText(row.hora_fin_disponible),
      };
    }),
    combos: rows(combos, rest.id).map(row => {
      const includes = row.incluye ?? [];
      if (typeof row.disponible !== 'boolean' || !Array.isArray(includes) || !includes.every(value => typeof value === 'string')) throw new Error('Paquete inválido.');
      return { id: String(row.id), restaurante_id: rest.id, nombre: text(row.nombre), descripcion: nullableText(row.descripcion),
        precio: money(row.precio), foto_url: nullableText(row.foto_url), disponible: row.disponible, incluye: includes,
        ...options(row.opciones), aplica_subsidio: typeof row.aplica_subsidio === 'boolean' ? row.aplica_subsidio : undefined,
      };
    }),
    promos: rows(promos, rest.id, 100).map(row => {
      if (typeof row.activa !== 'boolean') throw new Error('Promoción inválida.');
      if (row.fecha_fin != null && typeof row.fecha_fin !== 'string') throw new Error('Vigencia de promoción inválida.');
      const days = row.dias_aplicacion;
      if (days != null && (!Array.isArray(days) || !days.every(day => typeof day === 'string' && PROMOTION_DAYS.includes(day)))) throw new Error('Días de promoción inválidos.');
      return { id: String(row.id), restaurante_id: rest.id, titulo: text(row.titulo), descripcion: nullableText(row.descripcion),
        precio_especial: row.precio_especial == null ? null : money(row.precio_especial), foto_url: nullableText(row.foto_url),
        fecha_fin: nullableText(row.fecha_fin), activa: row.activa, ...options(row.opciones),
        aplica_subsidio: typeof row.aplica_subsidio === 'boolean' ? row.aplica_subsidio : undefined,
        dias_aplicacion: Array.isArray(days) ? days.filter((day): day is string => typeof day === 'string') : undefined,
        tipos_pedido: promotionDeliveries(row.tipos_pedido),
      };
    }),
  };
}

/** Apply dates on reading, not when caching: crossing midnight cannot revive an offer. */
export function currentMenuPromotions(promos: MenuPromocion[], now = new Date()): MenuPromocion[] {
  return promos.filter(promo => !promotionRuleIssue(promo, 'domicilio', now) || !promotionRuleIssue(promo, 'tienda', now));
}

/** Background refresh keeps the user's valid category, combo or promotion selection. */
export function menuTabAfterRefresh(current: string, requested: string | null, data: Pick<PublicMenuData, 'categorias' | 'items' | 'combos' | 'promos'>): string {
  const categories = data.categorias.filter(category => data.items.some(item => item.categoria_id === category.id)).map(category => category.id);
  const tabs = [...(data.promos.length ? ['promos'] : []), ...categories, ...(data.combos.length ? ['combos'] : [])];
  return tabs.includes(current) ? current : requested && tabs.includes(requested) ? requested : tabs[0] || '';
}
