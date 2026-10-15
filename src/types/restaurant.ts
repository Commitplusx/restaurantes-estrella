export interface HorarioDia {
  abre: string
  cierra: string
  activo: boolean
}

export interface HorariosRestaurante {
  lunes?: HorarioDia
  martes?: HorarioDia
  miercoles?: HorarioDia
  jueves?: HorarioDia
  viernes?: HorarioDia
  sabado?: HorarioDia
  domingo?: HorarioDia
}

export interface Restaurante {
  stripe_account_id?: string
  mp_access_token?: string
  mp_refresh_token?: string
  mp_user_id?: string
  id: string
  nombre: string
  telefono: string
  direccion: string | null
  activo: boolean
  slug?: string
  maps_url?: string | null
  foto_fachada_url?: string
  logo_url?: string
  descripcion_corta?: string
  correo?: string
  hora_apertura?: string
  hora_cierre?: string
  horarios?: HorariosRestaurante
  categorias?: string[]
  perfil_completo?: boolean
  acepta_pago_online?: boolean
  es_socio?: boolean
  programa_lealtad_activo?: boolean
  lat?: number | null
  lng?: number | null
  envio_gratis_monto_minimo?: number
  envio_gratis_tope?: number
  es_matriz?: boolean
  matriz_id?: string | null
  nombre_sucursal?: string | null
}

