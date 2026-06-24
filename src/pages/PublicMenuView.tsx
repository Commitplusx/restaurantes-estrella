import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as h3 from 'h3-js'
import type { Restaurante, MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../lib/supabase'
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
  LocateFixed
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLoadScript, GoogleMap, Marker, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

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
const LazyImage = ({ src, alt, className, imgClassName }: { src?: string | null, alt?: string, className?: string, imgClassName?: string }) => {
  const [loaded, setLoaded] = useState(false);
  if (!src) return <div className={`bg-slate-100 flex items-center justify-center ${className || ''}`}><Store size={24} className="text-slate-300"/></div>;
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className || ''}`}>
      {!loaded && <div className="absolute inset-0 bg-slate-200 animate-pulse" />}
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName || ''}`}
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
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [restaurantePausado, setRestaurantePausado] = useState(false)

  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [promos, setPromos] = useState<MenuPromocion[]>([])

  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'menu' | 'combos' | 'promos'>('menu')

  const [selectedItemDetail, setSelectedItemDetail] = useState<any | null>(null)

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
  const [ubicacionGPS, setUbicacionGPS] = useState<{lat: number, lng: number} | null>(null)
  const [buscandoGPS, setBuscandoGPS] = useState(false)
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null)
  const { isLoaded: isGoogleMapsLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });
  const submittingRef = useRef(false) // BUG 5 fix: prevents double-submit
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'en_linea'>(() => (sessionStorage.getItem('est_metodopago') as 'efectivo' | 'en_linea') || 'efectivo')
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

  // Estados de cálculo H3
  const [costoEnvio, setCostoEnvio] = useState(0)
  const [fueraDeCobertura, setFueraDeCobertura] = useState(false)
  const [calculandoEnvio, setCalculandoEnvio] = useState(false)

  // Calcular tarifa H3 automáticamente cuando cambia la ubicación
  useEffect(() => {
    async function calcularEnvio() {
      if (tipoEntrega !== 'domicilio' || !ubicacionGPS) {
        setCostoEnvio(0)
        setZonaEnvioNombre('')
        setFueraDeCobertura(false)
        return
      }

      setCalculandoEnvio(true)
      setFueraDeCobertura(false)
      try {
        const hexIndex = h3.latLngToCell(ubicacionGPS.lat, ubicacionGPS.lng, 10)
        
        // Artificial delay for better UX (so the animation isn't just a flash)
        await new Promise(resolve => setTimeout(resolve, 1500))

        const { data } = await supabase
          .from('h3_zonas')
          .select('precio, nombre')
          .eq('h3_index', hexIndex)
          .maybeSingle()
          
        if (data && data.precio !== undefined) {
          setCostoEnvio(data.precio)
          setZonaEnvioNombre(data.nombre || 'Zona Estrella')
        } else {
          setCostoEnvio(0)
          setZonaEnvioNombre('')
          setFueraDeCobertura(true)
        }
      } catch (err) {
        console.error("Error calculando envío H3:", err)
      } finally {
        setCalculandoEnvio(false)
      }
    }
    
    calcularEnvio()
  }, [ubicacionGPS, tipoEntrega])

  useEffect(() => {
    sessionStorage.setItem('est_carrito', JSON.stringify(carrito))
  }, [carrito])
  useEffect(() => { sessionStorage.setItem('est_nombre', clienteNombre) }, [clienteNombre])
  useEffect(() => { sessionStorage.setItem('est_tel', clienteTel) }, [clienteTel])
  useEffect(() => { sessionStorage.setItem('est_metodopago', metodoPago) }, [metodoPago])
  useEffect(() => { sessionStorage.setItem('est_checkoutstep', checkoutStep.toString()) }, [checkoutStep])
  useEffect(() => { if (tipoEntrega) sessionStorage.setItem('est_tipoentrega', tipoEntrega) }, [tipoEntrega])
  useEffect(() => { sessionStorage.setItem('est_direccion', direccionEntrega) }, [direccionEntrega])

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Estado del modal de opciones de producto
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<MenuItem | null>(null)
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
          // Incrementar contador de usos
          await supabase
            .from('cupones_restaurante')
            .update({ usos_actuales: cuponPropio.usos_actuales + 1 })
            .eq('id', cuponPropio.id)
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
    let isMounted = true

    async function fetchMenuData(silently = false) {
      if (!id) return

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      
      let rest = null
      
      if (isUUID) {
        const { data } = await supabase.from('restaurantes').select('*').eq('id', id).maybeSingle()
        rest = data
      }
      
      if (!rest) {
        const { data } = await supabase.from('restaurantes').select('*').eq('slug', id).maybeSingle()
        rest = data
      }

      if (!rest) {
        if (isMounted && !silently) {
          navigate('/?error=notfound', { replace: true })
        }
        return null
      }

      const actualId = rest.id;

      const [{ data: cats }, { data: prods }, { data: cmbs }, { data: prms }] = await Promise.all([
        supabase.from('menu_categorias').select('*').eq('restaurante_id', actualId).order('orden'),
        supabase.from('menu_items').select('*').eq('restaurante_id', actualId).eq('disponible', true).order('orden'),
        supabase.from('menu_combos').select('*').eq('restaurante_id', actualId).eq('disponible', true),
        supabase.from('menu_promociones').select('*').eq('restaurante_id', actualId).eq('activa', true)
      ])

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
        
        if (!silently) {
          setLoading(false)
          // Solo auto-seleccionar pestaña en la primera carga si no es silencioso
          const hasItems = (prods || []).length > 0
          const hasCombos = (cmbs || []).length > 0
          const hasValidPromos = validPromos.length > 0
          
          const urlTab = new URLSearchParams(window.location.search).get('tab')
          if (urlTab === 'promos' && hasValidPromos) setActiveTab('promos')
          else if (urlTab === 'combos' && hasCombos) setActiveTab('combos')
          else if (urlTab === 'menu') setActiveTab('menu')
          else if (!hasItems && hasCombos) setActiveTab('combos')
          else if (!hasItems && !hasCombos && hasValidPromos) setActiveTab('promos')
          else setActiveTab('menu')
        }
      }
      
      return actualId
    }

    async function load() {
      // 1. Revisar caché local para carga instantánea en 0ms
      if (id && menuCache[id]) {
        const cached = menuCache[id]
        setRestaurante(cached.restaurante)
        setCategorias(cached.categorias)
        setItems(cached.items)
        setCombos(cached.combos)
        setPromos(cached.promos)
        setLoading(false)
        
        // Ejecutar fetch silencioso en background para actualizar caché si pasaron más de 1 min
        if (Date.now() - cached.timestamp > 60000) {
          fetchMenuData(true)
        }
      } else {
        await fetchMenuData()
      }

      // 2. Configurar Supabase Realtime para este restaurante
      // Solo nos suscribimos si ya tenemos el ID real del restaurante
      let actualRestId = id
      if (id && menuCache[id]) {
        actualRestId = menuCache[id].restaurante.id
      } else if (restaurante) {
        actualRestId = restaurante.id
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

  // Fix Map interaction to be like Rappi/Uber (fixed center pin)
  const handleMapDragEnd = () => {
    if (mapInstance) {
      const center = mapInstance.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();
        setUbicacionGPS({ lat, lng });
        setDirectionsResponse(null);
        
        // Reverse geocoding silencioso para obtener la colonia
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results.length > 0 && results[0]) {
            setDireccionEntrega(results[0].formatted_address);
          } else {
            setDireccionEntrega(`Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        });
      }
    }
  }

  const obtenerUbicacionGPS = () => {
    if ("geolocation" in navigator) {
      setBuscandoGPS(true);
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUbicacionGPS({ lat, lng });
        setDirectionsResponse(null);
        
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setBuscandoGPS(false);
            if (status === "OK" && results && results[0]) {
              setDireccionEntrega(results[0].formatted_address);
              showToast('Ubicación encontrada', 'Confirma que el punto en el mapa sea correcto', 'success');
            } else {
              setDireccionEntrega(`Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          });
        } else {
          setBuscandoGPS(false);
          setDireccionEntrega(`Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }, () => {
        setBuscandoGPS(false);
        showToast('Error de Ubicación', 'No pudimos acceder a tu GPS. Por favor escribe tu dirección.', 'error')
      }, { enableHighAccuracy: true })
    } else {
      showToast('Error', 'Tu navegador no soporta geolocalización', 'error')
    }
  }


  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  // BUG 4 fix: reset coupon if cart subtotal drops to 0 or below discount amount
  const descuentoAplicable = subtotal > 0 ? Math.min(descuento, subtotal) : 0
  const total = Math.max(0, subtotal - descuentoAplicable) + (tipoEntrega === 'domicilio' && !fueraDeCobertura ? costoEnvio : 0)

  // Bug #5: reset fields when closing cart without ordering
  const closeCart = () => {
    setIsCartOpen(false)
    setTimeout(() => setCheckoutStep(1), 300)
  }

  const handlePedir = async () => {
    if (!restaurante || carrito.length === 0) return
    if (submittingRef.current) return // BUG 5 fix: prevent double-submit
    if (!clienteNombre.trim()) {
      showToast('Falta el nombre', 'Por favor ingresa tu nombre para continuar', 'error')
      return
    }
    // Bloqueo si está fuera de cobertura
    if (tipoEntrega === 'domicilio' && fueraDeCobertura) {
      showToast('Fuera de cobertura', 'Lo sentimos, tu ubicación está fuera del área de servicio.', 'error')
      return
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
      ? `\n\n🛵 *Tipo de entrega:* A domicilio` + (costoEnvio > 0 ? `\n🚚 *Costo Envío:* $${costoEnvio}` : '')
      : `\n\n🏪 *Tipo de entrega:* Recoger en tienda`
      
    const pedidoCompleto = pedidoDetalles + detallesEntregaStr

    try {
      const { error: insertError } = await supabase.from('pedidos').insert([{
        cliente_tel: telLimpio,
        cliente_nombre: clienteNombre.trim(),
        restaurante: restaurante.nombre,
        descripcion: pedidoCompleto,
        direccion: tipoEntrega === 'domicilio' ? direccionEntrega : null,
        lat: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lat : null,
        lng: tipoEntrega === 'domicilio' && ubicacionGPS ? ubicacionGPS.lng : null,
        estado: metodoPago === 'en_linea' ? 'pendiente_pago' : 'pendiente',
        wb_message_id: ticketId,
        metodo_pago: metodoPago,
        total: total,
        tipo_pedido: tipoEntrega === 'domicilio' ? 'domicilio' : 'tienda'
      }]).select('id').single()

      if (insertError) throw insertError

      // Notificar al admin sobre la nueva orden SOLO si es a domicilio
      if (tipoEntrega === 'domicilio') {
        supabase.functions.invoke('notificar-whatsapp', {
          body: {
            tipo: 'nueva_orden_admin',
            ticket_id: ticketId,
            restaurante: restaurante.nombre,
            descripcion: pedidoCompleto,
            tipo_entrega: tipoEntrega
          }
        }).catch(err => console.warn('Error notificando al admin:', err))
      }

    } catch (err: any) { 
      alert('Hubo un problema registrando el pedido en la base de datos: ' + (err.message || 'Error desconocido') + '. Por favor intenta nuevamente.');
      submittingRef.current = false // BUG 5 fix
      setProcesando(false);
      return;
    }

    if (metodoPago === 'en_linea') {
      try {
        // Bug 1 fix: aplicar descuento proporcional en los lineItems para que Conekta cobre el total correcto
        const subtotalBruto = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
        const factorDescuento = subtotalBruto > 0 ? (total - (tipoEntrega === 'domicilio' && !fueraDeCobertura ? costoEnvio : 0)) / subtotalBruto : 1
        
        const lineItems = carrito.map(p => ({
          name: p.item.nombre,
          price: parseFloat((p.item.precio * factorDescuento).toFixed(2)),
          quantity: p.cantidad
        }))

        if (tipoEntrega === 'domicilio' && costoEnvio > 0 && !fueraDeCobertura) {
          lineItems.push({
            name: 'Costo de Envío',
            price: costoEnvio,
            quantity: 1
          })
        }

        
        const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/conekta-checkout'
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({
            pedidoId: ticketId,
            clienteNombre: clienteNombre.trim(),
            clienteTel: telLimpio,
            restauranteNombre: restaurante.nombre,
            lineItems: lineItems,
            subtotal: total,
            returnUrl: window.location.origin + `/success?pedido=${ticketId}&success=true`
          })
        })
        
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Error al generar link de Conekta')
        }
        
        // Bug 7 fix: detectar si el URL llegó vacío y avisar al usuario
        if (data.checkoutUrl) {
          await supabase.from('pedidos').update({ conekta_order_id: data.conektaOrderId }).eq('wb_message_id', ticketId)
          window.location.href = data.checkoutUrl
          return
        } else {
          throw new Error('Conekta no devolvió un link de pago válido. Intenta nuevamente.')
        }
      } catch (err: any) {
        showToast('Error', err.message || 'No se pudo generar el pago en línea', 'error')
        submittingRef.current = false // BUG 5 fix
        setProcesando(false)
        return
      }
    } else {
      // Flujo 100% Web para pagos en Efectivo
      setIsCartOpen(false)
      setCarrito([])
      setClienteNombre('')
      setClienteTel('')
      setCuponCliente('')
      setCuponValido(false)
      setDescuento(0)
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
        <div className={`flex-1 min-w-0 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-base font-bold text-slate-900 truncate">{restaurante.nombre}</h1>
        </div>
      </header>

      {/* HERO FULL BLEED (RAPPI STYLE) */}
      <div className="relative w-full h-[25vh] md:h-[25vh] bg-slate-50 overflow-hidden">
        {restaurante.foto_fachada_url ? (
          <>
            {/* Fondo borroso para rellenar espacios vacíos (solo en móvil) */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-50 md:hidden"
              style={{ backgroundImage: `url(${restaurante.foto_fachada_url})` }}
            />
            {/* Imagen principal: contenida en móvil, oculta en PC */}
            <img
              src={restaurante.foto_fachada_url}
              className="relative w-full h-full object-contain md:hidden"
              loading="lazy"
              decoding="async"
              alt={restaurante.nombre}
            />
          </>
        ) : (
          <div className="w-full h-full bg-slate-50" />
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 relative z-10">

        {/* INFO CARD (RAPPI STYLE) */}
        <div className="bg-white rounded-t-3xl sm:rounded-none -mt-6 sm:mt-0 pt-0 pb-6 flex flex-col items-center sm:items-start text-center sm:text-left border-b border-slate-100">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-48 md:h-48 rounded-[18px] md:rounded-[32px] overflow-hidden shadow-sm border-4 md:border-[8px] border-white bg-white shrink-0 flex items-center justify-center -mt-10 md:-mt-24 mb-3 md:mb-6 z-20">
            <LazyImage src={restaurante.foto_fachada_url} alt="Logo" className="w-full h-full" />
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1">
            {restaurante.nombre}
          </h1>
          
          <p className="text-slate-500 text-sm mb-4 flex items-center justify-center sm:justify-start gap-1">
            <Star size={14} className="text-amber-400 fill-amber-400" /> 
            <span className="font-medium text-slate-700">4.8</span>
            <span className="text-slate-300 mx-1">•</span>
            {restaurante.categorias?.slice(0, 2).join(' • ') || 'Restaurante'}
          </p>
          
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm mt-1">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock size={16} className="text-slate-400" /> 
              <span>{restaurante.hora_apertura?.slice(0, 5)} - {restaurante.hora_cierre?.slice(0, 5)}</span>
            </div>
            
            {restaurante.maps_url ? (
              <a href={restaurante.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors">
                <MapPin size={16} className="text-blue-500" /> 
                <span className="line-clamp-1 max-w-[200px] underline decoration-blue-200">{restaurante.direccion || 'Ver en mapa'}</span>
              </a>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin size={16} className="text-slate-400" /> 
                <span className="line-clamp-1 max-w-[200px]">{restaurante.direccion || 'Comitán'}</span>
              </div>
            )}
          </div>
        </div>

        {!estaAbierto(restaurante) && (
          <div className="bg-slate-50 text-slate-600 font-medium text-sm p-4 rounded-xl mt-6 flex items-center justify-center sm:justify-start gap-2 border border-slate-200">
            <AlertCircle size={18} className="text-slate-400" />
            Cerrado. Solo puedes hacer pedidos en el horario del restaurante.
          </div>
        )}

        {/* TABS DE NAVEGACIÓN (RAPPI STYLE) */}
        {(combos.length > 0 || promos.length > 0) && (
          <div className="sticky top-[52px] z-40 bg-white pt-6 pb-0 mb-6 border-b border-slate-100">
            <div className="flex overflow-x-auto hide-scrollbar gap-8 px-2">
              <button
                onClick={() => setActiveTab('menu')}
                className={`pb-4 text-sm font-bold transition-all relative shrink-0 ${activeTab === 'menu' ? 'text-slate-900' : 'text-slate-400'}`}
              >
                Menú
                {activeTab === 'menu' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
              </button>
              {combos.length > 0 && (
                <button
                  onClick={() => setActiveTab('combos')}
                  className={`pb-4 text-sm font-bold transition-all relative shrink-0 ${activeTab === 'combos' ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  Combos
                  {activeTab === 'combos' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
                </button>
              )}
              {promos.length > 0 && (
                <button
                  onClick={() => setActiveTab('promos')}
                  className={`pb-4 text-sm font-bold transition-all relative shrink-0 ${activeTab === 'promos' ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  Promociones
                  {activeTab === 'promos' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />}
                </button>
              )}
            </div>
          </div>
        )}

            {/* PRODUCT CATEGORIES (MENU TAB) */}
            {activeTab === 'menu' && (
              <div className="mt-8">
                {categorias.map(cat => {
                  const catItems = items.filter(i => i.categoria_id === cat.id)
                  if (catItems.length === 0) return null
                  return (
                    <motion.div
                      key={cat.id}
                      className="mb-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <h3 className="text-xl font-bold text-slate-900 mb-4 px-2 tracking-tight">
                        {cat.nombre}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catItems.map((item) => {
                          const cartItem = { id: item.id, nombre: item.nombre, precio: item.precio, tipo: 'item' as const, foto_url: item.foto_url || undefined }
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
                              onClick={() => setSelectedItemDetail({ ...item, cartItemTipo: 'item' })}
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
                                        setSelectedItemForOptions(item)
                                        setSelectedOptionsState({})
                                      } else {
                                        addToCart({ ...cartItem, cartItemId: item.id })
                                      }
                                    }}
                                    className="absolute bottom-2 right-2 w-8 h-8 bg-white text-[#FA4A0C] rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-transform"
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
              </div>
            )}

            {/* Empty state for menu tab */}
            {activeTab === 'menu' && items.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400">
                <Store size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold">Este restaurante aún no tiene platillos publicados</p>
              </div>
            )}

            {/* COMBOS TAB */}
            {activeTab === 'combos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {combos.map(combo => {
                  return (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm cursor-pointer group flex flex-col h-full" onClick={() => addToCart({ id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo', foto_url: combo.foto_url || undefined, cartItemId: combo.id })}>
                          <LazyImage src={combo.foto_url} alt={combo.nombre} className="w-full h-[180px] rounded-[16px] mb-4" imgClassName="group-hover:scale-105 transition-transform duration-500" />
                          
                          <div className="flex-1 flex flex-col">
                            <div className="cursor-pointer" onClick={() => setSelectedItemDetail({ ...combo, cartItemTipo: 'combo' })}>
                              <h4 className="font-bold text-slate-900 text-xl mb-1">{combo.nombre}</h4>
                              <p className="text-slate-400 text-sm mb-3">{combo.descripcion}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4 justify-start">
                              {combo.incluye?.map((inc, i) => <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md">✓ {inc}</span>)}
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[#ff6250] font-black text-2xl">${combo.precio.toFixed(2)}</span>
                            </div>
                          </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* PROMOS TAB */}
            {activeTab === 'promos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {promos.map((promo, index) => {
                  return (
                    <motion.div
                      key={promo.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                    >
                      <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm cursor-pointer group flex flex-col h-full" onClick={() => addToCart({ id: promo.id, nombre: promo.titulo, precio: promo.precio_especial || 0, tipo: 'promo', foto_url: promo.foto_url || undefined, cartItemId: promo.id })}>
                          <div className="relative">
                            <div className="absolute top-0 right-0 bg-[#FA4A0C] text-white text-[10px] font-black px-4 py-1 rounded-bl-[20px] z-10 shadow-lg">PROMO</div>
                            <LazyImage src={promo.foto_url} alt={promo.titulo} className="w-full h-[220px] rounded-[18px] mb-4" imgClassName="group-hover:scale-105 transition-transform duration-700 ease-out" />
                          </div>
                          
                          <div className="flex-1 flex flex-col px-1">
                            <div className="cursor-pointer" onClick={() => setSelectedItemDetail({ ...promo, cartItemTipo: 'promo' })}>
                              <h4 className="font-extrabold text-slate-900 text-lg mb-1 leading-tight">{promo.titulo}</h4>
                              <p className="text-slate-400 text-xs mb-3 line-clamp-2">{promo.descripcion}</p>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[#FA4A0C] font-black text-xl">${promo.precio_especial?.toFixed(2)}</span>
                            </div>
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

                    {selectedItemDetail.cartItemTipo === 'combo' && selectedItemDetail.incluye && (
                      <div className="mt-4 flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incluye</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedItemDetail.incluye.map((inc: string, i: number) => (
                            <span key={i} className="text-sm font-bold bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-100">✓ {inc}</span>
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
                          cartItemId: selectedItemDetail.id
                        }
                        
                        if (selectedItemDetail.opciones && selectedItemDetail.opciones.length > 0) {
                          setSelectedItemForOptions(selectedItemDetail)
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
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow">
                <Store className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-black text-slate-800 tracking-tighter">
                Estrella<span className="text-orange-500">Delivery</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">La mejor selección gastronómica de Comitán.</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Ayuda</p>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Soporte 24/7</a>
              <a href="#" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Seguridad</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-900">Legal</p>
              <a href="/terminos" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Términos</a>
              <a href="/terminos" className="text-sm text-slate-400 hover:text-orange-500 transition-colors">Privacidad</a>
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
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={closeCart} />
        <motion.div 
          initial={{ [isMobile ? 'y' : 'x']: '100%' }} 
          animate={{ x: 0, y: 0 }} 
          exit={{ [isMobile ? 'y' : 'x']: '100%' }} 
          transition={{ type: 'spring', damping: 28, stiffness: 350 }} 
          style={{ willChange: "transform" }}
          className="fixed bottom-0 left-0 w-full h-[92vh] rounded-t-[32px] sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:h-full sm:w-[440px] sm:max-w-md sm:rounded-none bg-white z-[110] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] sm:shadow-2xl flex flex-col overflow-hidden"
        >
          
          {/* Grabber bar for mobile */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:bottom-10 sm:right-10 sm:left-auto sm:justify-end">
            <div className="w-12 h-1.5 bg-slate-300/50 rounded-full"></div>
          </div>
          
          <div className="p-6 pt-4 sm:pt-6 border-b border-slate-100/50 flex flex-col shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {checkoutStep > 1 && (
                  <button onClick={() => setCheckoutStep(prev => prev - 1)} className="p-2 bg-white rounded-full text-slate-500 hover:text-[#FA4A0C] shadow-sm transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {checkoutStep === 1 ? 'Tu Pedido' : checkoutStep === 2 ? 'Tus Datos' : checkoutStep === 3 ? 'Entrega' : 'Método de Pago'}
                  </h2>
                  <p className="text-slate-500 text-sm">{restaurante.nombre}</p>
                </div>
              </div>
              <button onClick={closeCart} className="p-2.5 bg-white rounded-full text-slate-400 hover:text-slate-700 shadow-sm"><X size={20} /></button>
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
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
                    {carrito.map((p, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-[24px] bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 rounded-[12px] overflow-hidden bg-slate-50 shrink-0">
                          <LazyImage src={p.item.foto_url} className="w-full h-full" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1">{p.item.nombre}</h4>
                          {p.item.opcionesSeleccionadas && p.item.opcionesSeleccionadas.length > 0 && (
                            <div className="mb-2">
                              {p.item.opcionesSeleccionadas.map((opt, idx) => (
                                <p key={idx} className="text-[10px] text-slate-500">+ {opt.opcion} {opt.precio_extra > 0 && `(+$${opt.precio_extra})`}</p>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-black text-[#FA4A0C]">${(p.item.precio * p.cantidad).toFixed(2)}</span>
                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-[12px] px-1 py-1">
                              <button onClick={() => removeFromCart(p.item.cartItemId)} className="p-1 rounded-md text-slate-400 hover:text-[#FA4A0C]"><Minus size={12} /></button>
                              <span className="font-bold text-xs w-3 text-center">{p.cantidad}</span>
                              <button onClick={() => addToCart(p.item)} className="p-1 bg-[#FA4A0C] rounded-md text-white"><Plus size={12} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="bg-[#FA4A0C]/5 rounded-[24px] p-5 border border-[#FA4A0C]/10 mt-6">
                      <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2"><Ticket size={16} className="text-[#FA4A0C]"/> ¿Tienes un cupón?</h4>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Código" value={cuponCliente} onChange={e => {setCuponCliente(e.target.value.toUpperCase()); setCuponValido(false); setDescuento(0)}} className="flex-1 bg-white border border-slate-200 rounded-[12px] px-3 py-2 text-sm uppercase outline-none focus:border-[#FA4A0C] font-bold" disabled={validandoCupon} />
                        <button onClick={validarCuponBtn} disabled={validandoCupon || !cuponCliente.trim()} className="bg-slate-900 text-white px-4 py-2 rounded-[12px] text-xs font-bold disabled:opacity-50">{validandoCupon ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Aplicar'}</button>
                      </div>
                      {cuponValido && <p className="text-green-600 text-[11px] font-bold mt-2 flex items-center gap-1"><CheckCircle2 size={12}/> Cupón aplicado: -$${descuento.toFixed(2)}</p>}
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
                              onClick={() => setTipoEntrega(tipoEntrega === 'domicilio' ? null : 'domicilio')} 
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
                        <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-slate-50 p-4 rounded-[20px] border border-slate-200 mt-2 overflow-hidden shadow-sm flex flex-col gap-4">
                          
                          {/* MAPA INTERACTIVO CON BOTON INTEGRADO */}
                          <div className="w-full h-56 rounded-[16px] overflow-hidden border border-slate-200 shadow-inner bg-slate-100 relative">
                            
                            {/* Botón Flotante de Auto-ubicación vibrante (Estilo Rappi) */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[80%] max-w-[250px]">
                              <motion.button 
                                whileTap={{ scale: 0.95 }} 
                                onClick={obtenerUbicacionGPS} 
                                disabled={buscandoGPS}
                                className="w-full bg-[#FA4A0C] hover:bg-[#E03A00] text-white py-3 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(250,74,12,0.4)] disabled:opacity-80 transition-colors"
                              >
                                {buscandoGPS ? (
                                  <>
                                    <Loader2 size={18} className="animate-spin" /> 
                                    <span>Ubicando...</span>
                                  </>
                                ) : (
                                  <>
                                    <LocateFixed size={18} className="animate-pulse" /> 
                                    Mi Ubicación
                                  </>
                                )}
                              </motion.button>
                            </div>

                            {isGoogleMapsLoaded ? (
                              <div className="relative w-full h-full">
                                <GoogleMap
                                  mapContainerStyle={{ width: '100%', height: '100%' }}
                                  center={ubicacionGPS || (restaurante?.lat && restaurante?.lng ? { lat: restaurante.lat, lng: restaurante.lng } : { lat: 16.2516, lng: -92.1332 })}
                                  zoom={ubicacionGPS ? 16 : 14}
                                  onLoad={(map) => setMapInstance(map)}
                                  onDragEnd={handleMapDragEnd}
                                  options={{ 
                                    disableDefaultUI: true, 
                                    zoomControl: false, // Desactivado para vista más limpia
                                    gestureHandling: 'greedy'
                                  }}
                                >
                                  {ubicacionGPS && !directionsResponse && (
                                    <DirectionsService
                                      options={{
                                        destination: ubicacionGPS,
                                        origin: (restaurante.lat && restaurante.lng)
                                          ? { lat: restaurante.lat, lng: restaurante.lng }
                                          : (restaurante.direccion || `${restaurante.nombre}, México`),
                                        travelMode: google.maps.TravelMode.DRIVING
                                      }}
                                      callback={(response, status) => {
                                        if (status === 'OK' && response !== null) {
                                          setDirectionsResponse(response)
                                        }
                                      }}
                                    />
                                  )}
                                  {directionsResponse && (
                                    <DirectionsRenderer options={{ directions: directionsResponse, suppressMarkers: true, preserveViewport: true }} />
                                  )}
                                  {directionsResponse && restaurante.lat && restaurante.lng && (
                                    <Marker 
                                      position={{ lat: restaurante.lat, lng: restaurante.lng }}
                                      icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
                                      title="Restaurante"
                                    />
                                  )}
                                </GoogleMap>
                                
                                {/* Pin fijo central (Estilo Rappi/Uber) */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                                  <MapPin className="text-[#FA4A0C] w-12 h-12 fill-[#FA4A0C] animate-bounce-short" style={{ filter: 'drop-shadow(0px 5px 5px rgba(0,0,0,0.3))' }} />
                                  <div className="w-3 h-1 bg-black/40 rounded-[100%] mx-auto -mt-1 blur-[1px]"></div>
                                </div>
                                
                                {/* Overlay text superior */}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 text-slate-800 text-xs font-bold px-4 py-2 rounded-full shadow-md backdrop-blur-md pointer-events-none z-10 text-center whitespace-nowrap border border-slate-200">
                                  Mueve el mapa para ajustar el pin
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Cargando mapa...</div>
                            )}

                            {/* Animación premium de calculandoEnvio */}
                            <AnimatePresence>
                              {(calculandoEnvio || buscandoGPS || (ubicacionGPS && !directionsResponse)) && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0 bg-white/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
                                >
                                  <motion.div
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                    className="w-14 h-14 bg-white rounded-full shadow-[0_10px_30px_rgba(250,74,12,0.3)] flex items-center justify-center mb-3 border-2 border-[#FA4A0C]/20 relative"
                                  >
                                    <div className="absolute inset-0 rounded-full border-2 border-[#FA4A0C] border-t-transparent animate-spin opacity-50"></div>
                                    <Truck size={24} className="text-[#FA4A0C]" />
                                  </motion.div>
                                  <motion.div 
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
                                  >
                                    <Loader2 size={14} className="animate-spin text-[#FA4A0C]" />
                                    <span>Calculando envío...</span>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>




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
                        
                        <button onClick={() => setMetodoPago('en_linea')} className={`w-full py-5 px-6 rounded-[24px] border-2 font-bold flex items-center gap-4 transition-all ${metodoPago === 'en_linea' ? 'border-[#FA4A0C] bg-[#FA4A0C]/5 text-[#FA4A0C]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${metodoPago === 'en_linea' ? 'bg-[#FA4A0C]/20' : 'bg-slate-100'}`}>💳</div>
                          <div className="text-left flex-1">
                            <span className="block text-base">Tarjeta o SPEI</span>
                            <span className="block text-xs opacity-70 mt-0.5">Pago seguro en línea por Conekta</span>
                          </div>
                          {metodoPago === 'en_linea' && <CheckCircle2 size={24} className="text-[#FA4A0C]" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {carrito.length > 0 && (
            <div className="p-4 border-t border-slate-100/50 shrink-0 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10 relative">
              <div className="flex flex-col gap-3">
                {tipoEntrega === 'domicilio' && (
                  <div className="flex justify-between items-center bg-[#FA4A0C]/5 border border-[#FA4A0C]/20 px-3 py-2 rounded-xl mb-1 shadow-sm">
                    <span className="text-[#FA4A0C] font-black flex items-center gap-2 text-[11px] uppercase tracking-wider">
                      <Truck size={16} /> Costo de Envío
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={calculandoEnvio ? 'calc' : fueraDeCobertura ? 'out' : 'price'}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`font-black text-sm ${fueraDeCobertura ? 'text-red-500' : 'text-[#FA4A0C]'}`}
                      >
                        {calculandoEnvio ? (
                          <span className="flex items-center gap-1"><Loader2 size={14} className="animate-spin inline" /> ...</span>
                        ) : fueraDeCobertura ? (
                          'Sin cobertura'
                        ) : (
                          `+ $${costoEnvio.toFixed(2)}`
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
                <div className="flex justify-between items-end px-2 mt-1">
                  <span className="text-slate-900 font-bold">Total a pagar</span>
                  <span className="text-3xl font-black text-[#FA4A0C]">${total.toFixed(2)}</span>
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
                      setCheckoutStep(prev => prev + 1)
                    }} 
                    className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-lg flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                  >
                    {checkoutStep === 1 ? 'Continuar a Tus Datos' : checkoutStep === 2 ? 'Continuar a Entrega' : 'Ir al Pago'}
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handlePedir} disabled={procesando || calculandoEnvio} className="w-full bg-[#FA4A0C] text-white py-4 rounded-[20px] font-black text-lg flex items-center justify-center gap-2 hover:bg-[#ff551b] transition-all disabled:opacity-50 shadow-xl shadow-[#FA4A0C]/20">
                    {procesando ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirmar Pedido</>}
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </>
    )}

      {/* MODAL DE OPCIONES DE PRODUCTO */}
      <AnimatePresence>
        {selectedItemForOptions && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedItemForOptions(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-lg bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="w-full h-[200px] bg-slate-50 relative shrink-0">
                  <LazyImage src={selectedItemForOptions.foto_url} alt={selectedItemForOptions.nombre} className="w-full h-full" imgClassName="object-contain" />
                  <button onClick={() => setSelectedItemForOptions(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-600 shadow-sm z-10">
                    <X size={20} />
                  </button>
                </div>
              <div className="p-6 shrink-0 border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900">{selectedItemForOptions.nombre}</h3>
                <p className="text-slate-500 text-sm mt-1">{selectedItemForOptions.descripcion}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(selectedItemForOptions.opciones || []).map((grupo, gIdx) => {
                  const seleccionados = selectedOptionsState[grupo.titulo] || {};
                  const countSelected = Object.values(seleccionados).filter(Boolean).length;
                  
                  return (
                    <div key={gIdx}>
                      <div className="flex justify-between items-baseline mb-3">
                        <h4 className="font-bold text-slate-800 text-lg">{grupo.titulo}</h4>
                        {grupo.requerido && countSelected === 0 ? (
                          <span className="text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-500 px-2 py-1 rounded-md">Requerido</span>
                        ) : grupo.maximo_selecciones > 1 ? (
                          <span className="text-[11px] text-slate-400 font-bold">Máx {grupo.maximo_selecciones}</span>
                        ) : null}
                      </div>
                      
                      <div className="space-y-2">
                        {grupo.opciones.map((opc, oIdx) => {
                          const isSelected = !!seleccionados[opc.nombre];
                          
                          const toggleOpcion = () => {
                            setSelectedOptionsState(prev => {
                              const groupState = { ...(prev[grupo.titulo] || {}) };
                              if (grupo.maximo_selecciones === 1) {
                                // Radio behavior
                                return { ...prev, [grupo.titulo]: { [opc.nombre]: true } }
                              } else {
                                // Checkbox behavior
                                if (isSelected) {
                                  delete groupState[opc.nombre];
                                } else {
                                  if (Object.values(groupState).filter(Boolean).length >= grupo.maximo_selecciones) return prev; // Limit reached
                                  groupState[opc.nombre] = true;
                                }
                                return { ...prev, [grupo.titulo]: groupState }
                              }
                            });
                          };

                          return (
                            <label key={oIdx} className={`flex items-center justify-between p-3 rounded-[20px] border cursor-pointer transition-all ${isSelected ? 'border-[#FA4A0C] bg-[#FA4A0C]/10' : 'border-slate-200 hover:border-slate-300'}`}>
                              <div className="flex items-center gap-3">
                                <div className="relative flex items-center justify-center">
                                  <input 
                                    type={grupo.maximo_selecciones === 1 ? 'radio' : 'checkbox'} 
                                    checked={isSelected}
                                    onChange={toggleOpcion}
                                    className="w-5 h-5 accent-[#FA4A0C] cursor-pointer"
                                  />
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{opc.nombre}</span>
                              </div>
                              {opc.precio_extra > 0 && <span className="text-sm font-bold text-slate-500">+${(opc.precio_extra).toFixed(2)}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Validar requeridos
                    const faltanRequeridos = (selectedItemForOptions.opciones || []).some(g => {
                      if (!g.requerido) return false;
                      const sel = selectedOptionsState[g.titulo] || {};
                      return Object.values(sel).filter(Boolean).length === 0;
                    });

                    if (faltanRequeridos) {
                      showToast('Faltan opciones', 'Por favor selecciona las opciones requeridas', 'error');
                      return;
                    }

                    // Calcular precio total y armar opciones
                    let precioExtra = 0;
                    const opcionesSel: OpcionSeleccionada[] = [];
                    
                    (selectedItemForOptions.opciones || []).forEach(g => {
                      g.opciones.forEach(o => {
                        if (selectedOptionsState[g.titulo]?.[o.nombre]) {
                          precioExtra += o.precio_extra;
                          opcionesSel.push({ grupo: g.titulo, opcion: o.nombre, precio_extra: o.precio_extra });
                        }
                      });
                    });

                    const hashId = selectedItemForOptions.id + '_' + opcionesSel.map(o => o.opcion).sort().join('_');
                    
                    const itemToAdd: CartItem = {
                      id: selectedItemForOptions.id,
                      cartItemId: hashId,
                      nombre: selectedItemForOptions.nombre,
                      precio: selectedItemForOptions.precio + precioExtra,
                      tipo: 'item',
                      opcionesSeleccionadas: opcionesSel
                    };
                    
                    addToCart({ ...itemToAdd, foto_url: selectedItemForOptions.foto_url || undefined });
                    setSelectedItemForOptions(null);
                    showToast('Agregado', `${selectedItemForOptions.nombre} añadido al carrito`);
                  }}
                  className="w-full bg-[#FA4A0C] hover:bg-[#fa5a20] text-white font-black py-4 rounded-[24px] shadow-lg shadow-[#FA4A0C]/20 transition-colors flex items-center justify-between px-6"
                >
                  <span>Añadir al Carrito</span>
                  <span>${(
                    selectedItemForOptions.precio + 
                    (selectedItemForOptions.opciones || []).reduce((sum, g) => {
                      return sum + g.opciones.reduce((s2, o) => {
                        return s2 + (selectedOptionsState[g.titulo]?.[o.nombre] ? o.precio_extra : 0);
                      }, 0);
                    }, 0)
                  ).toFixed(2)}</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    {/* Toast notification */}
    <AnimatePresence>
      {toastMsg && (
        <motion.div 
          key="global-toast"
          initial={{ y: -50, opacity: 0, x: "-50%" }} 
          animate={{ y: 0, opacity: 1, x: "-50%" }} 
          exit={{ y: -50, opacity: 0, x: "-50%", scale: 0.9 }} 
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className={`fixed top-8 sm:top-12 left-1/2 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${toastMsg.type === 'error' ? 'bg-red-500/95 border-red-400' : toastMsg.type === 'loading' ? 'bg-slate-900/95 border-slate-700' : 'bg-green-600/95 border-green-500 text-white'}`}
        >
          {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5 text-white" /> : toastMsg.type === 'loading' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
          <div>
            <p className="text-white text-sm font-bold leading-none mb-0.5">{toastMsg.title}</p>
            {toastMsg.message && <p className="text-white/80 text-[11px] leading-none">{toastMsg.message}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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

    </div>
  )
}



