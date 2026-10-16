import { parseCatalogRows, type CatalogRestaurant } from './catalogRequest';
import { promotionRuleIssue, type PromotionDelivery, type PromotionRules } from './promotionRules';

export interface LandingPromotion extends PromotionRules {
  descripcion: string | null;
  precio_especial: number;
  foto_url: string | null;
  restaurantes: CatalogRestaurant;
  optionSignature: string;
  aplica_subsidio: boolean;
}
export interface LandingOffer extends LandingPromotion { branchCount: number }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
const textKey = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX');

// Copies reference their own catalogue IDs; names, charges and selection rules carry the offer's meaning.
function optionContent(value: unknown, depth = 0): unknown {
  if (value == null) return null;
  if (depth > 8) throw new Error('Las opciones de una oferta necesitan revisión.');
  if (typeof value === 'string') return textKey(value);
  if (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length <= 100) return value.map((entry: unknown) => optionContent(entry, depth + 1));
  if (record(value)) return Object.fromEntries(Object.keys(value).filter(key => !['id','menu_item_id','restaurante_id','categoria_id'].includes(key)).sort().map(key => [key, optionContent(value[key], depth + 1)]));
  throw new Error('Las opciones de una oferta necesitan revisión.');
}

export function parseLandingPromotions(value: unknown): LandingPromotion[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('No pudimos leer las ofertas.');
  return value.map((entry: unknown) => {
    if (!record(entry) || typeof entry.id !== 'string' || typeof entry.restaurante_id !== 'string'
      || typeof entry.titulo !== 'string' || !entry.titulo.trim() || entry.titulo.length > 300
      || typeof entry.precio_especial !== 'number' || !Number.isFinite(entry.precio_especial) || entry.precio_especial < 0
      || typeof entry.activa !== 'boolean' || !record(entry.restaurantes)) throw new Error('Hay una oferta con información incompleta.');
    const restaurant = parseCatalogRows([entry.restaurantes])[0];
    if (restaurant.id !== entry.restaurante_id) throw new Error('No pudimos identificar la sucursal de una oferta.');
    return { id: entry.id, restaurante_id: entry.restaurante_id, titulo: entry.titulo.trim(),
      descripcion: typeof entry.descripcion === 'string' ? entry.descripcion : null,
      precio_especial: entry.precio_especial, foto_url: typeof entry.foto_url === 'string' ? entry.foto_url : null,
      activa: entry.activa, tipos_pedido: entry.tipos_pedido, dias_aplicacion: entry.dias_aplicacion, fecha_fin: entry.fecha_fin,
      aplica_subsidio: entry.aplica_subsidio === true, restaurantes: restaurant,
      optionSignature: JSON.stringify(optionContent(entry.opciones ?? [])),
    };
  });
}

/** Eligibility is checked per branch first; equivalent offers are grouped for the selected mode only. */
export function groupLandingPromotions(rows: readonly LandingPromotion[], mode: PromotionDelivery, now = new Date()): LandingOffer[] {
  const groups = new Map<string, { row: LandingPromotion; branches: Set<string> }>();
  for (const row of rows) {
    if (row.restaurantes.activo !== true || row.restaurantes.perfil_completo !== true || promotionRuleIssue(row, mode, now)) continue;
    const brand = row.restaurantes.matriz_id || row.restaurantes.id;
    const days = Array.isArray(row.dias_aplicacion) && row.dias_aplicacion.length ? [...new Set(row.dias_aplicacion)].sort() : ['all'];
    const key = JSON.stringify([brand, textKey(row.titulo), textKey(row.descripcion || ''), row.precio_especial,
      mode, days, row.fecha_fin || null, row.aplica_subsidio, row.optionSignature]);
    const group = groups.get(key);
    if (!group) groups.set(key, { row, branches: new Set([row.restaurante_id]) });
    else {
      group.branches.add(row.restaurante_id);
      const root = row.restaurante_id === brand, currentRoot = group.row.restaurante_id === brand;
      if (root && !currentRoot || root === currentRoot && row.restaurante_id.localeCompare(group.row.restaurante_id) < 0) group.row = row;
    }
  }
  return [...groups.values()].map(({ row, branches }) => ({ ...row, branchCount: branches.size }));
}
