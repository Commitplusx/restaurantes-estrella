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
  slug?: string
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

export interface OpcionItem {
  nombre: string
  precio_extra: number
}

export interface OpcionGrupo {
  titulo: string
  requerido: boolean
  maximo_selecciones: number
  opciones: OpcionItem[]
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
  opciones?: OpcionGrupo[]
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

/** Helper para comprimir imágenes antes de subir */
async function compressImage(file: File, maxWidth: number = 800): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(compressedFile);
      }, 'image/webp', 0.8); // 80% calidad, formato WebP
    };
    img.onerror = (error) => reject(error);
  });
}

/** Sube una imagen al bucket menu-fotos comprimiéndola primero y retorna la URL pública */
export async function subirFoto(file: File, path: string): Promise<string | null> {
  try {
    const compressedFile = await compressImage(file);
    const finalPath = path.replace(/\.[^/.]+$/, "") + ".webp"; // Aseguramos que termine en .webp

    const { error } = await supabase.storage.from('menu-fotos').upload(finalPath, compressedFile, { upsert: true })
    if (error) { console.error('Error subiendo foto:', error); return null }
    const { data } = supabase.storage.from('menu-fotos').getPublicUrl(finalPath)
    return data.publicUrl
  } catch(err) {
    console.error('Error comprimiendo/subiendo foto:', err)
    return null;
  }
}

export async function getMyRestaurante(): Promise<Restaurante | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data } = await supabase
    .from('restaurantes')
    .select('id, nombre, telefono, direccion, activo, slug, foto_fachada_url, hora_apertura, hora_cierre, categorias')
    .eq('admin_id', user.id)
    .maybeSingle()
    
  if (data) return data
  
  // Si no tiene restaurante, retornar null para que el UI muestre el acceso denegado
  return null
}
