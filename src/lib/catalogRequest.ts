export class CatalogRequestError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, code: string | undefined) {
    super(status === 402 ? 'El servicio de pedidos está temporalmente interrumpido. Estamos trabajando para restablecerlo.'
      : 'No pudimos cargar los restaurantes. Revisa tu conexión y vuelve a intentarlo.');
    this.status = status;
    this.code = code;
  }
}
export interface CatalogError { message: string; code?: string }
export function requireCatalogResponse<T>(result: { data: T | null; error: CatalogError | null; status: number }): T {
  if (result.error || !result.data) throw new CatalogRequestError(result.status, result.error?.code);
  return result.data;
}

export interface CatalogRestaurant {
  matriz_id?: string | null; nombre_sucursal?: string; perfil_completo?: boolean;
  id: string; nombre: string; telefono: string; direccion?: string; foto_fachada_url?: string;
  hora_apertura?: string; hora_cierre?: string; categorias?: string[]; slug?: string; activo?: boolean;
  horarios?: Record<string, { abre: string; cierra: string; activo: boolean }>; lat?: number; lng?: number;
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function parseCatalogRows(value: unknown): CatalogRestaurant[] {
  if (!Array.isArray(value) || value.length > 100) throw new CatalogRequestError(0, 'invalid_catalog');
  return value.map(row => {
    if (!isRecord(row) || typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)
      || typeof row.nombre !== 'string' || !row.nombre.trim() || row.nombre.length > 300) throw new CatalogRequestError(0, 'invalid_restaurant');
    const restaurant: CatalogRestaurant = { id: row.id, nombre: row.nombre, telefono: typeof row.telefono === 'string' ? row.telefono : '' };
    for (const field of ['direccion', 'foto_fachada_url', 'hora_apertura', 'hora_cierre', 'slug','nombre_sucursal'] as const) {
      const text = row[field];
      if (typeof text === 'string' && text.length <= 2_000) restaurant[field] = text;
    }
    if (Array.isArray(row.categorias) && row.categorias.every((category: unknown) => typeof category === 'string' && category.length <= 100)) restaurant.categorias = row.categorias.map((category: unknown) => String(category));
    if (typeof row.activo === 'boolean') restaurant.activo = row.activo;
    if (typeof row.perfil_completo === 'boolean') restaurant.perfil_completo = row.perfil_completo;
    if (typeof row.matriz_id === 'string' && /^[0-9a-f-]{36}$/i.test(row.matriz_id)) restaurant.matriz_id = row.matriz_id;
    if (isRecord(row.horarios)) {
      restaurant.horarios = {};
      for (const [day, hours] of Object.entries(row.horarios)) {
        if (['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(day)
          && isRecord(hours) && typeof hours.abre === 'string' && typeof hours.cierra === 'string' && typeof hours.activo === 'boolean') restaurant.horarios[day] = { abre: hours.abre, cierra: hours.cierra, activo: hours.activo };
      }
    }
    for (const [field, limit] of [['lat', 90], ['lng', 180]] as const) {
      const raw = row[field];
      const number = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : NaN;
      if (Number.isFinite(number) && Math.abs(number) <= limit) restaurant[field] = number;
    }
    return restaurant;
  });
}

/** Keep the first (already filtered/sorted) available location for each brand. */
export function oneRestaurantPerBrand(rows: CatalogRestaurant[]): CatalogRestaurant[] {
  const brands = new Set<string>();
  return rows.filter(row => {
    const brand = row.matriz_id || row.id;
    if (brands.has(brand)) return false;
    brands.add(brand);
    return true;
  });
}
