export type PromotionDelivery = 'tienda' | 'domicilio';
export const PROMOTION_DELIVERIES: PromotionDelivery[] = ['tienda', 'domicilio'];
export const PROMOTION_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

/** Missing fields belong to older cached menus; explicit malformed rules never mean “all”. */
export function promotionDeliveries(value: unknown): PromotionDelivery[] {
  if (value === undefined) return [...PROMOTION_DELIVERIES];
  if (!Array.isArray(value) || !value.length || value.length > 2
    || value.some(mode => mode !== 'tienda' && mode !== 'domicilio') || new Set(value).size !== value.length) {
    throw new Error('Selecciona al menos una modalidad válida para la promoción.');
  }
  return PROMOTION_DELIVERIES.filter(mode => value.includes(mode));
}

export function promotionDeliveryLabel(value: unknown): string {
  try {
    const modes = promotionDeliveries(value);
    return modes.length === 2 ? 'Recoger y a domicilio' : modes[0] === 'tienda' ? 'Solo recoger en sucursal' : 'Solo a domicilio';
  } catch { return 'Disponibilidad por confirmar'; }
}

export interface PromotionRules {
  id: string;
  titulo: string;
  restaurante_id: string;
  activa: boolean;
  tipos_pedido?: unknown;
  dias_aplicacion?: unknown;
  fecha_fin?: unknown;
}
export interface PromotionIssue { id: string; title: string; message: string }

export function promotionRuleIssue(promo: PromotionRules, mode: PromotionDelivery, now = new Date()): string | null {
  if (!promo.activa) return 'Esta promoción está pausada.';
  let modes: PromotionDelivery[];
  try { modes = promotionDeliveries(promo.tipos_pedido); }
  catch { return 'No pudimos comprobar las reglas de esta promoción.'; }
  if (!modes.includes(mode)) return promotionDeliveryLabel(modes) + '.';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (promo.fecha_fin !== undefined && promo.fecha_fin !== null && promo.fecha_fin !== '') {
    if (typeof promo.fecha_fin !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(promo.fecha_fin)) return 'La vigencia de esta promoción necesita revisión.';
    if (promo.fecha_fin < date) return 'Esta promoción terminó. Elige otra opción del menú.';
  }
  const days = promo.dias_aplicacion;
  if (days !== undefined && days !== null) {
    if (!Array.isArray(days) || days.some(day => typeof day !== 'string' || !PROMOTION_DAYS.includes(day))) return 'Los días de esta promoción necesitan revisión.';
    // Empty days retain the existing catalogue contract: every day.
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short' }).format(now);
    const day = { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' }[weekday];
    if (days.length && (!day || !days.includes(day))) return 'Esta promoción no aplica hoy.';
  }
  return null;
}

export function validatePromotionRows(value: unknown, restaurantId: string): PromotionRules[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('No pudimos comprobar las promociones.');
  const ids = new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Promoción inválida.');
    const row = entry as Record<string, unknown>;
    if (typeof row.id !== 'string' || ids.has(row.id) || row.restaurante_id !== restaurantId || typeof row.titulo !== 'string' || typeof row.activa !== 'boolean') throw new Error('No pudimos comprobar las promociones de esta sucursal.');
    ids.add(row.id);
    return { id: row.id, titulo: row.titulo, restaurante_id: restaurantId, activa: row.activa, tipos_pedido: row.tipos_pedido, dias_aplicacion: row.dias_aplicacion, fecha_fin: row.fecha_fin };
  });
}

export function promotionCartIssues(ids: string[], rows: PromotionRules[], mode: PromotionDelivery, now = new Date()): PromotionIssue[] {
  return [...new Set(ids)].flatMap(id => {
    const promo = rows.find(row => row.id === id);
    const message = promo ? promotionRuleIssue(promo, mode, now) : 'Esta promoción ya no está disponible.';
    return message ? [{ id, title: promo?.titulo || 'Promoción', message }] : [];
  });
}
