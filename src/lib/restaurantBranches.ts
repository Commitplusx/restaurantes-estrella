import type { Restaurante, HorariosRestaurante, HorarioDia } from '../types/restaurant'

export const RESTAURANT_PUBLIC_FIELDS = 'id,nombre,telefono,direccion,activo,slug,foto_fachada_url,logo_url,descripcion_corta,hora_apertura,hora_cierre,horarios,categorias,perfil_completo,acepta_pago_online,es_socio,programa_lealtad_activo,lat,lng,es_matriz,matriz_id,nombre_sucursal'
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function cartRestaurantOrigin(persisted: unknown, legacy: unknown): string | null {
  if (typeof persisted === 'string' && UUID_PATTERN.test(persisted)) return persisted
  return typeof legacy === 'string' && UUID_PATTERN.test(legacy) ? legacy : null
}

export function requiresNewBranchCart(count: number, origin: string | null, target: string): boolean {
  return count > 0 && origin !== target
}
function row(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseRestaurantBranches(value: unknown): Restaurante[] {
  if (!Array.isArray(value)) throw new Error('No pudimos leer las sucursales.')
  return value.map(entry => {
    if (!row(entry) || typeof entry.id !== 'string' || !UUID_PATTERN.test(entry.id)
      || typeof entry.nombre !== 'string' || typeof entry.telefono !== 'string'
      || typeof entry.activo !== 'boolean'
      || (entry.matriz_id != null && (typeof entry.matriz_id !== 'string' || !UUID_PATTERN.test(entry.matriz_id)))) {
      throw new Error('La información de sucursales está incompleta. Vuelve a cargarla.')
    }
    const restaurant: Restaurante = {
      id: entry.id, nombre: entry.nombre, telefono: entry.telefono, activo: entry.activo,
      direccion: typeof entry.direccion === 'string' ? entry.direccion : null,
      matriz_id: typeof entry.matriz_id === 'string' ? entry.matriz_id : null,
    }
    for (const key of ['slug','foto_fachada_url','logo_url','descripcion_corta','correo','hora_apertura','hora_cierre','nombre_sucursal'] as const) {
      if (typeof entry[key] === 'string') restaurant[key] = entry[key]
    }
    for (const key of ['perfil_completo','acepta_pago_online','es_socio','programa_lealtad_activo','es_matriz'] as const) {
      if (typeof entry[key] === 'boolean') restaurant[key] = entry[key]
    }
    for (const key of ['lat','lng'] as const) {
      if (typeof entry[key] === 'number' && Number.isFinite(entry[key])) restaurant[key] = entry[key]
    }
    if (Array.isArray(entry.categorias) && entry.categorias.every(c => typeof c === 'string')) restaurant.categorias = entry.categorias
    if (row(entry.horarios)) {
      const horarios: HorariosRestaurante = {}
      for (const day of ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const) {
        const horario = entry.horarios[day]
        if (row(horario) && typeof horario.abre === 'string' && typeof horario.cierra === 'string' && typeof horario.activo === 'boolean') {
          const valid: HorarioDia = { abre: horario.abre, cierra: horario.cierra, activo: horario.activo }
          horarios[day] = valid
        }
      }
      restaurant.horarios = horarios
    }
    return restaurant
  })
}

export function branchLabel(restaurant: Restaurante): string {
  return restaurant.nombre_sucursal?.trim() || (restaurant.matriz_id ? restaurant.direccion || restaurant.nombre : 'Sucursal principal')
}

export function restaurantMenuPath(restaurant: Restaurante): string {
  return `/menu/${encodeURIComponent(restaurant.slug || restaurant.id)}`
}

export function publicRestaurantFamily(restaurants: Restaurante[], rootId: string): Restaurante[] {
  return restaurants.filter(r => (r.id === rootId || r.matriz_id === rootId) && r.activo && r.perfil_completo === true)
    .sort((a, b) => a.id === rootId ? -1 : b.id === rootId ? 1 : branchLabel(a).localeCompare(branchLabel(b), 'es'))
}

export interface BranchDraft {
  id: string; name: string; phone: string; address: string; lat: string; lng: string; active: boolean
}

export function branchRpcArguments(parentId: string, draft: BranchDraft) {
  const name = draft.name.trim(), phone = draft.phone.replace(/\D/g, '').replace(/^52(?=\d{10}$)/, '')
  const address = draft.address.trim(), lat = Number(draft.lat), lng = Number(draft.lng)
  if (!UUID_PATTERN.test(parentId) || !UUID_PATTERN.test(draft.id)) throw new Error('Vuelve a abrir el formulario de sucursal.')
  if (name.length < 2 || name.length > 80) throw new Error('Escribe un nombre de sucursal de 2 a 80 caracteres.')
  if (!/^\d{10}$/.test(phone)) throw new Error('Escribe el teléfono de la sucursal con 10 dígitos.')
  if (address.length < 5 || address.length > 300) throw new Error('Escribe la calle, número y colonia de la sucursal.')
  if (!draft.lat.trim() || !draft.lng.trim() || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    throw new Error('Marca la ubicación de la sucursal o escribe coordenadas válidas.')
  }
  return { p_parent: parentId, p_branch: draft.id, p_name: name, p_phone: phone, p_address: address, p_lat: lat, p_lng: lng, p_active: draft.active }
}
