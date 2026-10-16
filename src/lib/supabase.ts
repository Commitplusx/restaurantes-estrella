import { createClient } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'
import { observeBackendResponse } from './backendAvailability'
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(url, key, { global: { fetch: async (input, init) => {
  const response = await fetch(input, init);
  observeBackendResponse(response.status);
  // A project restriction affects Realtime too. Do not keep opening sockets to
  // a gateway that has explicitly refused service. Successful requests restore it.
  if (response.status === 402) supabase.realtime.disconnect();
  else if (response.ok && supabase.getChannels().length > 0) supabase.realtime.connect();
  return response;
} } });

// ── Tipos ─────────────────────────────────────────────────────────────────────

import type { Restaurante } from '../types/restaurant'
export type { Restaurante, HorarioDia, HorariosRestaurante } from '../types/restaurant'

export interface MenuCategoria {
  id: string
  restaurante_id: string
  nombre: string
  emoji: string
  orden: number
  activa: boolean
}

import type { OpcionGrupo } from './menuOptions'
export type { OpcionItem, OpcionGrupo } from './menuOptions'

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
  opciones?: OpcionGrupo[]
  hora_inicio_disponible?: string | null  // formato 'HH:MM'
  hora_fin_disponible?: string | null     // formato 'HH:MM'
  agotado_hoy?: boolean
  agotado_hasta?: string | null
  aplica_subsidio?: boolean
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
  aplica_subsidio?: boolean
  opciones?: OpcionGrupo[]
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
  aplica_subsidio?: boolean
  dias_aplicacion?: string[]
  tipos_pedido?: ('tienda' | 'domicilio')[]
  opciones?: OpcionGrupo[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Helper para comprimir imágenes antes de subir usando browser-image-compression (robusto para iPhones y HEIC/EXIF) */
async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.8, // 800 KB máximo
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8
  };
  
  try {
    const compressedBlob = await imageCompression(file, options);
    // browser-image-compression devuelve un Blob o File, nos aseguramos que sea File con extensión webp
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Error al comprimir la imagen, se usará la original:", error);
    return file;
  }
}

/** Sube una imagen al bucket menu-fotos comprimiéndola primero y retorna la URL pública */
export async function subirFoto(file: File, path: string): Promise<string | null> {
  try {
    const compressedFile = await compressImage(file);
    const finalPath = path.replace(/\.[^/.]+$/, "") + ".webp"; // Aseguramos que termine en .webp

    const { error } = await supabase.storage.from('menu-fotos').upload(finalPath, compressedFile, { 
      upsert: true,
      cacheControl: '31536000' // Cache en navegador por 1 año
    })
    if (error) { console.error('Error subiendo foto:', error); return null }
    const { data } = supabase.storage.from('menu-fotos').getPublicUrl(finalPath)
    return data.publicUrl
  } catch(err) {
    console.error('Error comprimiendo/subiendo foto:', err)
    return null;
  }
}

export async function getMyRestaurante(): Promise<Restaurante | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) return null

  const query = supabase
    .from('restaurantes')
    .select('id, nombre, telefono, direccion, activo, slug, foto_fachada_url, logo_url, descripcion_corta, correo, hora_apertura, hora_cierre, horarios, categorias, perfil_completo, es_socio, programa_lealtad_activo, mp_access_token, acepta_pago_online, es_matriz, matriz_id, nombre_sucursal, lat, lng')
    .eq('admin_id', user.id)
    .order('matriz_id', { ascending: true, nullsFirst: true })
    // Damos prioridad a las matrices en caso de que existan varias filas por error
    .order('es_matriz', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await query;

  if (data) return data

  // Fallback: si hay error (ej. columnas nuevas no existen aún), query con campos base
  if (error) {
    console.warn('getMyRestaurante: fallback a campos base. Ejecuta la migración SQL.', error.message)
    const { data: fallback } = await supabase
      .from('restaurantes')
      .select('id, nombre, telefono, direccion, activo, slug, foto_fachada_url, hora_apertura, hora_cierre, horarios, categorias')
      .eq('admin_id', user.id)
      .order('es_matriz', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    return fallback ?? null
  }

  return null
}
