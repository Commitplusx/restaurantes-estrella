import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(url, key)

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Restaurante {
  id: string
  nombre: string
  telefono: string
  direccion: string | null
  activo: boolean
  foto_fachada_url?: string
  hora_apertura?: string
  hora_cierre?: string
  categorias?: string[]
}

export interface MenuCategoria {
  id: string
  restaurante_id: string
  nombre: string
  emoji: string
  orden: number
  activa: boolean
}

export interface MenuItem {
  id: string
  restaurante_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  precio: number
  foto_url: string | null
  disponible: boolean
  es_popular: boolean
  orden: number
}

export interface MenuCombo {
  id: string
  restaurante_id: string
  nombre: string
  descripcion: string | null
  precio: number
  foto_url: string | null
  incluye: string[]
  disponible: boolean
}

export interface MenuPromocion {
  id: string
  restaurante_id: string
  titulo: string
  descripcion: string | null
  precio_especial: number | null
  foto_url: string | null
  fecha_fin: string | null
  activa: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sube una imagen al bucket menu-fotos y retorna la URL pública */
export async function subirFoto(file: File, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from('menu-fotos').upload(path, file, { upsert: true })
  if (error) { console.error('Error subiendo foto:', error); return null }
  const { data } = supabase.storage.from('menu-fotos').getPublicUrl(path)
  return data.publicUrl
}

/** Obtiene el restaurante vinculado al usuario autenticado */
export async function getMyRestaurante(): Promise<Restaurante | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('restaurantes')
    .select('id, nombre, telefono, direccion, activo, foto_fachada_url, hora_apertura, hora_cierre, categorias')
    .eq('admin_id', user.id)
    .maybeSingle()
  return data ?? null
}
