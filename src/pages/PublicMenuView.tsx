// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useCartStore } from '../store/useCartStore'
import { useHaptics } from '../hooks/useHaptics'
import { supabase } from '../lib/supabase'
// import * as h3 from 'h3-js' (movido al hook)
import type { Restaurante, MenuCategoria, MenuItem, MenuCombo, MenuPromocion } from '../lib/supabase'
import { availableOptionGroups } from '../lib/menuOptions'
import MenuOptionsDialog from '../components/MenuOptionsDialog';
import CartReplacementDialog from '../components/CartReplacementDialog';
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
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Gift,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import MenuProductCard from '../components/MenuProductCard';
import { promotionDeliveryLabel } from '../lib/promotionRules';
import RestaurantMenuIdentity from '../components/RestaurantMenuIdentity';
import RestaurantMenuHeader from '../components/RestaurantMenuHeader';
import RestaurantBranchPicker from '../components/RestaurantBranchPicker';
import { useRestaurantFamily } from '../hooks/useRestaurantFamily';
import { restaurantMenuPath, cartRestaurantOrigin, requiresNewBranchCart } from '../lib/restaurantBranches';
import MenuDetailsFrame from '../components/MenuDetailsFrame';
import './PublicMenuView.css';
import './CatalogNotice.css';
import RestaurantMenuSkeleton from '../components/RestaurantMenuSkeleton';
import { useRestaurantMenu } from '../hooks/useRestaurantMenu';
import { menuConfigurationIssue, menuTabAfterRefresh, type PublicMenuData } from '../lib/publicMenuData';
import { reconcileMenuCart } from '../lib/menuCartRefresh';
import { AnimatedCount } from '../components/AnimatedCount';
import { ScrollDepthGroup } from '../components/ParallaxMedia';
import { GoogleMap, Marker } from '@react-google-maps/api';

import MenuMapLoader from '../components/MenuMapLoader';

import { UBER_EATS_MAP_STYLE } from '../utils/mapStyles';

const PREMIUM_MAP_STYLE = UBER_EATS_MAP_STYLE;

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
  opcion_id: string;
  opcion: string;
  grupo_id: string;
  grupo: string;
  precio_extra: number;
  menu_item_id?: string;
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

const EMPTY_MENU: Pick<PublicMenuData, 'categorias' | 'items' | 'combos'> = { categorias: [], items: [], combos: [] };

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
  const { vibrateLight, vibrateSuccess } = useHaptics();
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromSearch = location.state?.fromSearch;
  
  const menuQuery = useRestaurantMenu(id)
  const restaurante = menuQuery.data?.restaurante || null
  const restaurantePausado = menuQuery.restaurantePausado
  const categorias = menuQuery.data?.categorias || EMPTY_MENU.categorias
  const items = menuQuery.data?.items || EMPTY_MENU.items
  const combos = menuQuery.data?.combos || EMPTY_MENU.combos
  const promos = menuQuery.promos
  const loading = menuQuery.loading
  const { family: sucursalesFamilia, error: branchesError, retry: retryBranches } = useRestaurantFamily(restaurante)
  const [showSucursalesModal, setShowSucursalesModal] = useState(false)

  const [activeTab, setActiveTab] = useState<string>('')
  const [openingCart, setOpeningCart] = useState(false);
  const categoryChipsRef = useRef<HTMLDivElement>(null)
  const [chipsAtEnd, setChipsAtEnd] = useState(false)

  // Auto-scroll el chip activo al centro cuando cambia la categoría
  useEffect(() => {
    if (!categoryChipsRef.current) return
    const activeChip = categoryChipsRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement
    if (activeChip && window.matchMedia('(max-width: 899px)').matches) {
      const list = categoryChipsRef.current;
      list.scrollTo({ left: activeChip.offsetLeft - (list.clientWidth - activeChip.offsetWidth) / 2,
        behavior: 'smooth' });
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

  const [pendingCartProduct, setPendingCartProduct] = useState<{ product: CartItem & { foto_url?: string }; restaurantId: string } | null>(null)

  // Estado del carrito y drawer (Global via Zustand)
  const carrito = useCartStore(state => state.carrito as { item: CartItem & { foto_url?: string }, cantidad: number }[])
  const cartCount = carrito.reduce((sum, p) => sum + p.cantidad, 0)
  const isCartOpen = useCartStore(state => state.isCartOpen)
  const setIsCartOpen = useCartStore(state => state.setIsCartOpen)
  const _addToCart = useCartStore(state => state.addToCart)
  const _removeFromCart = useCartStore(state => state.removeFromCart)
  const _clearCart = useCartStore(state => state.clearCart)
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
  
  // ETA Dinamico
  const [tiempoEstimado, setTiempoEstimado] = useState('25-35 min')
  
  // OTP States
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verificandoOtp, setVerificandoOtp] = useState(false)
  
  const [usarBeneficioNormal, setUsarBeneficioNormal] = useState(false)
  const [usarSaldoVip, setUsarSaldoVip] = useState(false)
  const [montoSaldoVip, setMontoSaldoVip] = useState('')
  const [pinVip, setPinVip] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinAutorizado, setPinAutorizado] = useState(false)
  const [verificandoPin, setVerificandoPin] = useState(false)
  const [datosCliente, setDatosCliente] = useState<{es_vip: boolean, saldo: number, puntos: number, envios_gratis: number, nombre: string} | null>(null)
  const [checkingLoyalty, setCheckingLoyalty] = useState(false)
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
  const submittingRef = useRef(false) // BUG 5 fix: prevents double-submit
  const idempotencyKeyRef = useRef<string | null>(null)
  const ticketIdRef = useRef<string | null>(null)
  const [direccionReferencias, setDireccionReferencias] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'en_linea'>('efectivo') // Forzado a efectivo por ahora
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [toastMsg, setToastMsg] = useState<{ title: string, message?: string, type?: 'success' | 'error' | 'loading' } | null>(null)

  // Estado para validación de cupones
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [cuponValido, setCuponValido] = useState(false)
  const [descuento, setDescuento] = useState(0)
  const [cuponPlataformaIdManual, setCuponPlataformaIdManual] = useState<string | null>(null)
  const [costoEnvioFijoOverride, setCostoEnvioFijoOverride] = useState<number | null>(null)

  // Estados del nuevo carrito paso a paso
  const [checkoutStep, setCheckoutStep] = useState(() => {
    const saved = sessionStorage.getItem('est_checkoutstep')
    return saved ? parseInt(saved) : 1
  })
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'tienda' | null>(() => (sessionStorage.getItem('est_tipoentrega') as 'domicilio' | 'tienda' | null) || null)
  const [direccionEntrega, setDireccionEntrega] = useState(() => sessionStorage.getItem('est_direccion') || '')

  // Estados de cálculo H3 abstraídos
  const { costoEnvioBase, fueraDeCobertura, calculandoEnvio } = useDeliveryCalculation(ubicacionGPS, tipoEntrega);

  // Lógica de Upsell Inteligente
  const recomendaciones = useMemo(() => {
    if (!carrito.length || !items.length) return [];
    
    const inCartIds = carrito.map(p => p.item.id);

    const cartNames = carrito.map(p => p.item?.nombre?.toLowerCase() || '');
    
    
    const hasDrink = cartNames.some(n => n.includes('coca') || n.includes('agua') || n.includes('refresco') || n.includes('jugo') || n.includes('bebida') || n.includes('limonada') || n.includes('fresa') || n.includes('frappe') || n.includes('horchata'));
    const hasDessert = cartNames.some(n => n.includes('postre') || n.includes('pastel') || n.includes('helado') || n.includes('crepa') || n.includes('flan') || n.includes('churro'));
    const hasSnack = cartNames.some(n => n.includes('papas') || n.includes('snack') || n.includes('extra') || n.includes('guarnicion') || n.includes('queso') || n.includes('nachos') || n.includes('dedos'));
    
    let pools: MenuItem[] = [];
    
    if (!hasDrink) {
      pools = items.filter(i => {
        const n = i.nombre.toLowerCase();
        return n.includes('coca') || n.includes('agua') || n.includes('refresco') || n.includes('jugo') || n.includes('bebida') || n.includes('limonada') || n.includes('horchata');
      });
    } 
    
    if (pools.length === 0 && !hasSnack) {
      pools = items.filter(i => {
        const n = i.nombre.toLowerCase();
        return n.includes('papas') || n.includes('snack') || n.includes('extra') || n.includes('nachos') || n.includes('dedos');
      });
    }
    
    if (pools.length === 0 && !hasDessert) {
      pools = items.filter(i => {
        const n = i.nombre.toLowerCase();
        return n.includes('postre') || n.includes('pastel') || n.includes('helado') || n.includes('crepa') || n.includes('flan') || n.includes('churro');
      });
    }
    
    // Fallback: items baratos que no están en el carrito
    if (pools.length === 0) {
      pools = items.filter(i => i.precio > 0 && i.precio < 80);
    }
    
    // Filtrar los que ya están en el carrito
    pools = pools.filter(i => !inCartIds.includes(i.id));
    
    // Escoger hasta 3 recomendaciones semi-aleatorias (basadas en precio para ser estables pero variadas)
    return pools.sort((a, b) => a.precio - b.precio).slice(0, 3);
  }, [carrito, items]);
  
  /*
  // Revisar si el cliente tiene envío gratis por lealtad o saldo VIP
  useEffect(() => {
    const telLimpio = clienteTel.replace(/\D/g, '')
    if (telLimpio.length === 10) {
      checkLoyaltyPoints(telLimpio)
    } else {
      setDatosCliente(null)
      setUsarBeneficioNormal(false)
      setUsarSaldoVip(false)
      setPinAutorizado(false)
    }
  }, [clienteTel])

  const handlePinVerify = async () => {
    if (!pinVip || pinVip.length < 4 || !clienteTel) return;
    setVerificandoPin(true);
    setPinError(false);
    try {
      const { data } = await supabase.rpc('verify_cliente_pin', {
        p_telefono: clienteTel.replace(/\D/g, ''),
        p_pin: pinVip,
      });
      if (data?.ok) {
        setPinAutorizado(true);
        setPinError(false);
      } else {
        setPinError(true);
        setPinAutorizado(false);
      }
    } catch (e) {
      setPinError(true);
    } finally {
      setVerificandoPin(false);
    }
  }

  const checkLoyaltyPoints = async (tel: string) => {
    setCheckingLoyalty(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('puntos, rango, es_vip, saldo_billetera, envios_gratis_disponibles, nombre')
        .eq('telefono', tel)
        .single()
      
      if (!error && data) {
        setDatosCliente({
          es_vip: data.es_vip || data.rango === 'vip',
          saldo: data.saldo_billetera || 0,
          puntos: data.puntos || 0,
          envios_gratis: data.envios_gratis_disponibles || 0,
          nombre: data.nombre || ''
        })
      } else {
        setDatosCliente(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingLoyalty(false)
    }
  }

  // useEffect eliminado: sessionStorage manejado por Zustand
  useEffect(() => { sessionStorage.setItem('est_nombre', clienteNombre) }, [clienteNombre])
  useEffect(() => { sessionStorage.setItem('est_tel', clienteTel) }, [clienteTel])
  useEffect(() => { sessionStorage.setItem('est_metodopago', metodoPago) }, [metodoPago])
  useEffect(() => { sessionStorage.setItem('est_checkoutstep', checkoutStep.toString()) }, [checkoutStep])
  useEffect(() => { if (tipoEntrega) sessionStorage.setItem('est_tipoentrega', tipoEntrega) }, [tipoEntrega])
  useEffect(() => { sessionStorage.setItem('est_direccion', direccionEntrega) }, [direccionEntrega])
  useEffect(() => { if (ubicacionGPS) sessionStorage.setItem('est_ubicacion', JSON.stringify(ubicacionGPS)) }, [ubicacionGPS])

  // Resetear idempotency key si el carrito o los datos cambian, para evitar mandar datos viejos en un reintento
  useEffect(() => {
    idempotencyKeyRef.current = null;
    ticketIdRef.current = null;
  }, [carrito, metodoPago, tipoEntrega, descuento, clienteNombre, clienteTel, direccionEntrega, ubicacionGPS]);
  */

  // Estado del modal de opciones de producto
  type OptionableItem = (MenuItem | MenuCombo | MenuPromocion) & { __tipo: 'item' | 'combo' | 'promo', nombre?: string, precio?: number }
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<OptionableItem | null>(null)
  useEffect(() => { setPendingCartProduct(null); setSelectedItemForOptions(null); }, [id])

  useEffect(() => {
    const fetchEta = async () => {
      try {
        const { data: etaData } = await supabase.rpc('calcular_eta_dinamico');
        if (etaData) setTiempoEstimado(etaData);
      } catch (err) {
        console.error('Error fetching ETA:', err);
      }
    };
    fetchEta();
  }, []);


  const showToast = (title: string, message?: string, type: 'success' | 'error' | 'loading' = 'success') => {
    setToastMsg({ title, message, type })
    if (type !== 'loading') {
      setTimeout(() => setToastMsg(null), 4000)
    }
  }

  /*
  const validarCuponBtn = async () => {
    if (!cuponCliente.trim()) return
    setValidandoCupon(true)

    try {
      const { data, error } = await supabase.rpc('validar_cupon_publico', { p_codigo: cuponCliente })

      if (!error && data?.ok) {
        if (data.tipo === 'envio_fijo') {
          setCostoEnvioFijoOverride(data.monto)
          setDescuento(0)
          showToast('Cupón Aplicado', `¡Envío a $${data.monto.toFixed(2)}!`, 'success')
        } else {
          showToast('Cupón Aplicado', `¡Se descontarán $${data.monto.toFixed(2)} de tu orden!`, 'success')
          setDescuento(data.monto)
          setCostoEnvioFijoOverride(null)
        }
        setCuponValido(true)
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
          if (cuponPropio.tipo === 'envio_fijo') {
            setCostoEnvioFijoOverride(cuponPropio.valor)
            setDescuento(0)
            showToast('¡Cupón Aplicado!', `Envío a $${cuponPropio.valor.toFixed(2)}`, 'success')
          } else {
            const descuentoCalculado = cuponPropio.tipo === 'porcentaje'
              ? subtotalActual * (cuponPropio.valor / 100)
              : cuponPropio.valor
            const descuentoFinal = Math.min(descuentoCalculado, subtotalActual)
            setDescuento(descuentoFinal)
            setCostoEnvioFijoOverride(null)
            showToast('¡Cupón Aplicado!', `Descuento de $${descuentoFinal.toFixed(2)} aplicado`, 'success')
          }
          setCuponValido(true)
          // El incremento de usos_actuales se hará en el backend o al confirmar la orden, NO aquí en la validación visual.
          return
        }
      }

      // Buscar en cupones de plataforma (Globales)
      const { data: cuponPlat } = await supabase
        .from('cupones_plataforma')
        .select('*')
        .eq('codigo', cuponCliente.toUpperCase())
        .eq('activo', true)
        .maybeSingle()
        
      if (cuponPlat) {
        if (cuponPlat.fecha_fin && new Date(`${cuponPlat.fecha_fin}T23:59:59`) < new Date()) {
          showToast('Cupón expirado', 'Este cupón global ya no está disponible', 'error')
          return
        }
        if (cuponPlat.uso_maximo && cuponPlat.usos_actuales >= cuponPlat.uso_maximo) {
          showToast('Cupón agotado', 'Este cupón global ya alcanzó su límite de usos', 'error')
          return
        }
        
        const subtotalActual = carrito.reduce((sum, p) => sum + (p.item.precio * p.cantidad), 0)
        let descuentoFinal = 0
        
        // El costo de envío se calculará después, por ahora calculamos base subtotal
        if (cuponPlat.tipo === 'porcentaje') {
          descuentoFinal = subtotalActual * (cuponPlat.valor / 100)
          setCostoEnvioFijoOverride(null)
        } else if (cuponPlat.tipo === 'monto_fijo') {
          descuentoFinal = cuponPlat.valor
          setCostoEnvioFijoOverride(null)
        } else if (cuponPlat.tipo === 'envio_fijo') {
          setCostoEnvioFijoOverride(cuponPlat.valor)
          descuentoFinal = 0 
        }
        
        setCuponValido(true)
        setDescuento(descuentoFinal)
        setCuponPlataformaIdManual(cuponPlat.id)
        showToast('Cupón aplicado', 'Revisa el descuento en el resumen.', 'success')
        return
      }

      // Ningún cupón encontrado
      setCuponPlataformaIdManual(null)
      showToast('Revisa el cupón', data?.error || 'Ese código no existe o ya venció.', 'error')
      setCuponValido(false)
      setDescuento(0)
      setCostoEnvioFijoOverride(null)
    } catch (err) {
      showToast('Error', 'Hubo un error de conexión', 'error')
    } finally {
      setValidandoCupon(false)
    }
  }
  */

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpeningCart(false);
    setShowSucursalesModal(false);
    setSelectedItemDetail(null);
    setSelectedItemForOptions(null);
    setActiveTab('');
  }, [id]);

  const reconciledMenu = useRef({ identifier: id, data: menuQuery.data });
  useEffect(() => {
    const data = menuQuery.data;
    if (reconciledMenu.current.identifier !== id) {
      reconciledMenu.current = { identifier: id, data };
      return;
    }
    if (!data || menuQuery.error || data === reconciledMenu.current.data) return;
    reconciledMenu.current = { identifier: id, data };
    const store = useCartStore.getState();
    const origin = cartRestaurantOrigin(store.restaurantId, sessionStorage.getItem('est_carrito_restaurante'));
    const next = reconcileMenuCart(store.carrito, origin, { ...data, promos });
    if (next !== store.carrito) useCartStore.setState({ carrito: next });
  }, [id, menuQuery.data, menuQuery.error, promos]);

  /*
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
  
  // CÁLCULOS DE LEALTAD Y ENVIOS
  const isFreeDelivery = usarBeneficioNormal && datosCliente && !datosCliente.es_vip && ubicacionGPS !== null && tipoEntrega === 'domicilio';
  
  // Lógica de costo base: Si es VIP, su envío base es $10 o $7 (a partir de 26 puntos). Si no, usa el costo normal.
  const tarifaBaseEnvio = datosCliente?.es_vip ? (datosCliente.puntos < 26 ? 10 : 7) : costoEnvioBase;
  const costoEnvioCalculado = tarifaBaseEnvio > 0 ? Math.max(0, tarifaBaseEnvio - bolsaSubsidio) : 0;
  
  const costoEnvio = isFreeDelivery ? 0 : costoEnvioCalculado;
  // Bugfix: Evitar que mediante la consola del navegador pongan un monto VIP negativo para sumar saldo
  const descuentoVip = (usarSaldoVip && datosCliente?.es_vip && pinAutorizado) ? Math.max(0, parseFloat(montoSaldoVip || '0')) : 0;
  */

  const addToCart = (product: CartItem & { foto_url?: string }, confirmedRestaurantId?: string): boolean => {
    if (!restaurante) return false;
    if (!estaAbierto(restaurante)) {
      setShowClosedToast(true);
      setTimeout(() => setShowClosedToast(false), 3500);
      return false;
    }
    const current = useCartStore.getState();
    const origin = cartRestaurantOrigin(current.restaurantId, sessionStorage.getItem('est_carrito_restaurante'));
    const replacing = requiresNewBranchCart(current.carrito.length, origin, restaurante.id);
    if (replacing && confirmedRestaurantId !== restaurante.id) {
      setPendingCartProduct({ product, restaurantId: restaurante.id });
      return false;
    }
    if (replacing) {
      _clearCart();
      sessionStorage.removeItem('est_checkoutstep');
    }
    useCartStore.getState().setRestaurantId(restaurante.id);
    sessionStorage.setItem('est_carrito_restaurante', restaurante.id);
    _addToCart(product);
    vibrateSuccess();
    return true;
  }

  const removeFromCart = (cartItemId: string) => {
    vibrateLight();
    // Bugfix: Evitar fraude con cupones. Si quita cosas, podría evadir el monto mínimo.
    /*
    if (cuponValido) {
      setCuponValido(false)
      setDescuento(0)
      setCuponCliente('')
      setCuponPlataformaIdManual(null)
      showToast('Aviso', 'Modificaste el carrito. Vuelve a aplicar tu cupón.', 'success')
    }
    */

    _removeFromCart(cartItemId)
  }

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('tab');
    setActiveTab(current => menuTabAfterRefresh(current, requested, { categorias, items, combos, promos }));
  }, [location.search, categorias, items, promos, combos]);

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

  const branchPicker = showSucursalesModal && restaurante && <RestaurantBranchPicker branches={sucursalesFamilia} selectedId={restaurante.id} cartCount={cartCount} isOpen={estaAbierto} onClose={() => setShowSucursalesModal(false)} onChoose={branch => {
        _clearCart()
        sessionStorage.removeItem('est_carrito_restaurante')
        sessionStorage.removeItem('est_checkoutstep')
        setShowSucursalesModal(false)
        navigate(restaurantMenuPath(branch))
      }} />

  if (restaurantePausado) return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100 p-10 max-w-sm w-full">
        <div className="w-20 h-20 rounded-[24px] bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">⏸️</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Pedidos en pausa</h2>
        {sucursalesFamilia.length > 0 && <button type="button" className="branch-button" onClick={() => setShowSucursalesModal(true)}>Ver otras sucursales</button>}
        {branchesError && <p role="alert">{branchesError} <button type="button" onClick={retryBranches}>Reintentar</button></p>}
        <p className="text-slate-500 text-sm leading-relaxed mb-1">
          <strong className="text-slate-700">{restaurante?.nombre}</strong> no está recibiendo pedidos por ahora.
        </p>
        <p className="text-slate-400 text-sm mb-7">
          Puedes volver a revisar más tarde.
        </p>
        <div className="flex gap-2 items-center justify-center text-xs text-amber-500 font-bold bg-amber-50 rounded-xl px-4 py-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Revisando disponibilidad…
        </div>
      </div>
      {branchPicker}
    </div>
  )

  if (loading) return <RestaurantMenuSkeleton />;

  if (menuQuery.error && !restaurante) return <main className="restaurant-menu-page min-h-screen flex flex-col items-center justify-center px-4">
    <section className="eats-catalog-notice" role="alert"><AlertCircle aria-hidden="true" /><div><h1>No pudimos cargar este menú</h1><p>Revisa tu conexión y vuelve a intentarlo.</p></div><button type="button" disabled={menuQuery.fetching} onClick={menuQuery.refresh}>Reintentar</button></section><Link to="/">Volver al inicio</Link>
  </main>;

  if (!restaurante) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Restaurante no disponible</h2>
        <p className="text-slate-500 mb-6">El menú que buscas no existe o fue desactivado.</p>
        <Link to="/" className="bg-[#FF7A6A] text-white px-8 py-3 rounded-[24px] font-bold shadow-lg shadow-orange-200">Volver al Inicio</Link>
      </div>
    )
  }

  return (
    <MotionConfig>
    <motion.div className="restaurant-menu-page" initial={{ opacity: 0 }} animate={{ opacity: openingCart ? 0 : 1 }} transition={{ duration: .24, ease: [.22, 1, .36, 1] }} onAnimationComplete={() => {
      if (openingCart) navigate(`/menu/${id}/carrito`);
    }}>

      {menuQuery.error && <section className="eats-catalog-notice" role="status"><AlertCircle aria-hidden="true" /><div><h2>No pudimos actualizar este menú</h2><p>Te mostramos el último menú que cargó. Actualízalo antes de pedir.</p></div><button type="button" disabled={menuQuery.fetching} onClick={menuQuery.refresh}>Actualizar menú</button></section>}
      {/* TOPBAR */}
      <RestaurantMenuHeader restaurant={restaurante} hasCart={cartCount > 0} fromSearch={fromSearch} />

      {/* HERO FULL BLEED (RAPPI STYLE) */}
      <div className="menu-shell">
        {branchesError && <p role="alert">{branchesError} <button type="button" onClick={retryBranches}>Reintentar</button></p>}
        <RestaurantMenuIdentity restaurant={restaurante} open={estaAbierto(restaurante)} hasBranches={sucursalesFamilia.some(branch => branch.id !== restaurante.id)} onBranches={() => setShowSucursalesModal(true)} />

        {!estaAbierto(restaurante) && (
          <div className="bg-slate-50 text-slate-600 font-medium text-sm p-4 rounded-xl mt-6 flex items-center justify-center sm:justify-start gap-2 border border-slate-200">
            <AlertCircle size={18} className="text-slate-400" />
            Cerrado. Solo puedes hacer pedidos en el horario del restaurante.
          </div>
        )}

        <ScrollDepthGroup className="menu-catalog-layout" distance={18} local>
        {/* Categorías del catálogo */}
        {(categorias.filter(c => items.some(i => i.categoria_id === c.id)).length > 0 || combos.length > 0 || promos.length > 0) && (
          <nav className="menu-category-nav" aria-label="Categorías del menú">
            <div className="relative">
              <div
                ref={categoryChipsRef}
                onScroll={handleChipsScroll}
                className="menu-category-list"
              >
                {promos.length > 0 && (
                  <button
                    data-tab="promos"
                    onClick={() => setActiveTab('promos')}
                    aria-pressed={activeTab === 'promos'}
                    className="menu-category-button"
                  >
                    <span>Promociones</span><small>{promos.length}</small>
                  </button>
                )}
                {categorias.filter(c => items.some(i => i.categoria_id === c.id)).map(cat => (
                  <button
                    key={`chip-${cat.id}`}
                    data-tab={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    aria-pressed={activeTab === cat.id}
                    className="menu-category-button"
                  >
                    <span>{cat.nombre}</span><small>{items.filter(item => item.categoria_id === cat.id).length}</small>
                  </button>
                ))}
                {combos.length > 0 && (
                  <button
                    data-tab="combos"
                    onClick={() => setActiveTab('combos')}
                    aria-pressed={activeTab === 'combos'}
                    className="menu-category-button"
                  >
                    <span>Combos</span><small>{combos.length}</small>
                  </button>
                )}

              </div>
            </div>
          </nav>
        )}


            {/* PRODUCT CATEGORIES CONTENT */}
            <main className="menu-catalog-content" aria-label="Productos del restaurante">
              <div className="menu-catalog-heading"><h2>{activeTab === 'promos' ? 'Promociones' : activeTab === 'combos' ? 'Combos' : categorias.find(category => category.id === activeTab)?.nombre || 'Menú'}</h2><p>Elige un producto para ver los detalles.</p></div>
              <div className="relative">
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.24, ease: [.22, 1, .36, 1] }}
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
                          const configurationIssue = menuConfigurationIssue(item);
                          return (
                            <MenuProductCard
                              key={item.id}
                              productKey={`item:${item.id}`}
                              name={item.nombre}
                              description={item.descripcion}
                              image={item.foto_url}
                              price={item.precio}
                              quantity={carrito.filter(entry => entry.item.id === item.id && entry.item.tipo === 'item').reduce((sum, entry) => sum + entry.cantidad, 0)}
                              customizable={Boolean(item.opciones?.length)}
                              unavailable={configurationIssue || (item.agotado_hoy ? 'Agotado por hoy' : fueraDeHorario ? `Disponible de ${item.hora_inicio_disponible} a ${item.hora_fin_disponible}` : undefined)}
                              onDetails={() => {
                                if (item.opciones?.length && !configurationIssue && !item.agotado_hoy && !fueraDeHorario) {
                                  setSelectedItemForOptions({ ...item, __tipo: 'item' });
                                } else {
                                  setSelectedItemDetail({ ...item, cartItemTipo: 'item', unavailable: configurationIssue || item.agotado_hoy || fueraDeHorario });
                                }
                              }}
                              onAdd={() => {
                                if (configurationIssue || item.agotado_hoy || fueraDeHorario) return;
                                if (item.opciones?.length) {
                                  setSelectedItemForOptions({ ...item, __tipo: 'item' });
                                } else addToCart({ ...cartItem, cartItemId: item.id });
                              }}
                            />
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
                      <MenuProductCard productKey={`combo:${combo.id}`} name={combo.nombre} description={combo.descripcion} price={combo.precio} image={combo.foto_url} includes={combo.incluye} badge="Combo"
                        quantity={carrito.filter(entry => entry.item.id === combo.id && entry.item.tipo === 'combo').reduce((sum, entry) => sum + entry.cantidad, 0)}
                        customizable={Boolean(combo.opciones?.length)}
                        unavailable={menuConfigurationIssue(combo)}
                        onDetails={() => setSelectedItemDetail({ ...combo, cartItemTipo: 'combo', unavailable: menuConfigurationIssue(combo) })}
                        onAdd={() => {
                          if (menuConfigurationIssue(combo)) return;
                          if (combo.opciones?.length) {
                            setSelectedItemForOptions({ ...combo, __tipo: 'combo' });
                          } else addToCart({ id: combo.id, nombre: combo.nombre, precio: combo.precio, tipo: 'combo', foto_url: combo.foto_url || undefined, cartItemId: combo.id, aplica_subsidio: combo.aplica_subsidio });
                        }}
                      />
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
                      transition={{ duration: 0.24, delay: Math.min(index * 0.03, 0.12), ease: [.22, 1, .36, 1] }}
                    >
                      <MenuProductCard productKey={`promo:${promo.id}`} name={promo.titulo} description={promo.descripcion} price={promo.precio_especial} image={promo.foto_url} badge={promo.tipos_pedido?.length === 1 ? promotionDeliveryLabel(promo.tipos_pedido) : 'Promoción'}
                        quantity={carrito.filter(entry => entry.item.id === promo.id && entry.item.tipo === 'promo').reduce((sum, entry) => sum + entry.cantidad, 0)}
                        customizable={Boolean(promo.opciones?.length)}
                        unavailable={menuConfigurationIssue(promo)}
                        onDetails={() => setSelectedItemDetail({ ...promo, nombre: promo.titulo, precio: promo.precio_especial, cartItemTipo: 'promo', unavailable: menuConfigurationIssue(promo) })}
                        onAdd={() => setSelectedItemDetail({ ...promo, nombre: promo.titulo, precio: promo.precio_especial, cartItemTipo: 'promo', unavailable: menuConfigurationIssue(promo) })}
                      />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </main>
          </ScrollDepthGroup>{/* menú y categorías */}
          </div>
          {/* Fin Contenedor Central */}

          {/* ── Item Detail Sheet ─────────────────────────────── */}
          <AnimatePresence>
            {selectedItemDetail && (
                <MenuDetailsFrame key={selectedItemDetail.id} productKey={`${selectedItemDetail.cartItemTipo}:${selectedItemDetail.id}`} onClose={() => setSelectedItemDetail(null)}>
                  {selectedItemDetail.foto_url && <LazyImage src={selectedItemDetail.foto_url} alt="" className="menu-detail-photo" />}
                  <div className="flex items-start justify-between mb-2 gap-4">
                    <div>
                      {selectedItemDetail.cartItemTipo === 'promo' && (
                        <div className="bg-[#FA4A0C]/10 text-[#FA4A0C] font-black text-[11px] px-2.5 py-1 rounded-md inline-block mb-2 uppercase tracking-wider">
                          Promoción
                        </div>
                      )}
                      <h2 id="menu-detail-title" className="text-2xl font-semibold tracking-tight text-slate-900 leading-tight">
                        {selectedItemDetail.nombre || selectedItemDetail.titulo}
                      </h2>
                    </div>
                    <button
                      onClick={() => { vibrateLight(); setSelectedItemDetail(null); }}
                      aria-label="Cerrar detalles del producto"
                      className="menu-detail-close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto pr-2">
                    <p className="text-[15px] text-slate-500 leading-relaxed">
                      {selectedItemDetail.descripcion || 'Consulta los detalles con el restaurante si necesitas más información.'}
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
                      <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {typeof selectedItemDetail.precio === 'number' && Number.isFinite(selectedItemDetail.precio) ? `$${selectedItemDetail.precio.toFixed(2)}` : 'Precio no disponible'}
                      </p>
                    </div>

                    <button
                      disabled={selectedItemDetail.unavailable || typeof selectedItemDetail.precio !== 'number' || !Number.isFinite(selectedItemDetail.precio) || selectedItemDetail.precio < 0}
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
                        } else {
                          vibrateSuccess();
                          addToCart(cartItem)
                        }
                        
                        setSelectedItemDetail(null)
                      }}
                      className="menu-detail-add"
                    >
                      <Plus className="w-5 h-5" />
                      {selectedItemDetail.unavailable ? 'No disponible por ahora' : selectedItemDetail.opciones?.length ? 'Elegir opciones' : 'Añadir al carrito'}
                    </button>
                  </div>
                </MenuDetailsFrame>
            )}
          </AnimatePresence>

      {/* FOOTER PÚBLICO */}
      <footer className="menu-footer">
        <span>EstrellaEats</span>
        <Link to="/terminos">Términos y condiciones</Link>
        <Link to="/privacidad">Aviso de privacidad</Link>
      </footer>

      {/* Floating Cart Button en Mobile */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
            className="menu-cart-dock"
          >
            <motion.button 
              initial={{ y: 16 }} animate={{ y: 0 }} exit={{ y: 16 }} transition={{ duration: .28, ease: [.22, 1, .36, 1] }}
              whileTap={{ scale: .985 }}
              disabled={openingCart}
              aria-label={`Ver pedido, ${cartCount} productos`}
              onClick={() => {
                setOpeningCart(true);
              }}
            >
              <span className="menu-cart-icon" data-cart-motion-receipt><ShoppingBag size={22} aria-hidden="true" /><span className="menu-cart-count"><AnimatedCount value={cartCount} /></span></span>
              <span className="menu-cart-label"><strong>Ver mi pedido</strong><small>Productos · ${carrito.reduce((sum, entry) => sum + entry.item.precio * entry.cantidad, 0).toFixed(2)}</small></span>
              <ArrowRight size={20} aria-hidden="true" />
            </motion.button>
            <span className="menu-cart-flight-target" data-cart-motion-target aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>



      <AnimatePresence>
        {selectedItemForOptions && <MenuOptionsDialog key={selectedItemForOptions.id}
          product={{ id: selectedItemForOptions.id, nombre: selectedItemForOptions.nombre || selectedItemForOptions.titulo || 'Promoción',
            precio: selectedItemForOptions.precio ?? selectedItemForOptions.precio_especial,
            tipo: selectedItemForOptions.__tipo, foto_url: selectedItemForOptions.foto_url || undefined,
            aplica_subsidio: selectedItemForOptions.aplica_subsidio }}
          groups={availableOptionGroups(selectedItemForOptions.opciones || [], items, restaurante?.id || '')}
          onClose={() => setSelectedItemForOptions(null)}
          onAdd={product => {
            const added = addToCart(product);
            setSelectedItemForOptions(null);
            if (added) showToast('Agregado a tu pedido', product.nombre, 'success');
          }} />}
      </AnimatePresence>
      <AnimatePresence>
        {pendingCartProduct && restaurante?.id === pendingCartProduct.restaurantId && <CartReplacementDialog
          key={pendingCartProduct.product.cartItemId}
          product={pendingCartProduct.product} restaurantName={restaurante.nombre_sucursal ? restaurante.nombre + ' · ' + restaurante.nombre_sucursal : restaurante.nombre}
          count={cartCount} onCancel={() => setPendingCartProduct(null)}
          onConfirm={() => {
            const added = addToCart(pendingCartProduct.product, pendingCartProduct.restaurantId);
            setPendingCartProduct(null);
            if (added) showToast('Tu nuevo pedido está listo', pendingCartProduct.product.nombre + ' agregado al carrito.', 'success');
          }} />}
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

              <MenuMapLoader>{isLoaded => isLoaded ? (
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
              )}</MenuMapLoader>
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

      {/* <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setShowOtpModal(false); setProcesando(false); setIsCartOpen(true); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl z-[10000]"
            >
              <button 
                onClick={() => { setShowOtpModal(false); setProcesando(false); setIsCartOpen(true); }}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X size={16} strokeWidth={3} />
              </button>
              
              <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} strokeWidth={2} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 text-center mb-2 leading-tight">Verifica tu pedido</h3>
              <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
                Para tu seguridad, ingresa el PIN de 4 dígitos que te enviamos por WhatsApp al <b>{clienteTel}</b>
              </p>

              <div className="relative flex justify-center mb-10 w-full max-w-[280px] mx-auto">
                <div className="flex gap-3 justify-between w-full">
                  {[0, 1, 2, 3].map((index) => {
                    const digit = otpCode[index] || '';
                    const isActive = otpCode.length === index || (otpCode.length === 4 && index === 3);
                    return (
                      <div
                        key={index}
                        className={`w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center text-3xl sm:text-4xl font-black rounded-2xl border-2 transition-all duration-300 ${
                          isActive 
                            ? 'border-orange-500 bg-orange-50/50 shadow-[0_0_0_4px_rgba(249,115,22,0.1)] scale-105 z-10' 
                            : digit 
                              ? 'border-slate-800 bg-slate-800 text-white shadow-md' 
                              : 'border-slate-200 bg-slate-50 text-slate-300'
                        }`}
                      >
                        {digit ? digit : '•'}
                      </div>
                    );
                  })}
                </div>
                
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                  autoFocus
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.length < 4 || verificandoOtp}
                className="w-full bg-[#FA4A0C] text-white font-bold py-4 rounded-[20px] shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all"
              >
                {verificandoOtp ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Verificando...
                  </>
                ) : (
                  'Confirmar Pedido'
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence> */}

      {branchPicker}


    </motion.div>
    </MotionConfig>
  )
}



