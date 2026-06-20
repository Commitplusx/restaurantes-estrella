import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Restaurante, MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../lib/supabase'
import {
  Store,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  AlertCircle,
  Loader2,
  Star,
  Flame,
  Clock,
  MapPin,
  ChevronLeft,
  X,
  Ticket,
  CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

export function PublicMenuView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)

  const [categorias, setCategorias] = useState<MenuCategoria[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [combos, setCombos] = useState<MenuCombo[]>([])
  const [promos, setPromos] = useState<MenuPromocion[]>([])

  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'menu' | 'combos' | 'promos'>('menu')

  // Estado del carrito y drawer
  const [carrito, setCarrito] = useState<{ item: CartItem & { foto_url?: string }, cantidad: number }[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [cuponCliente, setCuponCliente] = useState('')
  const [telError, setTelError] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'en_linea'>('efectivo')
  const [toastMsg, setToastMsg] = useState<{ title: string, message?: string, type?: 'success' | 'error' | 'loading' } | null>(null)

  // Estado para validación de cupones
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [cuponValido, setCuponValido] = useState(false)
  const [descuento, setDescuento] = useState(0)

  // Estados del nuevo carrito paso a paso
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'tienda' | null>(null)
  const [direccionEntrega, setDireccionEntrega] = useState('')

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : true

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

      if (error || !data?.ok) {
        showToast('Cupón Inválido', data?.error || 'El cupón no es válido o ya expiró', 'error')
        setCuponValido(false)
        setDescuento(0)
      } else {
        showToast('Cupón Aplicado', `¡Se descontarán $${data.monto.toFixed(2)} de tu orden!`, 'success')
        setCuponValido(true)
        setDescuento(data.monto)
      }
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurantes', filter: `id=eq.${actualRestId}` }, () => {
          fetchMenuData(true)
        })
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

  const getCantidadTotal = (productId: string, tipo: 'item' | 'combo' | 'promo') => {
    return carrito.filter(p => p.item.id === productId && p.item.tipo === tipo).reduce((sum, p) => sum + p.cantidad, 0)
  }

  const subtotal = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)

  const total = Math.max(0, subtotal - descuento)

  // Bug #5: reset fields when closing cart without ordering
  const closeCart = () => {
    setIsCartOpen(false)
    setTimeout(() => setCheckoutStep(1), 300)
  }

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      showToast('Error', 'Tu navegador no soporta geolocalización', 'error')
      return
    }
    showToast('Buscando...', 'Obteniendo tu ubicación exacta...', 'success')
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const mapLink = `https://www.google.com/maps?q=${lat},${lng}`
      setDireccionEntrega(prev => prev ? prev + '\nUbicación GPS: ' + mapLink : 'Ubicación GPS: ' + mapLink)
      showToast('¡Listo!', 'Ubicación agregada', 'success')
    }, () => {
      showToast('Error', 'No pudimos acceder a tu ubicación. Asegúrate de dar permisos.', 'error')
    })
  }

  const handlePedir = async () => {
    if (!restaurante || carrito.length === 0) return
    if (!clienteNombre.trim()) {
      showToast('Falta el nombre', 'Por favor ingresa tu nombre para continuar', 'error')
      return
    }
    // Bug #1: proper phone validation
    const telLimpio = clienteTel.replace(/\D/g, '')
    if (telLimpio.length < 10) {
      setTelError(true)
      return
    }
    setTelError(false)

    setProcesando(true)
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
      ? `\n\n🛵 *Tipo de entrega:* A domicilio\n📍 *Dirección:* ${direccionEntrega.trim() || 'No especificada'}`
      : `\n\n🏪 *Tipo de entrega:* Recoger en tienda`
      
    const pedidoCompleto = pedidoDetalles + detallesEntregaStr

    try {
      await supabase.from('pedidos').insert([{
        cliente_tel: telLimpio,
        cliente_nombre: clienteNombre.trim(),
        restaurante: restaurante.nombre,
        descripcion: pedidoCompleto,
        estado: metodoPago === 'en_linea' ? 'pendiente_pago' : 'asignado',
        wb_message_id: ticketId,
        metodo_pago: metodoPago,
        precio: total
      }])
    } catch (err) { console.warn('Intercepción db fallida:', err) }

    if (metodoPago === 'en_linea') {
      try {
        // Bug 1 fix: aplicar descuento proporcional en los lineItems para que Conekta cobre el total correcto
        const subtotalBruto = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
        const factorDescuento = subtotalBruto > 0 ? total / subtotalBruto : 1
        
        const lineItems = carrito.map(p => ({
          name: p.item.nombre,
          price: parseFloat((p.item.precio * factorDescuento).toFixed(2)),
          quantity: p.cantidad
        }))
        
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
            returnUrl: window.location.origin + '/success'
          })
        })
        
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Error al generar link de Conekta')
        }
        
        // Bug 7 fix: detectar si el URL llegó vacío y avisar al usuario
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
          return
        } else {
          throw new Error('Conekta no devolvió un link de pago válido. Intenta nuevamente.')
        }
      } catch (err: any) {
        console.error('Error conekta:', err)
        showToast('Error', err.message || 'No se pudo generar el pago en línea', 'error')
        setProcesando(false)
        return
      }
    } else {
      const textoCupon = cuponValido ? `\n🎁 *Cupón aplicado:* ${cuponCliente.trim()} (-$${descuento.toFixed(2)})` : cuponCliente.trim() ? `\n🎟️ *Cupón a canjear:* ${cuponCliente.trim()}` : ''
      const mensaje = `¡Hola *${restaurante.nombre}*! 👋\nSoy *${clienteNombre.trim()}*, me gustaría hacer el siguiente pedido:\n\n${pedidoCompleto}${textoCupon}\n\n*Forma de pago:* ${metodoPago === 'efectivo' ? 'Efectivo 💵' : 'Tarjeta 💳'}\n\n_(Ticket Web: #${ticketId})_`

      // se envia el mensaje al restaurante
      const numeroRestaurante = restaurante.telefono ? restaurante.telefono.replace(/\D/g, '') : ''
      const waUrl = `https://wa.me/${numeroRestaurante}?text=${encodeURIComponent(mensaje)}`

      setProcesando(false)
      setIsCartOpen(false)
      setCarrito([])
      setClienteNombre('')
      setClienteTel('')
      setCuponCliente('')
      setCuponValido(false)
      setDescuento(0)
      window.open(waUrl, '_blank')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F6F6F9] font-sans pb-32">
      {/* Topbar Skeleton */}
      <header className="sticky top-0 bg-white/80 border-b border-slate-50/50 py-3 px-4 md:px-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 animate-pulse rounded-[20px] shrink-0" />
        <div className="flex-1">
          <div className="w-32 h-5 bg-slate-200 animate-pulse rounded-md mb-1" />
          <div className="w-24 h-3 bg-slate-200 animate-pulse rounded-md hidden sm:block" />
        </div>
        <div className="w-24 h-10 bg-slate-200 animate-pulse rounded-[20px]" />
      </header>

      {/* Hero Skeleton */}
      <div className="relative w-full h-[30vh] md:h-[45vh] bg-slate-200 animate-pulse" />

      <div className="max-w-[1000px] mx-auto px-6 relative -mt-16 md:-mt-24 z-10">
        {/* Info Card Skeleton */}
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-8 flex flex-col md:flex-row gap-6 md:items-center">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-slate-200 animate-pulse shadow-sm shrink-0" />
          <div className="flex-1">
            <div className="w-48 h-8 bg-slate-200 animate-pulse rounded-lg mb-3" />
            <div className="w-64 h-4 bg-slate-200 animate-pulse rounded-md mb-4" />
            <div className="flex gap-4">
              <div className="w-16 h-4 bg-slate-200 animate-pulse rounded-md" />
              <div className="w-16 h-4 bg-slate-200 animate-pulse rounded-md" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-8 mb-10 border-b border-slate-200/50 pb-4">
          <div className="w-20 h-6 bg-slate-200 animate-pulse rounded-md" />
          <div className="w-20 h-6 bg-slate-200 animate-pulse rounded-md" />
          <div className="w-20 h-6 bg-slate-200 animate-pulse rounded-md" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white/80 p-4 rounded-[32px] flex gap-4 items-center">
              <div className="w-24 h-24 rounded-[24px] bg-slate-200 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="w-3/4 h-5 bg-slate-200 animate-pulse rounded-md mb-2" />
                <div className="w-1/4 h-5 bg-slate-200 animate-pulse rounded-md mb-3" />
                <div className="w-full h-3 bg-slate-200 animate-pulse rounded-md mb-1" />
                <div className="w-2/3 h-3 bg-slate-200 animate-pulse rounded-md mb-4" />
                <div className="flex justify-between items-center mt-2">
                  <div className="w-20 h-8 bg-slate-200 animate-pulse rounded-[20px]" />
                </div>
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
    <div className="min-h-screen bg-[#F6F6F9] text-slate-900 selection:bg-[#FA4A0C]/20 font-sans pb-32">

      {/* TOPBAR */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-50/50 py-3 px-4 md:px-10 flex items-center gap-3 shadow-sm">
        <Link
          to="/"
          className="p-2 bg-slate-100 hover:bg-[#FF7A6A] hover:text-white text-slate-500 rounded-[20px] transition-all shrink-0"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base md:text-lg font-black text-slate-900 truncate">{restaurante.nombre}</h1>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:flex items-center gap-1">
            <MapPin size={11} /> {restaurante.direccion || 'Comitán, Chiapas'}
          </p>
        </div>
        {/* Carrito: visible en header en todo momento */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-2 bg-[#FF7A6A] text-white px-4 py-2 rounded-[20px] font-bold shadow-lg shadow-[#FF7A6A]/20 hover:bg-[#ff6250] transition-all relative text-sm"
        >
          <ShoppingBag size={16} />
          <span className="hidden sm:inline">Carrito</span>
          <AnimatePresence mode="popLayout">
            {cartCount > 0 && (
              <motion.span 
                key={cartCount}
                initial={{ scale: 2, rotate: 15, backgroundColor: '#fcd34d', color: '#000' }}
                animate={{ scale: 1, rotate: 0, backgroundColor: '#0f172a', color: '#fff' }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ml-0.5"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </header>

      {/* HERO FULL BLEED (Dribbble Style) */}
      <div className="relative w-full h-[20vh] md:h-[25vh] bg-slate-900 overflow-hidden">
        {restaurante.foto_fachada_url ? (
          <img
            src={restaurante.foto_fachada_url}
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            alt={restaurante.nombre}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 opacity-60 mix-blend-overlay" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#F6F6F9] via-[#F6F6F9]/20 to-transparent" />
      </div>

      <div className="max-w-[1000px] mx-auto px-6 relative -mt-12 md:-mt-16 z-10">

        {/* RESTAURANT INFO CARD */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-white mb-6 text-center md:text-left"
        >
          {/* Logo (opcional, extraemos de la foto si no hay otra) */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden shadow-xl border-[6px] border-white bg-orange-50 shrink-0 flex items-center justify-center -mt-16 md:-mt-20">
            {restaurante.foto_fachada_url ? (
               <img src={restaurante.foto_fachada_url} className="w-full h-full object-cover" alt="Logo" />
            ) : (
               <Store className="w-12 h-12 text-orange-300" />
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
              {restaurante.nombre}
            </h1>
            <p className="text-slate-500 font-medium mb-4 flex items-center justify-center md:justify-start gap-2">
               <MapPin size={16} /> {restaurante.direccion || 'Comitán, Chiapas'}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="flex items-center gap-1.5 bg-[#FA4A0C]/10 text-[#FA4A0C] font-black text-xs px-4 py-2 rounded-full border border-[#FA4A0C]/20">
                <Clock size={14} /> {restaurante.hora_apertura?.slice(0, 5)} - {restaurante.hora_cierre?.slice(0, 5)}
              </span>
              {restaurante.categorias?.slice(0,2).map((cat, idx) => (
                <span key={idx} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-2 rounded-full">
                  {cat || 'Categoría'}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* TABS DE NAVEGACIÓN (Sticky Clean UI) */}
        {(combos.length > 0 || promos.length > 0) && (
          <div className="sticky top-[70px] z-40 bg-[#F6F6F9]/90 backdrop-blur-md pt-4 pb-2 mb-8 border-b border-slate-200/50">
            <div className="flex overflow-x-auto hide-scrollbar gap-8">
              <button
                onClick={() => setActiveTab('menu')}
                className={`pb-3 text-[17px] font-semibold transition-all relative shrink-0 ${activeTab === 'menu' ? 'text-[#FA4A0C]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                🍽️ Menú
                {activeTab === 'menu' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FA4A0C] rounded-t-full" />}
              </button>
              {combos.length > 0 && (
                <button
                  onClick={() => setActiveTab('combos')}
                  className={`pb-3 text-[17px] font-semibold transition-all relative shrink-0 ${activeTab === 'combos' ? 'text-[#FA4A0C]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ⭐ Combos
                  {activeTab === 'combos' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FA4A0C] rounded-t-full" />}
                </button>
              )}
              {promos.length > 0 && (
                <button
                  onClick={() => setActiveTab('promos')}
                  className={`pb-3 text-[17px] font-semibold transition-all relative shrink-0 ${activeTab === 'promos' ? 'text-[#FA4A0C]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  🔥 Promos
                  {activeTab === 'promos' && <motion.div layoutId="menuTab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#FA4A0C] rounded-t-full" />}
                </button>
              )}
            </div>
          </div>
        )}

            {/* PRODUCT CATEGORIES (MENU TAB) */}
            {activeTab === 'menu' && (
              <div>
                {categorias.map(cat => {
                  const catItems = items.filter(i => i.categoria_id === cat.id)
                  if (catItems.length === 0) return null
                  return (
                    <motion.div
                      key={cat.id}
                      className="mb-12"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h3 className="text-[22px] font-extrabold text-slate-900 mb-6 flex items-center gap-3 tracking-tight">
                        <span className="w-1.5 h-6 bg-[#FA4A0C] rounded-full" />
                        {cat.emoji} {cat.nombre}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {catItems.map((item, index) => {
                          const cartItem = { id: item.id, nombre: item.nombre, precio: item.precio, tipo: 'item' as const, foto_url: item.foto_url || undefined }
                          const cantTotal = getCantidadTotal(item.id, 'item')
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                              className="bg-white/80 backdrop-blur-sm p-4 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(250,74,12,0.15)] hover:-translate-y-1 transition-all flex gap-4 items-center group border border-white hover:border-orange-50/50"
                            >
                              <div className="w-24 h-24 rounded-[24px] overflow-hidden bg-slate-50 shrink-0 cursor-pointer shadow-inner" onClick={() => {
                                if (item.opciones && item.opciones.length > 0) {
                                  setSelectedItemForOptions(item)
                                  setSelectedOptionsState({})
                                } else {
                                  addToCart({ ...cartItem, cartItemId: item.id })
                                }
                              }}>
                                {item.foto_url ? (
                                  <img src={item.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={item.nombre} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-200"><Store size={32} /></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-1 cursor-pointer" onClick={() => {
                                  if (item.opciones && item.opciones.length > 0) {
                                    setSelectedItemForOptions(item)
                                    setSelectedOptionsState({})
                                  } else {
                                    addToCart({ ...cartItem, cartItemId: item.id })
                                  }
                                }}>
                                  <h4 className="font-bold text-slate-900 text-lg">{item.nombre}</h4>
                                  <span className="text-[#ff6250] font-black text-lg">${item.precio.toFixed(2)}</span>
                                </div>
                                <p className="text-slate-400 text-xs md:text-sm mb-4 line-clamp-2 leading-relaxed">{item.descripcion}</p>
                                <div className="flex justify-between items-center">
                                  {item.opciones && item.opciones.length > 0 ? (
                                    <button
                                      onClick={() => {
                                        setSelectedItemForOptions(item)
                                        setSelectedOptionsState({})
                                      }}
                                      className="bg-slate-100 hover:bg-[#FF7A6A]/10 text-slate-700 hover:text-[#ff6250] font-bold text-xs px-6 py-2.5 rounded-[20px] transition-all flex items-center gap-2"
                                    >
                                      Opciones {cantTotal > 0 && <span className="bg-[#FF7A6A] text-white px-1.5 py-0.5 rounded-md text-[10px]">{cantTotal}</span>}
                                    </button>
                                  ) : cantTotal > 0 ? (
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-[20px] px-2 py-1 border border-slate-100">
                                      <button onClick={() => removeFromCart(item.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-[#ff6250]"><Minus size={14} /></button>
                                      <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                      <button onClick={() => addToCart({ ...cartItem, cartItemId: item.id })} className="p-1.5 bg-[#FF7A6A] rounded-lg text-white"><Plus size={14} /></button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addToCart({ ...cartItem, cartItemId: item.id })}
                                      className="bg-slate-900 hover:bg-[#FA4A0C] text-white font-bold text-xs px-5 py-2.5 rounded-[20px] transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
                                    >
                                      <Plus size={16} /> Añadir
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
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
              <div className="grid gap-6">
                {combos.map(combo => {
                  const cartItem = { id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo' as const, foto_url: combo.foto_url || undefined, cartItemId: combo.id }
                  const cantTotal = getCantidadTotal(combo.id, 'combo')
                  return (
                    <motion.div
                      key={combo.id}
                      className="bg-white p-5 rounded-[40px] border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(255,122,106,0.12)] hover:-translate-y-1 transition-all flex flex-col md:flex-row gap-6 items-center group relative"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="w-full md:w-36 h-36 rounded-[24px] overflow-hidden bg-slate-50 shrink-0">
                        {combo.foto_url ? (
                          <img src={combo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={combo.nombre} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200"><Star size={40} /></div>
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-xl mb-1">{combo.nombre}</h4>
                        <p className="text-slate-400 text-sm mb-3">{combo.descripcion}</p>
                        <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                          {combo.incluye?.map((inc, i) => <span key={i} className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md">✓ {inc}</span>)}
                        </div>
                        <div className="flex items-center justify-between mt-2 w-full">
                          <span className="text-[#ff6250] font-black text-2xl">${combo.precio.toFixed(2)}</span>
                          <div>
                            {cantTotal > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-[20px] px-2 py-1">
                                <button onClick={() => removeFromCart(combo.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-[#ff6250]"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-[#FF7A6A] rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-[#FF7A6A] text-white font-bold text-xs px-6 py-2.5 rounded-[20px] transition-all">Añadir</button>
                            )}
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
              <div className="grid md:grid-cols-2 gap-6">
                {promos.map((promo, index) => {
                  const cartItem = { id: promo.id, nombre: promo.titulo, precio: promo.precio_especial || 0, tipo: 'promo' as const, foto_url: promo.foto_url || undefined, cartItemId: promo.id }
                  const cantTotal = getCantidadTotal(promo.id, 'promo')
                  return (
                    <motion.div
                      key={promo.id}
                      className="bg-white/80 backdrop-blur-sm p-4 rounded-[32px] border border-[#FA4A0C]/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(250,74,12,0.15)] flex flex-col md:flex-row gap-4 items-center group relative overflow-hidden transition-all"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                    >
                      <div className="absolute top-0 right-0 bg-[#FA4A0C] text-white text-[10px] font-black px-4 py-1 rounded-bl-[20px] z-10 shadow-lg">PROMO</div>
                      <div className="w-full md:w-32 h-32 rounded-[24px] overflow-hidden bg-slate-50 shrink-0">
                        {promo.foto_url ? (
                          <img src={promo.foto_url} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" alt={promo.titulo} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200"><Flame size={40} className="text-[#FA4A0C]/50" /></div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <h4 className="font-extrabold text-slate-900 text-lg mb-1 leading-tight">{promo.titulo}</h4>
                        <p className="text-slate-400 text-xs mb-3 line-clamp-2">{promo.descripcion}</p>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[#FA4A0C] font-black text-xl">${promo.precio_especial?.toFixed(2)}</span>
                          <div>
                            {cantTotal > 0 ? (
                              <div className="flex items-center gap-3 bg-slate-100 rounded-[20px] px-2 py-1">
                                <button onClick={() => removeFromCart(promo.id)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-[#FA4A0C]"><Minus size={14} /></button>
                                <span className="font-bold text-sm w-4 text-center">{cantTotal}</span>
                                <button onClick={() => addToCart(cartItem)} className="p-1.5 bg-[#FA4A0C] rounded-lg text-white"><Plus size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(cartItem)} className="bg-slate-900 hover:bg-[#FA4A0C] text-white font-bold text-xs px-5 py-2.5 rounded-[20px] transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2"><Plus size={16}/> Añadir</button>
                            )}
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
      {/* Floating Cart Button en Mobile */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden"
          >
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="bg-[#FA4A0C] text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-[#FA4A0C]/30 flex items-center gap-3 text-sm overflow-hidden"
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
          transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
          className="fixed bottom-0 left-0 w-full h-[92vh] rounded-t-[32px] sm:top-0 sm:bottom-auto sm:right-0 sm:left-auto sm:h-full sm:w-[440px] sm:max-w-md sm:rounded-none bg-white/95 backdrop-blur-xl z-[110] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-2xl flex flex-col overflow-hidden"
        >
          
          {/* Grabber bar for mobile */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
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
                    {checkoutStep === 1 ? 'Tu Pedido' : checkoutStep === 2 ? 'Tus Datos' : 'Método de Pago'}
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
                      <div key={i} className="flex gap-4 p-4 rounded-[24px] bg-slate-50 border border-slate-100">
                        <div className="w-16 h-16 rounded-[16px] overflow-hidden bg-slate-100/50 shrink-0">
                          {p.item.foto_url ? <img src={p.item.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-100"><Store size={20} className="text-slate-300"/></div>}
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

                {/* PASO 2: DATOS DE ENTREGA */}
                {checkoutStep === 2 && (
                  <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu Nombre</label>
                      <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full bg-slate-50 border border-slate-200 rounded-[16px] px-4 py-3 outline-none focus:border-[#FA4A0C] focus:bg-white transition-all font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu Teléfono (WhatsApp)</label>
                      <input type="tel" value={clienteTel} onChange={(e) => {setClienteTel(e.target.value); setTelError(false);}} placeholder="10 dígitos" maxLength={10} className={`w-full bg-slate-50 border rounded-[16px] px-4 py-3 outline-none transition-all font-medium ${telError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-slate-200 focus:border-[#FA4A0C] focus:bg-white'}`} />
                      {telError && <p className="text-red-500 text-[10px] font-bold mt-1.5 flex items-center gap-1"><AlertCircle size={10} /> Ingrese un número a 10 dígitos válido</p>}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
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
                              className={`flex-1 py-4 px-4 rounded-[16px] border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${tipoEntrega === 'domicilio' ? 'border-[#FA4A0C] bg-[#FA4A0C] text-white shadow-lg shadow-[#FA4A0C]/30' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                              <span className="text-2xl">🛵</span>
                              <span className="text-xs">{tipoEntrega === 'domicilio' ? 'Elegiste A Domicilio (toca para cambiar)' : 'A Domicilio'}</span>
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
                              className={`flex-1 py-4 px-4 rounded-[16px] border-2 font-bold flex flex-col items-center justify-center gap-2 transition-all ${tipoEntrega === 'tienda' ? 'border-[#FA4A0C] bg-[#FA4A0C] text-white shadow-lg shadow-[#FA4A0C]/30' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}
                            >
                              <span className="text-2xl">🏪</span>
                              <span className="text-xs">{tipoEntrega === 'tienda' ? 'Elegiste Recoger en Tienda (toca para cambiar)' : 'Recoger en Tienda'}</span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                    <AnimatePresence>
                      {tipoEntrega === 'domicilio' && (
                        <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className="bg-slate-50 p-4 rounded-[20px] border border-slate-200 mt-2 overflow-hidden">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección de Entrega</label>
                          <textarea 
                            value={direccionEntrega} 
                            onChange={(e) => setDireccionEntrega(e.target.value)} 
                            placeholder="Escribe tu calle, número, colonia, y referencias..." 
                            className="w-full bg-white border border-slate-200 rounded-[12px] px-3 py-3 text-sm outline-none focus:border-[#FA4A0C] resize-none h-24 mb-3"
                          />
                          <motion.button whileTap={{ scale: 0.95 }} onClick={obtenerUbicacionGPS} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-[12px] font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                            <MapPin size={16} /> Usar mi ubicación GPS actual
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* PASO 3: PAGO */}
                {checkoutStep === 3 && (
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
            <div className="p-6 border-t border-slate-100/50 shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-bold text-slate-700">${subtotal.toFixed(2)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between items-center mb-2 text-green-600">
                  <span className="font-bold flex items-center gap-1"><Ticket size={14}/> Descuento</span>
                  <span className="font-bold">-${descuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end mb-6 pt-2">
                <span className="text-slate-900 font-bold">Total a pagar</span>
                <span className="text-3xl font-black text-[#FA4A0C]">${total.toFixed(2)}</span>
              </div>
              
              {checkoutStep < 3 ? (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (checkoutStep === 2 && clienteTel.replace(/\D/g, '').length !== 10) {
                      setTelError(true);
                      showToast('Atención', 'Ingresa un número a 10 dígitos', 'error');
                      return;
                    }
                    if (checkoutStep === 2 && !clienteNombre.trim()) {
                      showToast('Atención', 'Dinos tu nombre', 'error');
                      return;
                    }
                    if (checkoutStep === 2 && !tipoEntrega) {
                      showToast('Atención', 'Selecciona cómo quieres recibir tu pedido', 'error');
                      return;
                    }
                    if (checkoutStep === 2 && tipoEntrega === 'domicilio' && !direccionEntrega.trim()) {
                      showToast('Atención', 'Ingresa tu dirección de entrega', 'error');
                      return;
                    }
                    setCheckoutStep(prev => prev + 1)
                  }} 
                  className="w-full bg-slate-900 text-white py-4 rounded-[20px] font-black text-lg flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-900/20"
                >
                  {checkoutStep === 1 ? 'Continuar a Tus Datos' : 'Ir al Pago'}
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handlePedir} disabled={procesando} className="w-full bg-[#FA4A0C] text-white py-4 rounded-[20px] font-black text-lg flex items-center justify-center gap-2 hover:bg-[#ff551b] transition-all disabled:opacity-50 shadow-xl shadow-[#FA4A0C]/20">
                  {procesando ? <Loader2 className="w-6 h-6 animate-spin" /> : metodoPago === 'en_linea' ? <>Ir a Pagar Seguro</> : <><MessageCircle size={22} /> Enviar Pedido por WhatsApp</>}
                </motion.button>
              )}
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
              <div className="relative w-full h-48 bg-slate-100 shrink-0">
                {selectedItemForOptions.foto_url ? (
                  <img src={selectedItemForOptions.foto_url} className="w-full h-full object-cover" alt={selectedItemForOptions.nombre} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Store size={48} /></div>
                )}
                <button onClick={() => setSelectedItemForOptions(null)} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md text-white rounded-full hover:bg-black/50 transition-colors">
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
    {toastMsg && (
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-md border ${toastMsg.type === 'error' ? 'bg-red-500/90 border-red-400' : toastMsg.type === 'loading' ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-900/90 border-slate-700'}`}>
        {toastMsg.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-200" /> : toastMsg.type === 'loading' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-green-400" />}
        <div>
          <p className="text-white text-sm font-bold leading-none mb-0.5">{toastMsg.title}</p>
          {toastMsg.message && <p className="text-slate-200 text-[11px] leading-none">{toastMsg.message}</p>}
        </div>
      </motion.div>
    )}
  </AnimatePresence>

    </div>
  )
}
