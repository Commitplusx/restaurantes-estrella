export interface MenuCategoria {
  id: string
  restaurante_id: string
  nombre: string
  emoji: string
  orden: number
  activa: boolean
}

import type { OpcionGrupo } from '../lib/menuOptions'


/** Unsupported historical option metadata stays visible, but cannot enter checkout. */
export interface MenuConfiguration {
  catalog_issue?: 'options_format'
}

export interface MenuItem extends MenuConfiguration {
  id: string
  restaurante_id: string
  categoria_id: string | null
  nombre: string
  descripcion: string | null
  precio: number
  foto_url: string | null
  disponible: boolean
  activo?: boolean
  es_popular: boolean
  orden: number
  opciones?: OpcionGrupo[]
  hora_inicio_disponible?: string | null  // formato 'HH:MM'
  hora_fin_disponible?: string | null     // formato 'HH:MM'
  agotado_hoy?: boolean
  agotado_hasta?: string | null
  aplica_subsidio?: boolean
}

export interface MenuCombo extends MenuConfiguration {
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

export interface MenuPromocion extends MenuConfiguration {
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
