import { createClient } from '@supabase/supabase-js'
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

export type { MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../types/menu'
export type { OpcionItem, OpcionGrupo } from './menuOptions'

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
    const { default: imageCompression } = await import('browser-image-compression');
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

export async function getMyRestaurante(sessionUserId?:string): Promise<Restaurante | null> {
  // The route already has the session. This ID is a query filter only;
  // PostgreSQL RLS remains the authority on ownership for every response.
  let userId=sessionUserId;
  if(!userId){const{data:{user},error}=await supabase.auth.getUser();if(error)throw error;userId=user?.id;}
  if(!userId)return null;

  const query = supabase
    .from('restaurantes')
    .select('id, nombre, telefono, direccion, activo, slug, foto_fachada_url, logo_url, descripcion_corta, correo, hora_apertura, hora_cierre, horarios, categorias, perfil_completo, es_socio, programa_lealtad_activo, mp_access_token, acepta_pago_online, es_matriz, matriz_id, nombre_sucursal, lat, lng')
    .eq('admin_id', userId)
    .order('matriz_id', { ascending: true, nullsFirst: true })
    // Damos prioridad a las matrices en caso de que existan varias filas por error
    .order('es_matriz', { ascending: false, nullsFirst: false })
    .limit(1)
    .abortSignal(AbortSignal.timeout(12000))
    .maybeSingle();

  const { data, error } = await query;

  if (data) return data

  if(error)throw error
  return null
}
