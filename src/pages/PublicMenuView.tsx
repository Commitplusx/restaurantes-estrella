import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
// import * as h3 from 'h3-js' (movido al hook)
import type { Restaurante, MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../lib/supabase'
import { useDeliveryCalculation } from '../hooks/useDeliveryCalculation'
import {
  Store,
  Plus,
  Minus,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Star,
  Clock,
  MapPin,
  ChevronLeft,
  X,
  Ticket,
  CheckCircle2,
  Truck,
  LocateFixed,
  Tag,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

const PREMIUM_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{"color": "#f5f5f5"}] },
  { "elementType": "labels.icon", "stylers": [{"visibility": "off"}] },
  { "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}] },
  { "elementType": "labels.text.stroke", "stylers": [{"color": "#f5f5f5"}] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{"color": "#bdbdbd"}] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#ffffff"}] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{"color": "#757575"}] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#dadada"}] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#616161"}] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{"color": "#e5e5e5"}] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{"color": "#eeeeee"}] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#c9c9c9"}] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#9e9e9e"}] }
];

const EMOJI_MAP: Record<string, string> = {
  'Hamburguesas': '🍔',
  'Pizza': '🍕',
  'Tacos': '🌮',
  'Sushi': '🍣',
  'Café': '☕',
  'Postres': '🍰',
  'Saludable': '🥗',
  'Pollo': '🍗',
  'Antojitos': '🌶️',
  'Bebidas': '🥤',
  'Mariscos': '🦐',
  'Carnes': '🥩',
  'Snacks': '🍟',
  'Desayunos': '🍳',
  'Comida China': '🥡',
  'Alitas': '🔥',
  'Comida Corrida': '🍲'
};

function getEmojiForCategory(name: string): string {
  if (!name) return '🍽️';
  const n = name.toLowerCase();
  if (n.includes('hamburguesa') || n.includes('burger')) return '🍔';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('taco') || n.includes('antojito') || n.includes('quesadilla') || n.includes('mexican')) return '🌮';
  if (n.includes('sushi') || n.includes('maki')) return '🍣';
  if (n.includes('café') || n.includes('cafe')) return '☕';
  if (n.includes('postre') || n.includes('dulce') || n.includes('pastel') || n.includes('crepa') || n.includes('helado')) return '🍰';
  if (n.includes('saludable') || n.includes('ensalada') || n.includes('fit') || n.includes('bowl')) return '🥗';
  if (n.includes('pollo') || n.includes('chicken') || n.includes('alita') || n.includes('wing') || n.includes('boneless')) return '🍗';
  if (n.includes('carne') || n.includes('asada') || n.includes('grill') || n.includes('steak') || n.includes('corte') || n.includes('arrachera') || n.includes('torta')) return '🥩';
  if (n.includes('marisco') || n.includes('camaron') || n.includes('pescado') || n.includes('ceviche') || n.includes('aguachile')) return '🦐';
  if (n.includes('bebida') || n.includes('refresco') || n.includes('agua') || n.includes('soda') || n.includes('jugo') || n.includes('frappe')) return '🥤';
  if (n.includes('snack') || n.includes('papas') || n.includes('complemento') || n.includes('extra') || n.includes('entrada') || n.includes('guarnicion')) return '🍟';
  if (n.includes('desayuno') || n.includes('huevo') || n.includes('omelet') || n.includes('chilaquiles')) return '🍳';
  if (n.includes('china') || n.includes('oriental') || n.includes('arroz') || n.includes('wok')) return '🥡';
  if (n.includes('sopa') || n.includes('caldo') || n.includes('consome')) return '🥣';
  if (n.includes('pasta') || n.includes('spaghetti') || n.includes('italian')) return '🍝';
  if (n.includes('pan') || n.includes('baguette') || n.includes('sandwich') || n.includes('chapata')) return '🥪';
  
  return EMOJI_MAP[name] || '🍽️';
}

export type OpcionSeleccionada = {
  grupo: string;
  opcion: string;
  precio_extra: number;
}

export type CartItem = {
  id: string;
  nombre: string;
  precio: number;
  tipo: 'item' | 'combo' | 'promo';
  opcionesSeleccionadas?: OpcionSeleccionada[];
  cartItemId: string;
  aplica_subsidio?: boolean;
}

// CACHE GLOBAL PARA CARGA INSTANTÁNEA
const menuCache: Record<string, {
  restaurante: Restaurante;
  categorias: MenuCategoria[];
  items: MenuItem[];
  combos: MenuCombo[];
  promos: MenuPromocion[];
  timestamp: number;
}> = {}

// COMPONENTE DE IMAGEN CON SKELETON LOADER
const LazyImage = ({ src, alt, className, imgClassName, blurBackground }: { src?: string | null, alt?: string, className?: string, imgClassName?: string, blurBackground?: boolean }) => {
  const [loaded, setLoaded] = useState(false);
  if (!src) return <div className={`bg-slate-100 flex items-center justify-center ${className || ''}`}><Store size={24} className="text-slate-300"/></div>;
  return (
    <div className={`relative overflow-hidden ${blurBackground ? 'bg-slate-900' : 'bg-slate-100'} ${className || ''}`}>
      {!loaded && <div className="absolute inset-0 bg-slate-200 animate-pulse z-10" />}
      {blurBackground && src && (
        <img src={src} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125" alt="" />
      )}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`relative z-20 w-full h-full transition-opacity duration-500 ${!imgClassName?.includes('object-') ? 'object-cover' : ''} ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName || ''}`}
      />
    </div>
  )
}

export const estaAbierto = (res: Restaurante) => {
  // BUG 9 fix: convert times to minutes (integers) to avoid locale-dependent string comparison
  const toMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const nowMinutes = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const isOpenRange = (abre: string, cierra: string): boolean => {
    const now = nowMinutes()
    const a = toMinutes(abre)
    const c = toMinutes(cierra)
    if (a <= c) return now >= a && now <= c   // same-day range
    return now >= a || now <= c               // crosses midnight
  }

  if (res.horarios) {
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const diaString = dias[new Date().getDay()]
    const horarioHoy = res.horarios[diaString as keyof typeof res.horarios]
    if (horarioHoy && horarioHoy.activo) {
      return isOpenRange(horarioHoy.abre, horarioHoy.cierra)
    }
    return false
  }

  if (!res.hora_apertura || !res.hora_cierre) return false
  return isOpenRange(res.hora_apertura, res.hora_cierre)
}

export function PublicMenuView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [restaurantePausado, setRestaurantePausado] = useState(false)

  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [promos, setPromos] = useState<MenuPromocion[]>([])

  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<string>('')
  const categoryChipsRef = useRef<HTMLDivElement>(null)
  const [chipsAtEnd, setChipsAtEnd] = useState(false)

  // Auto-scroll el chip activo al centro cuando cambia la categoría
  useEffect(() => {
    if (!categoryChipsRef.current) return
    const activeChip = categoryChipsRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeTab])

  // Detectar si el scroll de chips llegó al final (para ocultar la flechita)
  const handleChipsScroll = () => {
    const el = categoryChipsRef.current
    if (!el) return
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
    setChipsAtEnd(atEnd)
  }

  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null)

  // Wizard de opciones — paso actual
  const [optionsStep, setOptionsStep] = useState(0)

  // Estado del carrito y drawer
  const [carrito, setCarrito] = useState<{ item: CartItem & { foto_url?: string }, cantidad: number }[]>(() => {
    const saved = sessionStorage.getItem('est_carrito')
    return saved ? JSON.parse(saved) : []
  })
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [clienteNombre, setClienteNombre] = useState(() => sessionStorage.getItem('est_nombre') || '')
  const [clienteTel, setClienteTel] = useState(() => sessionStorage.getItem('est_tel') || '')
  const [isScrolled, setIsScrolled] = useState(false)
  const [showClosedToast, setShowClosedToast] = useState(false)

  // ACTUALIZAR BARRA DE ESTADO Y SCROLL
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    metaThemeColor.setAttribute('content', isScrolled ? '#ffffff' : '#0f172a')
  }, [isScrolled])
  
  const [cuponCliente, setCuponCliente] = useState('')
  const [telError, setTelError] = useState(false)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [ubicacionGPS, setUbicacionGPS] = useState<{lat: number, lng: number} | null>(() => {
    const saved = sessionStorage.getItem('est_ubicacion')
    return saved ? JSON.parse(saved) : null
  })
  const [buscandoGPS, setBuscandoGPS] = useState(false)
  
  // Nuevos estados para el rediseño del mapa tipo Rappi
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [realLocation, setRealLocation] = useState<{lat: number, lng: number} | null>(null) // Punto azul GPS
  const [draftUbicacion, setDraftUbicacion] = useState<{lat: number, lng: number} | null>(null) // Centro del mapa al moverlo
  const [draftDireccion, setDraftDireccion] = useState('') // Dirección temporal al mover el mapa
  // Nota: useLoadScript no soporta cambiar la API key dinámicamente o iniciar vacía,
  // por lo que debemos cargar el script directamente. Al ser asíncrono, el impacto en TBT es nulo.
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });
  const submittingRef = useRef(false) // BUG 5 fix: prevents double-submit
  const [direccionReferencias, setDireccionReferencias] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'en_linea'>('efectivo') // Forzado a efectivo por ahora
  const [toastMsg, setToastMsg] = useState<{ title: string, message?: string, type?: 'success' | 'error' | 'loading' } | null>(null)

  // Estado para validación de cupones
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [cuponValido, setCuponValido] = useState(false)
  const [descuento, setDescuento] = useState(0)

  // Estados del nuevo carrito paso a paso
  const [checkoutStep, setCheckoutStep] = useState(() => {
    const saved = sessionStorage.getItem('est_checkoutstep')
    return saved ? parseInt(saved) : 1
  })
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'tienda' | null>(() => (sessionStorage.getItem('est_tipoentrega') as 'domicilio' | 'tienda' | null) || null)
  const [direccionEntrega, setDireccionEntrega] = useState(() => sessionStorage.getItem('est_direccion') || '')

  // Estados de cálculo H3 abstraídos
  const { costoEnvioBase, fueraDeCobertura, calculandoEnvio } = useDeliveryCalculation(ubicacionGPS, tipoEntrega);
  useEffect(() => {
    sessionStorage.setItem('est_carrito', JSON.stringify(carrito))
  }, [carrito])
  useEffect(() => { sessionStorage.setItem('est_nombre', clienteNombre) }, [clienteNombre])
  useEffect(() => { sessionStorage.setItem('est_tel', clienteTel) }, [clienteTel])
  useEffect(() => { sessionStorage.setItem('est_metodopago', metodoPago) }, [metodoPago])
  useEffect(() => { sessionStorage.setItem('est_checkoutstep', checkoutStep.toString()) }, [checkoutStep])
  useEffect(() => { if (tipoEntrega) sessionStorage.setItem('est_tipoentrega', tipoEntrega) }, [tipoEntrega])
  useEffect(() => { sessionStorage.setItem('est_direccion', direccionEntrega) }, [direccionEntrega])
  useEffect(() => { if (ubicacionGPS) sessionStorage.setItem('est_ubicacion', JSON.stringify(ubicacionGPS)) }, [ubicacionGPS])

  // Estado del modal de opciones de producto
  type OptionableItem = (MenuItem | MenuCombo) & { __tipo: 'item' | 'combo' }
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<OptionableItem | null>(null)
  // Resetear el paso del wizard cuando cambia el item seleccionado
  useEffect(() => { setOptionsStep(0) }, [selectedItemForOptions])

  const [selectedOptionsState, setSelectedOptionsState] = useState<Record<string, Record<string, boolean>>>({})

  const showToast = (title: string, message?: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToastMsg({ title, message, type })
    if (type !== 'loading') {
      setTimeout(() => setToastMsg(null), 4000)
    }
  }

  const validarCuponBtn = async () => {
    if (!cuponCliente.trim()) return
    setValidandoCupon(true)

    try {
      const { data, error } = await supabase.rpc('validar_cupon_publico', { p_codigo: cuponCliente })

      if (!error && data?.ok) {
        showToast('Cupón Aplicado', `¡Se descontarán $${data.monto.toFixed(2)} de tu orden!`, 'success')
        setCuponValido(true)
        setDescuento(data.monto)
        return
      }

      // Si no encontró cupón global, buscar en cupones propios del restaurante
      if (restaurante?.id) {
        const { data: cuponPropio } = await supabase
          .from('cupones_restaurante')
          .select('*')
          .eq('restaurante_id', restaurante.id)
          .eq('codigo', cuponCliente.toUpperCase())
          .eq('activo', true)
          .maybeSingle()

        if (cuponPropio) {
          // Validar expiración
          if (cuponPropio.fecha_fin && new Date(cuponPropio.fecha_fin) < new Date()) {
            showToast('Cupón expirado', 'Este cupón ya no está disponible', 'error')
            return
          }
          // Validar usos
          if (cuponPropio.uso_maximo && cuponPropio.usos_actuales >= cuponPropio.uso_maximo) {
            showToast('Cupón agotado', 'Este cupón ya alcanzó su límite de usos', 'error')
            return
          }
          // Calcular descuento
          const subtotalActual = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
          const descuentoCalculado = cuponPropio.tipo === 'porcentaje'
            ? subtotalActual * (cuponPropio.valor / 100)
            : cuponPropio.valor
          const descuentoFinal = Math.min(descuentoCalculado, subtotalActual)
          setCuponValido(true)
          setDescuento(descuentoFinal)
          showToast('¡Cupón Aplicado!', `Descuento de $${descuentoFinal.toFixed(2)} aplicado`, 'success')
          // El incremento de usos_actuales se hará en el backend o al confirmar la orden, NO aquí en la validación visual.
          return
        }
      }

      // Ningún cupón encontrado
      showToast('Cupón Inválido', data?.error || 'El cupón no es válido o ya expiró', 'error')
      setCuponValido(false)
      setDescuento(0)
    } catch (err) {
      showToast('Error', 'Hubo un error de conexión', 'error')
    } finally {
      setValidandoCupon(false)
    }
  }

  // Verificamos si la ruta o id cambian para hacer reload silencioso si es necesario

  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true

    async function fetchMenuData(silently = false) {
      if (!id) return

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

      let rest: any = null
      let cats: any[] | null = null
      let prods: any[] | null = null
      let cmbs: any[] | null = null
      let prms: any[] | null = null

      if (isUUID) {
        // ⚡ UUID: lanzar TODO en paralelo — 1 solo roundtrip
        const [restRes, catsRes, prodsRes, cmbsRes, prmsRes] = await Promise.all([
          supabase.from('restaurantes').select('*').eq('id', id).maybeSingle(),
          supabase.from('menu_categorias').select('*').eq('restaurante_id', id).order('orden'),
          supabase.from('menu_items').select('*').eq('restaurante_id', id).eq('disponible', true).order('orden'),
          supabase.from('menu_combos').select('*').eq('restaurante_id', id).eq('disponible', true),
          supabase.from('menu_promociones').select('*').eq('restaurante_id', id).eq('activa', true)
        ])
        rest = restRes.data
        cats = catsRes.data
        prods = prodsRes.data
        cmbs = cmbsRes.data
        prms = prmsRes.data
      } else {
        // Slug: primero resolver el ID real, luego el menú en paralelo
        const { data: restData } = await supabase.from('restaurantes').select('*').eq('slug', id).maybeSingle()
        rest = restData
        if (rest) {
          const [catsRes, prodsRes, cmbsRes, prmsRes] = await Promise.all([
            supabase.from('menu_categorias').select('*').eq('restaurante_id', rest.id).order('orden'),
            supabase.from('menu_items').select('*').eq('restaurante_id', rest.id).eq('disponible', true).order('orden'),
            supabase.from('menu_combos').select('*').eq('restaurante_id', rest.id).eq('disponible', true),
            supabase.from('menu_promociones').select('*').eq('restaurante_id', rest.id).eq('activa', true)
          ])
          cats = catsRes.data
          prods = prodsRes.data
          cmbs = cmbsRes.data
          prms = prmsRes.data
        }
      }

      if (!rest) {
        if (isMounted && !silently) {
          navigate('/?error=notfound', { replace: true })
        }
        return null
      }

      const actualId = rest.id;

      const currentDay = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date().getDay()];
      const validPromos = (prms || []).filter(p => {
        if (p.fecha_fin) {
          const endDateStr = p.fecha_fin.includes('T') ? p.fecha_fin : `${p.fecha_fin}T23:59:59`;
          if (new Date(endDateStr) < new Date()) return false;
        }
        if (p.dias_aplicacion && p.dias_aplicacion.length > 0 && !p.dias_aplicacion.includes(currentDay)) {
          return false;
        }
        return true;
      })

      // Guardar en caché
      menuCache[id] = {
        restaurante: rest,
        categorias: cats || [],
        items: prods || [],
        combos: cmbs || [],
        promos: validPromos,
        timestamp: Date.now()
      }

      if (isMounted) {
        setRestaurante(rest)
        setCategorias(cats || [])
        setItems(prods || [])
        setCombos(cmbs || [])
        setPromos(validPromos)
        
        // Sincronizar el carrito si hay items que se actualizaron en tiempo real
        setCarrito(prevCart => {
          if (!prevCart || prevCart.length === 0) return prevCart;
          let hasChanges = false;
          const newCart = prevCart.map(cObj => {
            let latestItem;
            if (cObj.item.tipo === 'item') latestItem = (prods || []).find((p: any) => p.id === cObj.item.id);
            else if (cObj.item.tipo === 'combo') latestItem = (cmbs || []).find((c: any) => c.id === cObj.item.id);
            else if (cObj.item.tipo === 'promo') latestItem = validPromos.find(p => p.id === cObj.item.id);

            // Si el item ya no está disponible o se eliminó, lo quitamos del carrito
            if (!latestItem) {
              hasChanges = true;
              return null;
            }

            // Actualizamos la bandera del subsidio si cambió en tiempo real
            if (cObj.item.aplica_subsidio !== latestItem.aplica_subsidio) {
              hasChanges = true;
              return { ...cObj, item: { ...cObj.item, aplica_subsidio: latestItem.aplica_subsidio } };
            }
            return cObj;
          }).filter(Boolean) as typeof prevCart;
          
          return hasChanges ? newCart : prevCart;
        });
        
        if (!silently) {
          setLoading(false)
          const hasCombos = (cmbs || []).length > 0
          const hasValidPromos = validPromos.length > 0
          
          const urlTab = new URLSearchParams(location.search).get('tab')
        if (urlTab && urlTab !== 'menu') {
          setActiveTab(urlTab)
        } else {
          const validCategories = (cats || []).filter(c => (prods || []).some(i => i.categoria_id === c.id))
          if (hasValidPromos) setActiveTab('promos')
          else if (validCategories.length > 0) setActiveTab(validCategories[0].id)
          else if (hasCombos) setActiveTab('combos')
        }
      }
    }
      
    return actualId
    }

    async function load() {
      let actualRestId = id;

      // 1. Revisar caché local para carga instantánea en 0ms
      if (id && menuCache[id]) {
        const cached = menuCache[id]
        setRestaurante(cached.restaurante)
        setCategorias(cached.categorias)
        setItems(cached.items)
        setCombos(cached.combos)
        setPromos(cached.promos)
        setLoading(false)
        actualRestId = cached.restaurante.id;
        
        // Inicializar la pestaña activa desde caché
        const urlTab = new URLSearchParams(location.search).get('tab')
        if (urlTab && urlTab !== 'menu') {
          setActiveTab(urlTab)
        } else {
          const validCategories = cached.categorias.filter((c: any) => cached.items.some((i: any) => i.categoria_id === c.id))
          if (cached.promos.length > 0) setActiveTab('promos')
          else if (validCategories.length > 0) setActiveTab(validCategories[0].id)
          else if (cached.combos.length > 0) setActiveTab('combos')
        }
        
        // Ejecutar fetch silencioso en background para actualizar caché si pasaron más de 1 min
        if (Date.now() - cached.timestamp > 60000) {
          fetchMenuData(true)
        }
      } else {
        const fetchedId = await fetchMenuData()
        if (fetchedId) actualRestId = fetchedId
      }

      // Creamos el canal de realtime
      const realtimeChannel = supabase.channel(`public:menu_updates:${actualRestId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurante_id=eq.${actualRestId}` }, () => {
          fetchMenuData(true) // Silencioso
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_combos', filter: `restaurante_id=eq.${actualRestId}` }, () => {
          fetchMenuData(true)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_promociones', filter: `restaurante_id=eq.${actualRestId}` }, () => {
          fetchMenuData(true)
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurantes', filter: `id=eq.${actualRestId}` }, (payload) => {
          const nuevo = payload.new as Restaurante
          if (nuevo.activo === false) {
            // Restaurante se desactivó en tiempo real → mostrar overlay amigable
            setRestaurantePausado(true)
          } else if (nuevo.activo === true) {
            // Volvió a abrir → quitar overlay y refrescar menú
            setRestaurantePausado(false)
            fetchMenuData(true)
          } else {
            fetchMenuData(true)
          }
        })
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'cupones_restaurante', filter: `restaurante_id=eq.${actualRestId}` },
          () => {
            // Cuando el dueño desactiva/activa/elimina un cupón, el cliente lo ve de inmediato
            fetchMenuData(true)
          }
        )
        .subscribe()

      // Limpiar canal al desmontar
      return () => {
        supabase.removeChannel(realtimeChannel)
      }
    }

    const cleanupRealtime = load()

    return () => {
      isMounted = false
      cleanupRealtime.then(cleanup => {
        if (typeof cleanup === 'function') cleanup()
      })
    }
  }, [id])

  // --- Lógica de Subsidio Dinámico ($8 por artículo) ---
  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0);
  
  // Filtrar los items que sí aplican para el subsidio (por defecto true)
  const itemsSubsidio = carrito.filter(p => {
    // Asegurarnos de que no sea explícitamente false ni el string 'false'
    return p.item.aplica_subsidio !== false && String(p.item.aplica_subsidio).toLowerCase() !== 'false';
  });
  const cantidadSubsidio = itemsSubsidio.reduce((sum, p) => sum + p.cantidad, 0);
  
  // Por cada artículo calificable, el restaurante recauda $8 pesos extra que se usan para subsidiar el envío
  const bolsaSubsidio = cantidadSubsidio * 8;
  
  // El costo de envío se reduce usando la bolsa de subsidio (nunca baja de 0)
  const costoEnvio = costoEnvioBase > 0 ? Math.max(0, costoEnvioBase - bolsaSubsidio) : 0;

  const addToCart = (product: CartItem & { foto_url?: string }) => {
    if (restaurante && !estaAbierto(restaurante)) {
      setShowClosedToast(true)
      setTimeout(() => setShowClosedToast(false), 3500)
      return
    }

    setCarrito(prev => {
      const exist = prev.find(p => p.item.cartItemId === product.cartItemId)
      if (exist) {
        return prev.map(p => p.item.cartItemId === product.cartItemId ? { ...p, cantidad: p.cantidad + 1 } : p)
      }
      return [...prev, { item: product, cantidad: 1 }]
    })
  }

  const removeFromCart = (cartItemId: string) => {
    setCarrito(prev => {
      const exist = prev.find(p => p.item.cartItemId === cartItemId)
      if (exist && exist.cantidad === 1) {
        return prev.filter(p => p.item.cartItemId !== cartItemId)
      }
      return prev
        .map(p => p.item.cartItemId === cartItemId ? { ...p, cantidad: p.cantidad - 1 } : p)
        .filter(p => p.cantidad > 0)
    })
  }

  useEffect(() => {
    const urlTab = new URLSearchParams(location.search).get('tab')
    if (urlTab && urlTab !== 'menu') {
      setActiveTab(urlTab)
    } else {
      const validCategories = categorias.filter(c => items.some(i => i.categoria_id === c.id))
      if (promos.length > 0) setActiveTab('promos')
      else if (validCategories.length > 0) setActiveTab(validCategories[0].id)
      else if (combos.length > 0) setActiveTab('combos')
    }
  }, [location.search])

  // Fix Map interaction to be like Rappi/Uber (fixed center pin)
  const handleMapDragEnd = () => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();
        setDraftUbicacion({ lat, lng });
        
        // Reverse geocoding silencioso para obtener la colonia al mover
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results.length > 0 && results[0]) {
            setDraftDireccion(results[0].formatted_address);
          } else {
            setDraftDireccion(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        });
      }
    }
  }

  const handleConfirmarUbicacion = () => {
    if (draftUbicacion) {
      setUbicacionGPS(draftUbicacion);
      setDireccionEntrega(draftDireccion);
      setIsMapModalOpen(false);
    }
  }

  // ── Fallback: geolocalización sin permiso GPS ──────────────────────────────
  // IMPORTANTE: todo en HTTPS (el sitio corre en HTTPS, mixed content bloqueado)
  const obtenerUbicacionPorIP = async () => {
    const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    // Intento 1: Google Geolocation API — usa WiFi + torres celulares, muy precisa
    // Funciona sin permiso de GPS. Ya tenemos la key habilitada.
    if (googleKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/geolocation/v1/geolocate?key=${googleKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(6000) }
        )
        const data = await res.json()
        if (data.location?.lat && data.location?.lng) {
          // Reverse geocode para obtener la dirección
          let ciudad = 'Tu ubicación aproximada'
          try {
            const geoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.location.lat},${data.location.lng}&key=${googleKey}&language=es`,
              { signal: AbortSignal.timeout(5000) }
            )
            const geoData = await geoRes.json()
            if (geoData.results?.[0]?.formatted_address) {
              ciudad = geoData.results[0].formatted_address
            }
          } catch (_) { /* usar ciudad genérica */ }
          return { lat: data.location.lat, lng: data.location.lng, ciudad }
        }
      } catch (_) { /* continuar con el siguiente */ }
    }

    // Intento 2: freeipapi.com — HTTPS, gratis, sin API key (respaldo si Google falla)
    try {
      const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      if (data.latitude && data.longitude) {
        return { lat: data.latitude, lng: data.longitude, ciudad: `${data.cityName}, ${data.regionName}` }
      }
    } catch (_) { /* ignorar */ }

    return null
  }

  const obtenerUbicacionGPS = () => {
    const TIMEOUT_GPS_MS = 8000 // 8 segundos máximo para el GPS

    if (!('geolocation' in navigator)) {
      showToast('GPS no disponible', 'Escribe tu dirección manualmente en el campo de abajo 👇', 'error')
      return
    }

    setBuscandoGPS(true)
    let yaResuelto = false

    // Timer de timeout — si el GPS tarda demasiado, intentamos IP
    const timeoutId = setTimeout(async () => {
      if (yaResuelto) return
      yaResuelto = true
      console.warn('[GPS] Timeout — intentando geolocalización por IP')
      const ipLoc = await obtenerUbicacionPorIP()
      if (ipLoc) {
        setRealLocation({ lat: ipLoc.lat, lng: ipLoc.lng })
        setDraftUbicacion({ lat: ipLoc.lat, lng: ipLoc.lng })
        setDraftDireccion(ipLoc.ciudad)
        
        // Si el modal está abierto, el dragEnd hará el resto. Si no, pero se llamó por primera vez:
        if (!isMapModalOpen) {
           setUbicacionGPS({ lat: ipLoc.lat, lng: ipLoc.lng })
           setDireccionEntrega(ipLoc.ciudad)
        }
        
        if (mapInstance) {
          mapInstance.panTo({ lat: ipLoc.lat, lng: ipLoc.lng })
          mapInstance.setZoom(16)
        }
        showToast('Ubicación aproximada', `Detectamos que estás en ${ipLoc.ciudad}. Ajusta el pin si es necesario.`, 'success')
      } else {
        showToast(
          'No pudimos detectar tu ubicación',
          'Escribe tu dirección manualmente o arrastra el pin en el mapa 📍',
          'error'
        )
      }
      setBuscandoGPS(false)
    }, TIMEOUT_GPS_MS)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (yaResuelto) return
        yaResuelto = true
        clearTimeout(timeoutId)

        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setRealLocation({ lat, lng })
        setDraftUbicacion({ lat, lng })
        
        if (mapInstance) {
          mapInstance.panTo({ lat, lng })
          mapInstance.setZoom(17)
        }

        if (window.google) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setBuscandoGPS(false)
            if (status === 'OK' && results && results[0]) {
              setDraftDireccion(results[0].formatted_address)
              if (!isMapModalOpen) {
                setUbicacionGPS({ lat, lng })
                setDireccionEntrega(results[0].formatted_address)
              }
              showToast('Ubicación encontrada', 'Confirma que el punto en el mapa sea correcto', 'success')
            } else {
              setDraftDireccion(`Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
            }
          })
        } else {
          setBuscandoGPS(false)
          setDraftDireccion(`Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
      },
      async (err) => {
        if (yaResuelto) return
        yaResuelto = true
        clearTimeout(timeoutId)
        console.warn('[GPS] Error:', err.code, err.message)

        // Intentar IP como segundo fallback
        const ipLoc = await obtenerUbicacionPorIP()
        if (ipLoc) {
          setRealLocation({ lat: ipLoc.lat, lng: ipLoc.lng })
          setDraftUbicacion({ lat: ipLoc.lat, lng: ipLoc.lng })
          setDraftDireccion(ipLoc.ciudad)
          
          if (!isMapModalOpen) {
            setUbicacionGPS({ lat: ipLoc.lat, lng: ipLoc.lng })
            setDireccionEntrega(ipLoc.ciudad)
          }

          if (mapInstance) {
            mapInstance.panTo({ lat: ipLoc.lat, lng: ipLoc.lng })
            mapInstance.setZoom(16)
          }
          const tituloToast = err.code === 1 ? 'Tu navegador bloqueó el GPS' : 'Ubicación aproximada por red';
          const msjToast = err.code === 1 
            ? `Por favor dale permisos o ajusta el pin manualmente. Te ubicamos en ${ipLoc.ciudad} por ahora.`
            : `No pudimos usar tu GPS. Te ubicamos en ${ipLoc.ciudad}. Ajusta el pin si es necesario.`

          showToast(tituloToast, msjToast, err.code === 1 ? 'error' : 'success')
        } else {
          // Último fallback: pedir que escriban la dirección
          const mensajeError =
            err.code === 1 // PERMISSION_DENIED
              ? 'Bloqueaste el GPS. Escribe tu dirección en el campo de abajo 👇'
              : err.code === 2 // POSITION_UNAVAILABLE
              ? 'GPS no disponible. Escribe tu dirección manualmente 👇'
              : 'GPS tardó demasiado. Escribe tu dirección manualmente 👇'
          showToast('No pudimos obtener tu ubicación', mensajeError, 'error')
        }
        setBuscandoGPS(false)
      },
      {
        enableHighAccuracy: true,
        timeout: TIMEOUT_GPS_MS - 500, // Dejar 500ms de margen para el timeout manual
        maximumAge: 60000 // Aceptar ubicación cacheada de hasta 1 min
      }
    )
  }


  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  // BUG 4 fix: reset coupon if cart subtotal drops to 0 or below discount amount
  const descuentoAplicable = subtotal > 0 ? Math.min(descuento, subtotal) : 0
  const total = Math.max(0, subtotal - descuentoAplicable) + (tipoEntrega === 'domicilio' && !fueraDeCobertura ? costoEnvio : 0)

  // Limpiar todos los campos del checkout y volver al paso 1
  const resetCheckout = () => {
    setCheckoutStep(1)
    setTipoEntrega(null)
    setCuponCliente('')
    setCuponValido(false)
    setDescuento(0)
    setDireccionReferencias('')
    sessionStorage.removeItem('est_tipoentrega')
    sessionStorage.removeItem('est_checkoutstep')
  }

  const closeCart = () => {
    setIsCartOpen(false)
    setTimeout(() => resetCheckout(), 300)
  }

  const handlePedir = async () => {
    if (!restaurante || carrito.length === 0) return
    if (submittingRef.current) return // BUG 5 fix: prevent double-submit
    
    if (!clienteNombre.trim()) {
      showToast('Falta el nombre', 'Por favor ingresa tu nombre para continuar', 'error')
      return
    }
    
    // Validación estricta final de envío a domicilio
    if (tipoEntrega === 'domicilio') {
      if (!direccionEntrega.trim() || !ubicacionGPS) {
        showToast('Ubicación requerida', 'Por favor confirma tu ubicación en el mapa', 'error')
        setCheckoutStep(3)
        return
      }
      if (fueraDeCobertura) {
        showToast('Fuera de cobertura', 'Lo sentimos, tu ubicación está fuera del área de servicio.', 'error')
        setCheckoutStep(3)
        return
      }
    }

    // Bug #1: proper phone validation
    const telLimpio = clienteTel.replace(/\D/g, '')
    if (telLimpio.length < 10) {
      setTelError(true)
      return
    }
    setTelError(false)
    submittingRef.current = true

    setProcesando(true)
    // BUG 5 fix: generate ticketId immediately and use ref to prevent double-submit
    const ticketId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const pedidoDetalles = carrito.map(p => {
      const tag = p.item.tipo === 'combo' ? '[COMBO] ' : p.item.tipo === 'promo' ? '[PROMO] ' : ''
      let optionsStr = ''
      if (p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0) {
        optionsStr = '\n  └ ' + p.item.opcionesSeleccionadas.map(o => `+ ${o.opcion}`).join(', ')
      }
      return `${p.cantidad}x ${tag}${p.item.nombre} ($${(p.item.precio * p.cantidad).toFixed(2)})${optionsStr}`
    }).join('\n')

    const detallesEntregaStr = tipoEntrega === 'domicilio' 
      ? `\n\n🛵 *Tipo de entrega:* A domicilio` + 
        `\n📍 *Dirección:* ${direccionEntrega}` + 
        (direccionReferencias.trim() ? `\n📝 *Referencias:* ${direccionReferencias}` : '') +
        (costoEnvio > 0 ? `\n🚚 *Costo Envío:* $${costoEnvio}` : '')
      : `\n\n🏪 *Tipo de entrega:* Recoger en tienda`
      
    const pedidoCompleto = pedidoDetalles + detallesEntregaStr

    const pinSeguridad = total > 500 ? Math.floor(1000 + Math.random() * 9000).toString() : null

    try {
      const { error: insertError } = await supabase.from('pedidos').insert([{
        cliente_tel: telLimpio,
        cliente_nombre: clienteNombre.trim(),
        restaurante: restaurante.nombre,
        restaurante_id: restaurante.id,
        descripcion: pedidoCompleto,
        direccion: tipoEntrega === 'domicilio' ? direccionEntrega : null,
        referencias_entrega: tipoEntrega === 'domicilio' && direccionReferencias.trim() ? direccionReferencias.trim() : null,
        lat: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lat : null,
        lng: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lng : null,
        estado: metodoPago === 'en_linea' ? 'pendiente_pago' : 'pendiente',
        wb_message_id: ticketId,
        metodo_pago: metodoPago,
        total: total,
        tipo_pedido: tipoEntrega === 'domicilio' ? 'domicilio' : 'tienda',
        pin_seguridad: pinSeguridad
      }]).select('id').single()

      if (insertError) throw insertError

      // La notificación al restaurante la maneja el DB Webhook de Supabase (tabla pedidos → notificar-whatsapp)
      // tanto para efectivo como para pagos en línea (este último vía webhook de MercadoPago).


    } catch (err: any) {    
      alert('Hubo un problema registrando el pedido en la base de datos: ' + (err.message || 'Error desconocido') + '. Por favor intenta nuevamente.');
      submittingRef.current = false // BUG 5 fix
      setProcesando(false);
      return;
    }

    if (metodoPago === 'en_linea') {
      try {
        const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/mercadopago-checkout'
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({
            pedidoId: ticketId, // Pasamos el ticketId para enlazar con la tabla pedidos
            items: carrito,
            costo_envio: tipoEntrega === 'domicilio' && !fueraDeCobertura ? costoEnvio : 0,
            descuento: descuento,
            total: total,
            originUrl: window.location.origin
          })
        })
        
        const data = await res.json()
        console.log("MP_DEBUG - Respuesta raw del servidor:", data)
        console.log("MP_DEBUG - Código de estado HTTP:", res.status)

        if (!res.ok) {
          console.error("MP_DEBUG - Error detectado por HTTP status. Status:", res.status, "Body:", data)
          throw new Error(data.error || 'Error al generar link de Mercado Pago')
        }
        
        if (data.url) {
          console.log("MP_DEBUG - URL de pago generada correctamente:", data.url)
          window.location.href = data.url
          return
        } else {
          console.error("MP_DEBUG - No vino la URL en el payload exitoso:", data)
          throw new Error('Mercado Pago no devolvió un link de pago válido. Intenta nuevamente.')
        }
      } catch (err: any) {
        console.error("MP_DEBUG - Excepción atrapada en el catch:", err)
        showToast('Error', err.message || 'No se pudo generar el pago en línea', 'error')
        submittingRef.current = false // BUG 5 fix
        setProcesando(false)
        return
      }
    } else {
      // Flujo 100% Web para pagos en Efectivo — limpiar todo
      setIsCartOpen(false)
      setCarrito([])
      setClienteNombre('')
      setClienteTel('')
      setCuponCliente('')
      setCuponValido(false)
      setDescuento(0)
      setDireccionReferencias('')
      setTipoEntrega(null)
      setUbicacionGPS(null)
      setDireccionEntrega('')
      sessionStorage.clear()
      window.location.href = `/success?pedido=${ticketId}&success=true`
    }
  }

  if (restaurantePausado) return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 p-10 max-w-sm w-full">
        <div className="w-20 h-20 rounded-[24px] bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">⏸️</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Restaurante pausado</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-1">
          <strong className="text-slate-700">{restaurante?.nombre}</strong> tomó un descanso y no está recibiendo pedidos en este momento.
        </p>
        <p className="text-slate-400 text-sm mb-7">
          Por favor regresa un poco más tarde. Cuando retomen actividad verás el menú automáticamente.
        </p>
        <div className="flex gap-2 items-center justify-center text-xs text-amber-500 font-bold bg-amber-50 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Esperando que reabran...
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] animate-pulse">
      {/* Header Skeleton */}
      <div className="h-48 md:h-64 bg-slate-200 w-full mb-8 rounded-b-[40px]"></div>
      
      <div className="max-w-5xl mx-auto px-4">
        {/* Info & Tabs Skeleton */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-slate-300 rounded-full -mt-20 mb-4 border-4 border-[#FAFAFA]"></div>
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded-lg w-32 mb-6"></div>
          
          <div className="flex gap-4 w-full max-w-sm">
            <div className="h-12 bg-slate-200 rounded-[20px] flex-1"></div>
            <div className="h-12 bg-slate-200 rounded-[20px] flex-1"></div>
          </div>
        </div>

        {/* Categories Skeleton */}
        <div className="flex gap-3 mb-8 overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="h-10 bg-slate-200 rounded-full w-24 shrink-0"></div>)}
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-slate-100 p-4 rounded-[32px] flex gap-4 h-32">
              <div className="w-24 h-24 rounded-[24px] bg-slate-200 shrink-0"></div>
              <div className="flex-1 space-y-3 py-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-6 bg-slate-200 rounded-full w-20 mt-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (!restaurante) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-4 text-center">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Restaurante no disponible</h2>
      <p className="text-slate-500 mb-6">El menú que buscas no existe o fue desactivado.</p>
      <Link to="/" className="bg-[#FF7A6A] text-white px-8 py-3 rounded-[24px] font-bold shadow-lg shadow-orange-200">Volver al Inicio</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#FA4A0C]/20 font-sans pb-32">

      {/* TOPBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 py-3 px-4 md:px-10 flex items-center gap-3 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm' : 'bg-transparent'}`}>
        <Link
          to="/"
          className={`p-2.5 rounded-full transition-all shrink-0 ${isScrolled ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-black/20 backdrop-blur-md text-white hover:bg-black/30'}`}
        >
          <ChevronLeft size={20} />
        </Link>
        <div className={`flex-1 min-w-0 transition-all duration-500 ease-out flex items-center gap-3 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {restaurante.foto_fachada_url && (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 shadow-sm">
              <img src={restaurante.foto_fachada_url} loading="lazy" alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-[16px] md:text-[18px] font-brother font-bold uppercase tracking-widest text-slate-900 truncate mt-0.5">{restaurante.nombre}</h1>
        </div>
      </header>

      {/* HERO FULL BLEED (RAPPI STYLE) */}
      <div className="relative w-full h-[20vh] md:h-[15vh] bg-slate-50 overflow-hidden border-b border-slate-100">
        {restaurante.foto_fachada_url && (
          <>
            {/* Mobile: Fondo borroso */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-[50px] scale-150 opacity-60 saturate-150 md:hidden"
              style={{ backgroundImage: `url(${restaurante.foto_fachada_url})` }}
            />
            {/* PC: Gradiente muy limpio y premium en tonos claros */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-slate-50 to-orange-100/30 hidden md:block" />
            
            {/* Sombra de transición en móvil */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-slate-50/80 md:hidden" />
          </>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 relative z-10">

        {/* INFO CARD (RAPPI STYLE) */}
        <div className="bg-white rounded-t-3xl sm:rounded-none -mt-6 sm:mt-0 pt-0 pb-6 flex flex-col items-center sm:items-start text-center sm:text-left border-b border-slate-100">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-[18px] md:rounded-[20px] overflow-hidden shadow-sm border-4 border-white bg-white shrink-0 flex items-center justify-center -mt-10 md:-mt-12 mb-3 z-20">
            <LazyImage src={restaurante.foto_fachada_url} alt="Logo" className="w-full h-full object-cover" />
          </div>
          
          <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start">
              <h1 className="text-2xl sm:text-3xl font-brother font-bold uppercase tracking-widest text-slate-900 mb-1 mt-1 text-balance leading-none break-words px-2 sm:px-0">
                {restaurante.nombre}
              </h1>
              
              <p className="text-slate-500 text-sm mb-4 flex items-center justify-center sm:justify-start gap-1 px-2 sm:px-0">
                <Star size={14} className="text-amber-400 fill-amber-400" /> 
                <span className="font-medium text-slate-700">4.8</span>
                <span className="text-slate-300 mx-1">•</span>
                {restaurante.categorias?.slice(0, 2).join(' • ') || 'Restaurante'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm mt-1">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock size={16} className="text-slate-400" /> 
              <span>{restaurante.hora_apertura?.slice(0, 5)} - {restaurante.hora_cierre?.slice(0, 5)}</span>
            </div>
            
            <a 
              href={restaurante.maps_url || (restaurante.direccion?.startsWith('http') ? restaurante.direccion : (restaurante.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurante.direccion.replace('GPS: ', ''))}` : '#'))} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`flex items-center gap-1.5 transition-colors ${restaurante.maps_url || restaurante.direccion?.includes('GPS:') || restaurante.direccion?.startsWith('http') ? 'text-blue-600 hover:text-blue-700' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <MapPin size={16} className={restaurante.maps_url || restaurante.direccion?.includes('GPS:') || restaurante.direccion?.startsWith('http') ? 'text-blue-500' : 'text-slate-400'} /> 
              <span className={`line-clamp-1 max-w-[200px] font-medium ${restaurante.maps_url || restaurante.direccion?.includes('GPS:') || restaurante.direccion?.startsWith('http') ? 'underline decoration-blue-200 underline-offset-2' : ''}`}>
                {restaurante.direccion?.includes('GPS:') || restaurante.direccion?.startsWith('http') ? 'Ver ubicación en el mapa' : (restaurante.direccion || 'Comitán')}
              </span>
            </a>
          </div>
        </div>

        {!estaAbierto(restaurante) && (
          <div className="bg-slate-50 text-slate-600 font-medium text-sm p-4 rounded-xl mt-6 flex items-center justify-center sm:justify-start gap-2 border border-slate-200">
            <AlertCircle size={18} className="text-slate-400" />
            Cerrado. Solo puedes hacer pedidos en el horario del restaurante.
          </div>
        )}

        {/* CHIPS DE CATEGORÍA — premium pill chips estilo Rappi/UberEats */}
        {(categorias.filter(c => items.some(i => i.categoria_id === c.id)).length > 0 || combos.length > 0 || promos.length > 0) && (
          <div className="sticky top-[52px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
            <div className="relative">
              {/* Gradiente izquierdo */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/95 to-transparent z-10" />

              {/* Gradiente derecho + flechita animada */}
              <div
                className={`pointer-events-none absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pr-1 transition-all duration-300 ${
                  chipsAtEnd ? 'opacity-0 w-8' : 'opacity-100 w-14'
                }`}
                style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.97) 55%, transparent)' }}
              >
                {!chipsAtEnd && (
                  <div className="animate-bounce">
                    <ChevronDown size={16} className="text-slate-400 rotate-[-90deg]" />
                  </div>
                )}
              </div>

              <div
                ref={categoryChipsRef}
                onScroll={handleChipsScroll}
                className="flex overflow-x-auto gap-2 px-4 py-3"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {promos.length > 0 && (
                  <button
                    data-tab="promos"
                    onClick={() => setActiveTab('promos')}
                    style={{ minHeight: '44px' }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 rounded-full text-[13.5px] font-bold
                      transition-all duration-150 whitespace-nowrap
                      active:scale-95 select-none
                      ${activeTab === 'promos'
                        ? 'bg-[#FA4A0C] text-white shadow-lg shadow-orange-500/25'
                        : 'bg-orange-50 text-orange-500 active:bg-orange-100'
                      }`}
                  >
                    <span className="text-base leading-none">🔥</span> Promociones
                  </button>
                )}
                {categorias.filter(c => items.some(i => i.categoria_id === c.id)).map(cat => (
                  <button
                    key={`chip-${cat.id}`}
                    data-tab={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    style={{ minHeight: '44px' }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 rounded-full text-[13.5px] font-bold
                      transition-all duration-150 whitespace-nowrap
                      active:scale-95 select-none
                      ${activeTab === cat.id
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                      }`}
                  >
                    <span className="text-base leading-none">
                      {(!cat.emoji || cat.emoji.trim() === '🍽️' || cat.emoji.trim() === '🍽') ? getEmojiForCategory(cat.nombre) : cat.emoji}
                    </span>
                    {cat.nombre}
                  </button>
                ))}
                {combos.length > 0 && (
                  <button
                    data-tab="combos"
                    onClick={() => setActiveTab('combos')}
                    style={{ minHeight: '44px' }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 rounded-full text-[13.5px] font-bold
                      transition-all duration-150 whitespace-nowrap
                      active:scale-95 select-none
                      ${activeTab === 'combos'
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                      }`}
                  >
                    <span className="text-base leading-none">🏷️</span> Combos
                  </button>
                )}

                {/* Spacer para que el último chip no quede pegado al borde */}
                <div className="shrink-0 w-8" />
              </div>
            </div>
          </div>
        )}


            {/* PRODUCT CATEGORIES CONTENT */}
            <div className="mt-8 relative">
                <AnimatePresence mode="popLayout">
                  {categorias.filter(cat => cat.id === activeTab).map(cat => {
                    const catItems = items.filter(i => i.categoria_id === cat.id)
                    if (catItems.length === 0) return null
                    return (
                      <motion.div
                        layout
                        id={`cat-${cat.id}`}
                        key={cat.id}
                        className="mb-10 scroll-mt-[140px]"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catItems.map((item) => {
                          const cartItem = { id: item.id, nombre: item.nombre, precio: item.precio, tipo: 'item' as const, foto_url: item.foto_url || undefined, aplica_subsidio: item.aplica_subsidio }
                          // Filtrar por horario si tiene horario configurado
                          const horaActual = new Date().toTimeString().slice(0,5) // 'HH:MM'
                          const fueraDeHorario = !!(
                            item.hora_inicio_disponible && item.hora_fin_disponible &&
                            (horaActual < item.hora_inicio_disponible || horaActual > item.hora_fin_disponible)
                          )
                          return (
                            <div
                              key={item.id}
                              className={`bg-white p-4 rounded-[16px] border border-slate-100 flex gap-4 items-stretch cursor-pointer hover:border-slate-200 transition-colors ${fueraDeHorario ? 'opacity-50' : ''}`}
                              onClick={() => {
                                if (item.opciones && item.opciones.length > 0) {
                                  setSelectedItemForOptions({ ...item, __tipo: 'item' });
                                  setSelectedOptionsState({});
                                } else {
                                  setSelectedItemDetail({ ...item, cartItemTipo: 'item' });
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0 flex flex-col">
                                <h4 className="font-medium text-slate-900 text-base leading-tight mb-1">{item.nombre}</h4>
                                <p className="text-slate-500 text-sm mb-3 line-clamp-2 leading-snug">{item.descripcion}</p>
                                <div className="mt-auto flex items-center justify-between">
                                  <span className="text-slate-900 font-bold text-[15px]">${item.precio.toFixed(2)}</span>
                                  
                                  {item.agotado_hoy ? (
                                    <span className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">Agotado</span>
                                  ) : fueraDeHorario ? (
                                    <span className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">{item.hora_inicio_disponible}</span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="w-[100px] h-[100px] rounded-[12px] overflow-hidden bg-slate-50 shrink-0 relative">
                                <LazyImage src={item.foto_url} alt={item.nombre} className="w-full h-full" />
                                {(!item.agotado_hoy && !fueraDeHorario) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (item.opciones && item.opciones.length > 0) {
                                        setSelectedItemForOptions({ ...item, __tipo: 'item' })
                                        setSelectedOptionsState({})
                                      } else {
                                        addToCart({ ...cartItem, cartItemId: item.id })
                                      }
                                    }}
                                    className="absolute bottom-2 right-2 w-8 h-8 bg-white text-[#FA4A0C] rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform z-30"
                                  >
                                    <Plus size={16} strokeWidth={3} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

            {/* Empty state for categories */}
            {items.length === 0 && !loading && activeTab !== 'combos' && activeTab !== 'promos' && (
              <div className="text-center py-16 text-slate-400">
                <Store size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">Este restaurante aún no tiene platillos publicados</p>
              </div>
            )}

            {/* COMBOS TAB */}
            {activeTab === 'combos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map(combo => {
                  return (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm cursor-pointer hover:border-orange-200 transition-colors flex gap-4 items-stretch relative overflow-hidden group" onClick={() => {
                        setSelectedItemDetail({ ...combo, cartItemTipo: 'combo' });
                      }}>
                          <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-[12px] z-10 shadow-sm">
                            Combo
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col pt-1">
                            <div className="cursor-pointer" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemDetail({ ...combo, cartItemTipo: 'combo' });
                            }}>
                              <h4 className="font-medium text-slate-900 text-base leading-tight mb-1">{combo.nombre}</h4>
                              <p className="text-slate-500 text-sm mb-2 line-clamp-2 leading-snug">{combo.descripcion}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {combo.incluye?.slice(0, 2).map((inc, i) => <span key={i} className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md truncate max-w-full">✓ {inc}</span>)}
                              {combo.incluye && combo.incluye.length > 2 && <span className="text-[11px] font-bold text-slate-500 self-center">+{combo.incluye.length - 2} más</span>}
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-slate-900 font-bold text-[15px]">${combo.precio.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[12px] overflow-hidden shrink-0 bg-blue-50 flex items-center justify-center">
                            {combo.foto_url ? (
                              <LazyImage blurBackground={true} src={combo.foto_url} alt={combo.nombre} className="w-full h-full" imgClassName="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                            ) : (
                              <Tag size={32} className="text-blue-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (combo.opciones && combo.opciones.length > 0) {
                                  setSelectedItemForOptions({ ...combo, __tipo: 'combo' });
                                  setSelectedOptionsState({});
                                } else {
                                  addToCart({ id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo', foto_url: combo.foto_url || undefined, cartItemId: combo.id, aplica_subsidio: combo.aplica_subsidio });
                                }
                              }}
                              className="absolute bottom-2 right-2 w-8 h-8 bg-white text-[#FA4A0C] rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform z-30"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* PROMOS TAB */}
            {activeTab === 'promos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promos.map((promo, index) => {
                  return (
                    <motion.div
                      key={promo.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                    >
                      <div
                        className="bg-white p-4 rounded-[16px] border border-slate-100 shadow-sm cursor-pointer hover:border-orange-200 transition-colors flex gap-4 items-stretch relative overflow-hidden group"
                        onClick={() => {
                          setSelectedItemDetail({ ...promo, cartItemTipo: 'promo' });
                        }}
                      >
                          <div className="absolute top-0 right-0 bg-[#FA4A0C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-bl-[12px] z-10 shadow-sm">
                            Promo
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col pt-1">
                            <h4 className="font-medium text-slate-900 text-base leading-tight mb-1">{promo.titulo}</h4>
                            {promo.descripcion && (
                              <p className="text-slate-500 text-sm mb-3 line-clamp-2 leading-snug">{promo.descripcion}</p>
                            )}
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-[#FA4A0C] font-bold text-[15px]">${promo.precio_especial?.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[12px] overflow-hidden shrink-0 bg-orange-50 flex items-center justify-center">
                            {promo.foto_url ? (
                              <LazyImage blurBackground={true} src={promo.foto_url} alt={promo.titulo} className="w-full h-full" imgClassName="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                            ) : (
                              <Ticket size={32} className="text-orange-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItemDetail({ ...promo, cartItemTipo: 'promo' });
                              }}
                              className="absolute bottom-2 right-2 w-8 h-8 bg-white text-[#FA4A0C] rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform z-30"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
          {/* Fin Contenedor Central */}

          {/* ── Item Detail Sheet ─────────────────────────────── */}
          <AnimatePresence>
            {selectedItemDetail && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setSelectedItemDetail(null)}
                  className="fixed inset-0 bg-slate-900/40 z-[60] backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
                >
                  <motion.div
                    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-t-[32px] md:rounded-[32px] w-full max-w-lg mx-auto overflow-hidden shadow-2xl p-6 relative"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                  >
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div>
                      {selectedItemDetail.cartItemTipo === 'promo' && (
                        <div className="bg-[#FA4A0C]/10 text-[#FA4A0C] font-black text-[11px] px-2.5 py-1 rounded-md inline-block mb-2 uppercase tracking-wider">
                          Promo Especial
                        </div>
                      )}
                      <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                        {selectedItemDetail.nombre || selectedItemDetail.titulo}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedItemDetail(null)}
                      className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-colors shrink-0 mt-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto pr-2">
                    <p className="text-[15px] text-slate-500 leading-relaxed">
                      {selectedItemDetail.descripcion || 'Sin descripción adicional.'}
                    </p>

                    {(selectedItemDetail.cartItemTipo === 'combo' || selectedItemDetail.__tipo === 'combo') && selectedItemDetail.incluye && (
                      <div className="mt-4 flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incluye</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedItemDetail.incluye.map((inc: string, i: number) => (
                            <span key={i} className="text-[13px] font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">✓ {inc}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-8">
                      <p className="text-3xl font-black text-[#FA4A0C]">
                        ${(selectedItemDetail.precio || selectedItemDetail.precio_especial || 0).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const cartItem = {
                          id: selectedItemDetail.id,
                          nombre: selectedItemDetail.nombre || selectedItemDetail.titulo,
                          precio: selectedItemDetail.precio || selectedItemDetail.precio_especial || 0,
                          tipo: selectedItemDetail.cartItemTipo,
                          foto_url: selectedItemDetail.foto_url || undefined,
                          cartItemId: selectedItemDetail.id,
                          aplica_subsidio: selectedItemDetail.aplica_subsidio
                        }
                        
                        if (selectedItemDetail.opciones && selectedItemDetail.opciones.length > 0) {
                          setSelectedItemForOptions({ ...selectedItemDetail, __tipo: selectedItemDetail.cartItemTipo })
                          setSelectedOptionsState({})
                        } else {
                          addToCart(cartItem)
                        }
                        
                        setSelectedItemDetail(null)
                      }}
                      className="mt-6 w-full h-14 rounded-[20px] bg-slate-900 text-white font-extrabold text-[17px] shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      {selectedItemDetail.opciones && selectedItemDetail.opciones.length > 0 ? 'Elegir opciones' : 'Añadir al carrito'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* FOOTER PÚBLICO */}
      <footer className="bg-white border-t border-slate-100 py-16 px-10 relative z-10 mt-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
              <span className="text-lg font-black text-slate-800 tracking-tighter">
                Estrella<span className="text-orange-500">Eats</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">La mejor selección gastronómica de Comitán.</p>
            <div className="mt-6 flex justify-center md:justify-start">
              <img src="/estrella-circle.png" alt="Sello Estrella" className="w-24 h-24 object-contain" />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 text-center md:text-left">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Ayuda</p>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Soporte 24/7</a>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Seguridad</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Legal</p>
              <Link to="/terminos" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Términos y Condiciones</Link>
              <Link to="/privacidad" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Aviso de Privacidad</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Cart Button en Mobile */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none sm:bottom-10 sm:right-10 sm:left-auto sm:justify-end"
          >
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="bg-[#FA4A0C] text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-[#FA4A0C]/30 flex items-center gap-3 text-sm overflow-hidden pointer-events-auto"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag size={18} />
              Ver Carrito • 
              <motion.span 
                key={cartCount}
                initial={{ y: -20, opacity: 0, scale: 2, color: '#fcd34d' }}
                animate={{ y: 0, opacity: 1, scale: 1, color: '#ffffff' }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="inline-block"
              >
                {cartCount}
              </motion.span> items
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

{/* Drawer de Carrito y modal de opciones */}
  <AnimatePresence>
    {isCartOpen && (
      <motion.div key="cart-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={closeCart} />
    )}
  </AnimatePresence>
  <AnimatePresence>
    {isCartOpen && (
      <motion.div 
        key="cart-drawer"
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }} 
        transition={{ type: 'spring', damping: 30, stiffness: 300 }} 
        style={{ willChange: "transform" }}
        className="fixed inset-0 w-full h-[100dvh] sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:h-[100vh] sm:w-[440px] sm:max-w-md bg-white z-[110] shadow-[0_-5px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl flex flex-col overflow-hidden"
      >
          
          <div className="p-5 md:p-6 pb-4 border-b border-slate-100 flex flex-col shrink-0 bg-white z-10 shadow-sm relative">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {checkoutStep > 1 && (
                  <button onClick={() => setCheckoutStep(prev => prev - 1)} className="p-2 -ml-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 hover:text-[#FA4A0C] transition-colors">
                    <ChevronLeft size={22} strokeWidth={2.5} />
                  </button>
                )}
                <div className="flex flex-col">
                  <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">
                    {checkoutStep === 1 ? 'Tu Pedido' : checkoutStep === 2 ? 'Tus Datos' : checkoutStep === 3 ? 'Entrega' : 'Método de Pago'}
                  </h2>
                  <p className="text-orange-500 font-bold text-[12px] uppercase tracking-wider">{restaurante.nombre}</p>
                </div>
              </div>
              <button onClick={closeCart} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            {carrito.length > 0 && (
              <div className="flex items-center justify-between mt-5">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${checkoutStep >= 1 ? 'bg-[#FA4A0C]' : 'bg-slate-200'}`} />
                <div className="w-2" />
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${checkoutStep >= 2 ? 'bg-[#FA4A0C]' : 'bg-slate-200'}`} />
                <div className="w-2" />
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${checkoutStep >= 3 ? 'bg-[#FA4A0C]' : 'bg-slate-200'}`} />
                <div className="w-2" />
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${checkoutStep >= 4 ? 'bg-[#FA4A0C]' : 'bg-slate-200'}`} />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 hide-scrollbar relative overflow-x-hidden">
            {carrito.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <ShoppingBag size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Tu carrito está vacío</p>
                <button onClick={closeCart} className="mt-6 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-full font-bold text-sm">Ver menú</button>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {/* PASO 1: RESUMEN */}
                {checkoutStep === 1 && (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="flex flex-col h-full">
                    <div className="space-y-0 divide-y divide-slate-100">
                      {carrito.map((p, i) => (
                        <div key={i} className="flex gap-3 py-3.5 bg-white group">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] overflow-hidden bg-slate-50 shrink-0 border border-slate-100 relative">
                            {p.item.foto_url ? (
                              <LazyImage src={p.item.foto_url} alt={p.item.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300"><Store size={20} /></div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <h4 className="font-bold text-slate-800 text-[13px] sm:text-[14px] leading-tight pr-2 truncate">{p.item.nombre}</h4>
                              <span className="font-black text-slate-900 text-[13px] sm:text-[14px]">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                            </div>
                            {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2.5">
                                {p.item.opcionesSeleccionadas.map((o, idx) => (
                                  <span key={idx} className="bg-slate-100/80 border border-slate-200 text-slate-500 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium leading-tight">
                                    {o.opcion}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-0.5 w-max mt-auto">
                              <button onClick={() => removeFromCart(p.item.cartItemId)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:text-red-500 transition-colors"><Minus size={12} /></button>
                              <span className="font-bold text-[12px] w-5 text-center text-slate-800">{p.cantidad}</span>
                              <button onClick={() => addToCart(p.item)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:text-green-600 transition-colors"><Plus size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 bg-slate-50 rounded-[24px] p-5 border border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-3 text-[13px] flex items-center gap-2 uppercase tracking-widest"><Ticket size={16} className="text-[#FA4A0C]"/> ¿Tienes un cupón?</h4>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Código de descuento" value={cuponCliente} onChange={e => {setCuponCliente(e.target.value.toUpperCase()); setCuponValido(false); setDescuento(0)}} className="flex-1 bg-white border border-slate-200 rounded-[16px] px-4 py-3 text-sm uppercase outline-none focus:border-[#FA4A0C] focus:ring-4 focus:ring-[#FA4A0C]/10 font-bold shadow-sm transition-all" disabled={validandoCupon} />
                        <button onClick={validarCuponBtn} disabled={validandoCupon || !cuponCliente.trim()} className="bg-slate-900 text-white px-6 py-3 rounded-[16px] text-sm font-bold disabled:opacity-50 hover:bg-black transition-colors">{validandoCupon ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Aplicar'}</button>
                      </div>
                      {cuponValido && <p className="text-green-600 text-xs font-bold mt-3 flex items-center gap-1.5 bg-green-50 p-2 rounded-lg"><CheckCircle2 size={14}/> Cupón aplicado exitosamente: -$${descuento.toFixed(2)}</p>}
                      
                      {/* Toast Promocional del Envío Dinámico */}
                      {costoEnvioBase > 0 && costoEnvio > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-blue-50/80 border border-blue-200/50 rounded-[20px] p-4 flex items-center gap-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xl">🛵</span>
                          </div>
                          <p className="text-[13px] text-blue-800 font-medium leading-tight">
                            ¡Tu envío está bajando gracias a tu compra! 🛵 Agrega un antojito más para que tu envío salga aún más barato... <span className="font-bold">¡o hasta GRATIS!</span>
                          </p>
                        </motion.div>
                      )}
                      {costoEnvioBase > 0 && costoEnvio === 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-green-50/80 border border-green-200/50 rounded-[20px] p-4 flex items-center gap-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <span className="text-xl">🎉</span>
                          </div>
                          <p className="text-[13px] text-green-800 font-medium leading-tight">
                            ¡Magia! ✨ Has agregado tantos productos que tu envío ahora es <span className="font-black">TOTALMENTE GRATIS</span>.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* PASO 2: DATOS PERSONALES */}
                {checkoutStep === 2 && (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Nombre</label>
                      <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full bg-white border border-slate-200 rounded-[16px] px-4 py-3.5 outline-none focus:border-[#FA4A0C] focus:ring-4 focus:ring-[#FA4A0C]/10 transition-all font-medium text-slate-800 placeholder:text-slate-300 shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Teléfono (WhatsApp)</label>
                      <input type="tel" value={clienteTel} onChange={(e) => {setClienteTel(e.target.value); setTelError(false);}} placeholder="10 dígitos" maxLength={10} className={`w-full bg-white border rounded-[16px] px-4 py-3.5 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-300 shadow-sm ${telError ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-[#FA4A0C] focus:ring-4 focus:ring-[#FA4A0C]/10'}`} />
                      {telError && <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1"><AlertCircle size={10} /> Ingrese un número a 10 dígitos válido</p>}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3 mt-4 border border-slate-100">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0">💡</div>
                      <p className="text-xs text-slate-500 mt-1">Tu información está segura. Solo la usamos para contactarte si el repartidor no encuentra tu casa.</p>
                    </div>
                  </motion.div>
                )}

                {/* PASO 3: ENTREGA Y MAPA */}
                {checkoutStep === 3 && (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-4">                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">¿Cómo quieres recibirlo?</label>
                      <motion.div layout className="flex flex-col sm:flex-row gap-3">
                        <AnimatePresence mode="popLayout">
                          {tipoEntrega !== 'tienda' && (
                            <motion.button 
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8, display: 'none' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setTipoEntrega(tipoEntrega === 'domicilio' ? null : 'domicilio')
                              }}
                              className={`flex-1 py-4 px-4 rounded-[16px] border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${tipoEntrega === 'domicilio' ? 'border-[#FA4A0C] bg-[#FA4A0C]/5 text-[#FA4A0C]' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                              <span className="text-2xl">🛵</span>
                              <span className="text-[11px] text-center leading-tight">{tipoEntrega === 'domicilio' ? 'Elegiste A Domicilio (toca para cambiar)' : 'A Domicilio'}</span>
                            </motion.button>
                          )}
                          {tipoEntrega !== 'domicilio' && (
                            <motion.button 
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8, display: 'none' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setTipoEntrega(tipoEntrega === 'tienda' ? null : 'tienda')} 
                              className={`flex-1 py-4 px-4 rounded-[16px] border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${tipoEntrega === 'tienda' ? 'border-[#FA4A0C] bg-[#FA4A0C]/5 text-[#FA4A0C]' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                              <span className="text-2xl">🏪</span>
                              <span className="text-[11px] text-center leading-tight">{tipoEntrega === 'tienda' ? 'Elegiste Recoger en Tienda (toca para cambiar)' : 'Recoger en Tienda'}</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    <AnimatePresence>
                      {tipoEntrega === 'tienda' && restaurante.maps_url && (
                        <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-slate-50 p-5 rounded-[20px] border border-slate-200 mt-2 overflow-hidden flex flex-col items-center text-center shadow-sm">
                           <MapPin className="text-slate-400 mb-2 w-6 h-6" />
                           <p className="text-sm text-slate-800 font-bold mb-3">Recoge tu pedido en nuestro local</p>
                           <a href={restaurante.maps_url} target="_blank" rel="noopener noreferrer" className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-[12px] font-bold text-xs flex items-center justify-center transition-colors shadow-md">
                             Ver indicaciones en Maps
                           </a>
                        </motion.div>
                      )}

                      {tipoEntrega === 'domicilio' && (
                        <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-slate-50 p-4 rounded-[20px] border border-slate-200 mt-2 flex flex-col items-center text-center shadow-sm relative">
                           
                           {ubicacionGPS ? (
                             <div className="w-full text-left">
                               <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-1.5">
                                   <MapPin className="text-[#FA4A0C] w-4 h-4" />
                                   <p className="text-sm text-slate-800 font-bold">Entregar en</p>
                                 </div>
                                 <button onClick={() => setIsMapModalOpen(true)} className="text-[#FA4A0C] text-xs font-bold hover:underline">
                                   Cambiar
                                 </button>
                               </div>
                               
                               <p className="text-[12px] text-slate-500 mb-3 line-clamp-2 leading-snug">
                                 {direccionEntrega}
                               </p>
                               
                               <input 
                                 type="text" 
                                 value={direccionReferencias} 
                                 onChange={(e) => setDireccionReferencias(e.target.value)} 
                                 placeholder="Referencias: Ej. Casa verde, portón negro..." 
                                 className="w-full bg-white border border-slate-200 rounded-[12px] px-3 py-2.5 outline-none focus:border-[#FA4A0C] focus:ring-2 focus:ring-[#FA4A0C]/10 transition-all font-medium text-slate-800 text-[12px] placeholder:text-slate-400 shadow-sm" 
                               />
                             </div>
                           ) : (
                             <>
                               <MapPin className="text-[#FA4A0C] mb-2 w-8 h-8" />
                               <p className="text-sm text-slate-800 font-bold mb-3">¿A dónde enviamos tu pedido?</p>
                               <button 
                                 onClick={() => setIsMapModalOpen(true)}
                                 className="w-full bg-[#FA4A0C] hover:bg-[#E03A00] text-white py-3 rounded-[12px] font-bold text-sm flex items-center justify-center transition-colors shadow-md"
                               >
                                 Establecer Ubicación
                               </button>
                             </>
                           )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* PASO 4: PAGO */}
                {checkoutStep === 4 && (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
                    <div>
                      <h3 className="font-black text-slate-900 text-lg mb-4 text-center">Selecciona tu Método de Pago</h3>
                      <div className="flex flex-col gap-4">
                        <button onClick={() => setMetodoPago('efectivo')} className={`w-full py-5 px-6 rounded-[24px] border-2 font-bold flex items-center gap-4 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${metodoPago === 'efectivo' ? 'bg-green-100' : 'bg-slate-100'}`}>💵</div>
                          <div className="text-left flex-1">
                            <span className="block text-base">Efectivo al recibir</span>
                            <span className="block text-xs opacity-70 mt-0.5">Paga cuando tengas tu pedido</span>
                          </div>
                          {metodoPago === 'efectivo' && <CheckCircle2 size={24} className="text-green-500" />}
                        </button>
                        {/* 
                        <button onClick={() => setMetodoPago('en_linea')} className={`w-full py-5 px-6 rounded-[24px] border-2 font-bold flex items-center gap-4 transition-all ${metodoPago === 'en_linea' ? 'border-[#FA4A0C] bg-[#FA4A0C]/5 text-[#FA4A0C]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${metodoPago === 'en_linea' ? 'bg-[#FA4A0C]/20' : 'bg-slate-100'}`}>💳</div>
                          <div className="text-left flex-1">
                            <span className="block text-base">Tarjeta o Mercado Pago</span>
                            <span className="block text-xs opacity-70 mt-0.5">Pago seguro en línea</span>
                          </div>
                          {metodoPago === 'en_linea' && <CheckCircle2 size={24} className="text-[#FA4A0C]" />}
                        </button>
                        */}
                        <div className="w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-[16px] text-center flex items-center gap-3">
                          <span className="text-2xl">⏳</span>
                          <p className="text-sm text-slate-600 font-medium">¡Próximamente tendremos pagos en línea! Por el momento, el pago es exclusivo en efectivo al recibir.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {carrito.length > 0 && (
            <div className="p-6 border-t border-slate-100/50 shrink-0 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.04)] z-10 relative rounded-t-[32px] sm:rounded-none">
              <div className="flex flex-col gap-4">
                
                {/* Banner Motivacional Envío en Paso 3 */}
                {checkoutStep === 3 && tipoEntrega === 'domicilio' && costoEnvioBase > 0 && !fueraDeCobertura && !calculandoEnvio && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[16px] p-3 flex items-center gap-3 border ${costoEnvio === 0 ? 'bg-green-50/80 border-green-200/50' : 'bg-blue-50/80 border-blue-200/50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${costoEnvio === 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {costoEnvio === 0 ? <span className="text-sm">🎉</span> : <span className="text-sm">🛵</span>}
                    </div>
                    <p className={`text-[12px] font-medium leading-tight ${costoEnvio === 0 ? 'text-green-800' : 'text-blue-800'}`}>
                      {costoEnvio === 0 
                        ? <>¡Magia! ✨ Tu envío es <span className="font-black">TOTALMENTE GRATIS</span>. ¡Aprovecha ese ahorro para pedir un postre!</>
                        : <>¡Tu envío está bajando gracias a tu compra! 🛵 Agrega un antojito más para que tu envío salga aún más barato... <span className="font-bold">¡o hasta GRATIS!</span></>}
                    </p>
                  </motion.div>
                )}

                {/* Desglose de totales premium */}
                <div className="flex flex-col gap-2.5 mb-2 px-1">
                  <div className="flex justify-between text-slate-500 text-[13px] font-bold tracking-wide">
                    <span>Subtotal</span>
                    <span className="text-slate-800">${carrito.reduce((s, p) => s + (p.item.precio * p.cantidad), 0).toFixed(2)}</span>
                  </div>
                  {descuento > 0 && (
                    <div className="flex justify-between text-green-500 text-[13px] font-bold tracking-wide">
                      <span>Descuento</span>
                      <span>-${descuento.toFixed(2)}</span>
                    </div>
                  )}
                  {tipoEntrega === 'domicilio' && (
                    <div className="flex justify-between items-center text-slate-500 text-[13px] font-bold tracking-wide">
                      <span className="flex items-center gap-1.5"><Truck size={14} className="text-[#FA4A0C]"/> Envío</span>
                      <AnimatePresence mode="wait">
                        <motion.span 
                          key={calculandoEnvio ? 'calc' : fueraDeCobertura ? 'out' : `${costoEnvio}-${costoEnvioBase}`}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5"
                        >
                          {calculandoEnvio ? (
                            <Loader2 size={12} className="animate-spin inline" />
                          ) : fueraDeCobertura ? (
                            <span className="text-red-500">Sin cobertura</span>
                          ) : costoEnvio === 0 ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400 line-through text-[12px] font-medium">${costoEnvioBase.toFixed(2)}</span>
                              <span className="text-green-500 font-black">¡GRATIS!</span>
                            </span>
                          ) : costoEnvio < costoEnvioBase ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-400 line-through text-[12px] font-medium">${costoEnvioBase.toFixed(2)}</span>
                              <span className="text-[#FA4A0C] font-black">+${costoEnvio.toFixed(2)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-800">+${costoEnvio.toFixed(2)}</span>
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}
                  <div className="h-px bg-slate-100 my-1 w-full" />
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-slate-900 font-black text-[15px]">Total a pagar</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">${total.toFixed(2)}</span>
                  </div>
                </div>

                {checkoutStep < 4 ? (
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (checkoutStep === 2) {
                        const telLimpio = clienteTel.replace(/\D/g, '')
                        if (telLimpio.length !== 10) {
                          setTelError(true);
                          showToast('Atención', 'Ingresa un número a 10 dígitos', 'error');
                          return;
                        }
                        if (!clienteNombre.trim()) {
                          showToast('Atención', 'Dinos tu nombre', 'error');
                          return;
                        }
                      }
                      if (checkoutStep === 3) {
                        if (!tipoEntrega) {
                          showToast('Atención', 'Selecciona cómo quieres recibir tu pedido', 'error');
                          return;
                        }
                        if (tipoEntrega === 'domicilio') {
                          if (calculandoEnvio) {
                            showToast('Calculando envío', 'Espera un momento mientras calculamos el costo...', 'loading');
                            return;
                          }
                          if (!direccionEntrega.trim() || !ubicacionGPS) {
                            showToast('Atención', 'Selecciona tu ubicación en el mapa', 'error');
                            return;
                          }
                          if (fueraDeCobertura) {
                            showToast('Sin Cobertura', 'Lo sentimos, tu ubicación está fuera del área de servicio.', 'error');
                            return;
                          }
                        }
                      }
                      if (checkoutStep === 4 && !metodoPago) {
                        showToast('Atención', 'Selecciona un método de pago', 'error');
                        return;
                      }
                      setCheckoutStep(prev => prev + 1)
                    }} 
                    className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-[17px] flex items-center justify-between px-6 hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                  >
                    <span>{checkoutStep === 1 ? 'Continuar' : checkoutStep === 2 ? 'Continuar a Entrega' : 'Ir al Pago'}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">Paso {checkoutStep}/4</span>
                  </motion.button>
                ) : (
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={handlePedir} 
                    disabled={procesando || calculandoEnvio} 
                    className="w-full bg-[#FA4A0C] text-white py-4 px-6 rounded-[20px] font-black text-[17px] flex items-center justify-between hover:bg-[#ff551b] transition-all disabled:opacity-50 shadow-xl shadow-[#FA4A0C]/20"
                  >
                    <span>Confirmar Pedido</span>
                    {procesando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </motion.div>
    )}
  </AnimatePresence>

      {/* MODAL DE OPCIONES — WIZARD PASO A PASO */}
      <AnimatePresence>
        {selectedItemForOptions && (() => {
          const grupos = selectedItemForOptions.opciones || [];
          const totalSteps = grupos.length;
          const grupo = grupos[optionsStep];
          const seleccionados = grupo ? (selectedOptionsState[grupo.titulo] || {}) : {};
          const countSelected = Object.values(seleccionados).filter(Boolean).length;
          const isLastStep = optionsStep === totalSteps - 1;
          const isFirstStep = optionsStep === 0;

          const handleToggle = (opc: any) => {
            if (!grupo) return;
            const isRadio = grupo.maximo_selecciones === 1;
            // Auto-avance FUERA del updater para evitar doble llamada en StrictMode
            if (isRadio && !isLastStep) {
              // Usamos optionsStep directo para evitar que múltiples taps rápidos salten pasos (race condition)
              setTimeout(() => setOptionsStep(optionsStep + 1), 200);
            }
            setSelectedOptionsState(prev => {
              const groupState = { ...(prev[grupo.titulo] || {}) };
              if (isRadio) {
                return { ...prev, [grupo.titulo]: { [opc.nombre]: true } };
              } else {
                const already = !!groupState[opc.nombre];
                if (already) {
                  delete groupState[opc.nombre];
                } else {
                  if (Object.values(groupState).filter(Boolean).length >= grupo.maximo_selecciones) return prev;
                  groupState[opc.nombre] = true;
                }
                return { ...prev, [grupo.titulo]: groupState };
              }
            });
          };

          const handleNext = () => {
            if (grupo?.requerido && countSelected === 0) {
              // Shake sin toast
              const btn = document.getElementById('wizard-next-btn');
              if (btn) {
                btn.animate([
                  { transform: 'translateX(0)' },
                  { transform: 'translateX(-8px)' },
                  { transform: 'translateX(8px)' },
                  { transform: 'translateX(-6px)' },
                  { transform: 'translateX(6px)' },
                  { transform: 'translateX(0)' },
                ], { duration: 320, easing: 'ease-out' });
              }
              return;
            }
            if (isLastStep) {
              // Agregar al carrito
              let precioExtra = 0;
              const opcionesSel: OpcionSeleccionada[] = [];
              grupos.forEach((g: any) => {
                g.opciones.forEach((o: any) => {
                  if (selectedOptionsState[g.titulo]?.[o.nombre]) {
                    precioExtra += o.precio_extra;
                    opcionesSel.push({ grupo: g.titulo, opcion: o.nombre, precio_extra: o.precio_extra });
                  }
                });
              });
              const hashId = selectedItemForOptions.id + '_' + opcionesSel.map((o: any) => o.opcion).sort().join('_');
              const itemToAdd: CartItem = {
                id: selectedItemForOptions.id,
                cartItemId: hashId,
                nombre: selectedItemForOptions.nombre,
                precio: selectedItemForOptions.precio + precioExtra,
                tipo: selectedItemForOptions.__tipo,
                opcionesSeleccionadas: opcionesSel,
                aplica_subsidio: selectedItemForOptions.aplica_subsidio
              };
              addToCart({ ...itemToAdd, foto_url: selectedItemForOptions.foto_url || undefined });
              setSelectedItemForOptions(null);
              showToast('Agregado', `${selectedItemForOptions.nombre} añadido al carrito`);
            } else {
              setOptionsStep(s => s + 1);
            }
          };

          // Precio total acumulado hasta el paso actual
          const precioActual = selectedItemForOptions.precio + grupos.reduce((sum: number, g: any) => {
            return sum + g.opciones.reduce((s2: number, o: any) => {
              return s2 + (selectedOptionsState[g.titulo]?.[o.nombre] ? o.precio_extra : 0);
            }, 0);
          }, 0);

          return (
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setSelectedItemForOptions(null)}
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 32, stiffness: 280, mass: 0.9 }}
                className="relative w-full sm:max-w-lg bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              >
                {/* ── HEADER ── */}
                <div className="px-6 pt-6 pb-4 shrink-0 bg-white">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{selectedItemForOptions.nombre}</p>
                      {grupo && (
                        <div className="flex items-start gap-2">
                          <h3 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight flex-1">{grupo.titulo}</h3>
                          {grupo.requerido && countSelected === 0 && (
                            <span className="shrink-0 mt-1.5 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100">
                              Requerido
                            </span>
                          )}
                          {grupo.requerido && countSelected > 0 && (
                            <span className="shrink-0 mt-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                              ✓ Listo
                            </span>
                          )}
                        </div>
                      )}
                      {grupo?.maximo_selecciones > 1 && (
                        <p className="text-[13px] text-slate-400 mt-1">
                          Elige hasta {grupo.maximo_selecciones}
                          {countSelected > 0 && (
                            <span className="ml-1.5 font-bold text-orange-500">— {countSelected} elegid{countSelected === 1 ? 'a' : 'as'}</span>
                          )}
                        </p>
                      )}
                      {grupo?.maximo_selecciones === 1 && (
                        <p className="text-[13px] text-slate-400 mt-1">Elige 1 opción</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedItemForOptions(null)}
                      className="w-9 h-9 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:bg-slate-200 transition-colors"
                    >
                      <X size={18} className="stroke-[2.5px]" />
                    </button>
                  </div>

                  {/* ── PROGRESS BAR + DOTS ── */}
                  {totalSteps > 1 && (
                    <div className="space-y-2">
                      {/* Barra de progreso */}
                      <div className="relative h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FA4A0C] to-orange-400 rounded-full"
                          initial={false}
                          animate={{ width: `${((optionsStep + 1) / totalSteps) * 100}%` }}
                          transition={{ type: 'spring', stiffness: 180, damping: 28 }}
                        />
                      </div>
                      {/* Dots con checkmarks */}
                      <div className="flex items-center gap-1.5">
                        {grupos.map((_: any, i: number) => {
                          const done = i < optionsStep;
                          const active = i === optionsStep;
                          return (
                            <motion.div
                              key={i}
                              layout
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              className={`rounded-full flex items-center justify-center ${
                                active ? 'w-6 h-2.5 bg-[#FA4A0C]'
                                : done  ? 'w-2.5 h-2.5 bg-emerald-400'
                                :         'w-2.5 h-2.5 bg-slate-200'
                              }`}
                            >
                              {done && (
                                <motion.svg
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.05 }}
                                  viewBox="0 0 10 10" fill="none" className="w-1.5 h-1.5"
                                >
                                  <path d="M8.5 2.5L4 7.5L1.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </motion.svg>
                              )}
                            </motion.div>
                          );
                        })}
                        <span className="ml-auto text-[11px] text-slate-400 font-bold tabular-nums">{optionsStep + 1}&thinsp;/&thinsp;{totalSteps}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SEPARADOR ── */}
                <div className="h-px bg-slate-100 shrink-0" />

                {/* ── CONTENIDO DEL PASO ACTUAL (animado) ── */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {grupo && (
                      <motion.div
                        key={optionsStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
                        className="px-5 py-5"
                      >
                        {grupo.opciones.every((o: any) => !o.precio_extra || o.precio_extra === 0) ? (
                          // ── Chips compactos (sin precio extra) ──
                          <div className="flex flex-wrap gap-2.5">
                            {grupo.opciones.map((opc: any, oIdx: number) => {
                              const isSelected = !!seleccionados[opc.nombre];
                              return (
                                <motion.button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleToggle(opc)}
                                  whileTap={{ scale: 0.93 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  style={{ minHeight: '42px' }}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-semibold
                                    select-none whitespace-nowrap border-2
                                    transition-colors duration-200
                                    ${isSelected
                                      ? 'bg-[#FA4A0C] text-white border-[#FA4A0C] shadow-md shadow-orange-200'
                                      : 'bg-white text-slate-700 border-slate-200'
                                    }`}
                                >
                                  {isSelected ? (
                                    grupo.maximo_selecciones === 1
                                      ? <div className="w-2.5 h-2.5 rounded-full bg-white shrink-0" />
                                      : <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 shrink-0"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  ) : (
                                    grupo.maximo_selecciones === 1
                                      ? <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 shrink-0" />
                                      : null
                                  )}
                                  {opc.nombre}
                                </motion.button>
                              );
                            })}
                          </div>
                        ) : (
                          // ── Lista detallada (con precio extra) ──
                          <div className="space-y-1.5">
                            {grupo.opciones.map((opc: any, oIdx: number) => {
                              const isSelected = !!seleccionados[opc.nombre];
                              return (
                                <motion.button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleToggle(opc)}
                                  whileTap={{ scale: 0.98 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                  style={{ minHeight: '56px' }}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl select-none border-2
                                    transition-colors duration-200
                                    ${isSelected
                                      ? 'bg-orange-50 border-[#FA4A0C]'
                                      : 'bg-white border-slate-200'
                                    }`}
                                >
                                  <span className={`text-[15px] font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {opc.nombre}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    {opc.precio_extra > 0 && (
                                      <span className={`text-[13px] font-bold ${isSelected ? 'text-[#FA4A0C]' : 'text-slate-400'}`}>
                                        +${opc.precio_extra.toFixed(2)}
                                      </span>
                                    )}
                                    <motion.div
                                      animate={isSelected
                                        ? { backgroundColor: '#FA4A0C', borderColor: '#FA4A0C', scale: 1.08 }
                                        : { backgroundColor: '#ffffff', borderColor: '#cbd5e1', scale: 1 }
                                      }
                                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                      className="w-5 h-5 flex items-center justify-center rounded-full border-2"
                                    >
                                      {isSelected && (
                                        <motion.svg
                                          initial={{ opacity: 0, scale: 0.3 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ type: 'spring', stiffness: 600, damping: 25 }}
                                          viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-white"
                                        >
                                          <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </motion.svg>
                                      )}
                                    </motion.div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── FOOTER: Atrás / Siguiente / Agregar ── */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                  {!isFirstStep && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      onClick={() => setOptionsStep(s => s - 1)}
                      style={{ minHeight: '52px' }}
                      className="flex items-center justify-center gap-1.5 px-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-[14px] transition-colors duration-150 shrink-0 hover:bg-slate-50"
                    >
                      <ChevronDown size={18} className="rotate-90" /> Atrás
                    </motion.button>
                  )}
                  <motion.button
                    id="wizard-next-btn"
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    onClick={handleNext}
                    style={{ minHeight: '52px' }}
                    className={`flex-1 rounded-2xl font-black text-[15px] transition-colors duration-300 flex items-center justify-between px-5
                      ${ isLastStep
                        ? 'bg-[#FA4A0C] text-white shadow-lg shadow-orange-300/40'
                        : grupo?.requerido && countSelected === 0
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-slate-900 text-white'
                      }`}
                  >
                    <span>{isLastStep ? 'Añadir al Carrito' : 'Siguiente'}</span>
                    {isLastStep
                      ? <span className="text-white/90 font-black">${precioActual.toFixed(2)}</span>
                      : <ChevronDown size={20} className="rotate-[-90deg]" />
                    }
                  </motion.button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>




    {/* Toast notification */}
    <AnimatePresence>
      {toastMsg && (
        <motion.div 
          key="global-toast"
          style={{ originY: 0, originX: 0.5 }}
          initial={{ y: -20, opacity: 0, x: "-50%", scaleX: 0.3, scaleY: 0.1, filter: "blur(10px)" }} 
          animate={{ y: 0, opacity: 1, x: "-50%", scaleX: 1, scaleY: 1, filter: "blur(0px)" }} 
          exit={{ y: -20, opacity: 0, x: "-50%", scaleX: 0.3, scaleY: 0.1, filter: "blur(10px)" }} 
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-2 sm:top-4 left-1/2 z-[300] flex items-center justify-between w-[92%] max-w-[380px] px-4 py-3.5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white/95 backdrop-blur-md border border-slate-100"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> : toastMsg.type === 'loading' ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            <div className="flex flex-col min-w-0">
              <p className="text-slate-800 text-[14px] font-bold leading-tight tracking-wide truncate">{toastMsg.title}</p>
              {toastMsg.message && <p className="text-slate-500 text-[12px] leading-tight mt-0.5 truncate">{toastMsg.message}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* PREMIUM CLOSED TOAST */}
      <AnimatePresence>
        {showClosedToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl text-white px-5 py-4 rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-sm w-full pointer-events-auto border border-white/10">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm tracking-tight text-white">Cerrado por ahora</h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">Aún no podemos tomar tu pedido. ¡Vuelve pronto!</p>
              </div>
              <button 
                onClick={() => setShowClosedToast(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* MODAL DEL MAPA (FULL SCREEN) ESTILO RAPPI */}
      <AnimatePresence>
        {isMapModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shadow-sm z-20 relative">
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg font-black text-slate-800">Ubicación de entrega</h2>
              <div className="w-10"></div> {/* Spacer for center alignment */}
            </div>

            {/* Cuerpo del Mapa */}
            <div className="flex-1 relative bg-slate-100">
              
              {/* Botón Flotante "Mi Ubicación" */}
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={obtenerUbicacionGPS} 
                  disabled={buscandoGPS}
                  className="w-12 h-12 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center text-slate-700 hover:text-[#FA4A0C] transition-colors disabled:opacity-50"
                >
                  {buscandoGPS ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
                </button>
              </div>

              {/* Hint superior */}
              <div className="absolute top-4 left-4 right-20 z-20 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-100 pointer-events-auto">
                  <p className="text-xs text-slate-500 font-bold mb-1">Entregar en:</p>
                  <p className="text-sm text-slate-800 font-medium line-clamp-2 leading-tight">
                    {draftDireccion || 'Mueve el mapa para ubicar tu dirección'}
                  </p>
                </div>
              </div>

              {isGoogleMapsLoaded ? (
                <div className="relative w-full h-full">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={draftUbicacion || ubicacionGPS || (restaurante?.lat && restaurante?.lng ? { lat: restaurante.lat, lng: restaurante.lng } : { lat: 16.2516, lng: -92.1332 })}
                    zoom={draftUbicacion || ubicacionGPS ? 17 : 14}
                    onLoad={(map) => setMapInstance(map)}
                    onDragEnd={handleMapDragEnd}
                    options={{ 
                      disableDefaultUI: true, 
                      zoomControl: false,
                      gestureHandling: 'greedy',
                      styles: PREMIUM_MAP_STYLE
                    }}
                  >
                    {/* Punto Azul de ubicación GPS real detectada */}
                    {realLocation && (
                      <Marker 
                        position={realLocation}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 8,
                          fillColor: '#4285F4',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                        }}
                        zIndex={1}
                      />
                    )}
                    {realLocation && (
                      <Marker 
                        position={realLocation}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 18,
                          fillColor: '#4285F4',
                          fillOpacity: 0.15,
                          strokeWeight: 0,
                        }}
                        zIndex={0}
                      />
                    )}
                  </GoogleMap>
                  
                  {/* Pin fijo central estilo Rappi */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                    <div className="relative">
                      <MapPin className="text-[#FA4A0C] w-14 h-14 fill-[#FA4A0C] animate-bounce-short" style={{ filter: 'drop-shadow(0px 5px 5px rgba(0,0,0,0.3))' }} />
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <div className="w-4 h-1 bg-black/40 rounded-[100%] mx-auto -mt-1 blur-[1px]"></div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Loader2 size={32} className="animate-spin text-slate-300" />
                </div>
              )}
            </div>

            {/* Footer del Modal (Botón de Confirmar) */}
            <div className="p-4 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
              <button 
                onClick={handleConfirmarUbicacion}
                disabled={!draftUbicacion && !ubicacionGPS}
                className="w-full bg-[#FA4A0C] hover:bg-[#E03A00] disabled:bg-slate-300 disabled:text-slate-500 text-white py-4 rounded-[16px] font-black text-[16px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(250,74,12,0.3)] disabled:shadow-none transition-all active:scale-95"
              >
                Confirmar Ubicación
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}



