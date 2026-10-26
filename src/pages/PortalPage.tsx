import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Store, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase, getMyRestaurante } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './restaurantPortal.css'
import { isAwaitingKitchenOrder } from '../lib/kitchenOrderState'
import { parseRestaurantBranches, RESTAURANT_PUBLIC_FIELDS } from '../lib/restaurantBranches'
import './views/SucursalesView.css'
import { RestaurantPortalShell } from '../components/RestaurantPortalShell'
import type {PortalTab} from '../lib/portalNavigation'
import { restaurantDeliveryCapability } from '../lib/restaurantDeliveryApi'
import type { DeliveryCapability } from '../lib/restaurantDelivery'


const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const MenuProductosView = lazy(() => import('./views/MenuProductosView').then(m => ({ default: m.MenuProductosView })))
const MenuCombosView = lazy(() => import('./views/MenuCombosView').then(m => ({ default: m.MenuCombosView })))
const MenuPromosView = lazy(() => import('./views/MenuPromosView').then(m => ({ default: m.MenuPromosView })))
const CuponesView = lazy(() => import('./views/CuponesView').then(m => ({ default: m.CuponesView })))
const PerfilView = lazy(() => import('./views/PerfilView').then(m => ({ default: m.PerfilView })))
const PedidosView = lazy(() => import('./views/PedidosView').then(m => ({ default: m.PedidosView })))
const SucursalesView = lazy(() => import('./views/SucursalesView').then(m => ({ default: m.SucursalesView })))
const EnviosView = lazy(() => import('./views/EnviosView').then(m => ({ default: m.EnviosView })))

export function PortalPage({ initialTab, userId }: { initialTab?: PortalTab; userId?:string }) {
  const { pedidoId } = useParams<{ pedidoId?: string }>()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [managedBranches, setManagedBranches] = useState<Restaurante[]>([])
  const restaurantId=restaurante?.id
  const kitchenBranchIds=useMemo(()=>restaurantId?[restaurantId,...managedBranches.map(branch=>branch.id)]:[],[restaurantId,managedBranches])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [branchesError, setBranchesError] = useState('')
  const [branchesVersion, setBranchesVersion] = useState(0)
  const operatingRestaurant = managedBranches.find(branch => branch.id === selectedBranchId) || restaurante
  const [deliveryAccess, setDeliveryAccess] = useState<{ restaurantId: string; capability: DeliveryCapability | null; error: string } | null>(null)
  const [deliveryAccessVersion, setDeliveryAccessVersion] = useState(0)
  const deliveryRestaurantId = operatingRestaurant?.id
  const deliveryCapability = deliveryAccess?.restaurantId === deliveryRestaurantId ? deliveryAccess?.capability : null
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab ?? 'dashboard')
  const [pedidosMounted, setPedidosMounted] = useState(true)
  const [highlightedPedidoId, setHighlightedPedidoId] = useState<string | null>(pedidoId ?? null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const navigateTab = useCallback((tab: PortalTab) => {
    if (tab === 'pedidos') setPedidosMounted(true)
    setActiveTab(tab)
  }, [])
  const openOrders = useCallback(() => navigateTab('pedidos'), [navigateTab])

  useEffect(() => {
    if (!deliveryRestaurantId) return
    const controller = new AbortController()
    void restaurantDeliveryCapability(deliveryRestaurantId, AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
      .then(capability => { if (!controller.signal.aborted) setDeliveryAccess({ restaurantId: deliveryRestaurantId, capability, error: '' }) })
      .catch(() => { if (!controller.signal.aborted) setDeliveryAccess({ restaurantId: deliveryRestaurantId, capability: null, error: 'No pudimos comprobar el acceso a solicitudes de envío.' }) })
    return () => controller.abort()
  }, [deliveryRestaurantId, deliveryAccessVersion])

  useEffect(() => {
    if (!restaurante || restaurante.matriz_id) return
    const controller = new AbortController()
    const rootId = restaurante.id
    async function load() {
      try {
        const { data, error } = await supabase.from('restaurantes').select(RESTAURANT_PUBLIC_FIELDS)
          .eq('matriz_id', rootId).order('nombre_sucursal').limit(101)
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])).returns<unknown>()
        if (error) throw error
        const branches = parseRestaurantBranches(data)
        if (!controller.signal.aborted) { setManagedBranches(branches); setBranchesError('') }
      } catch {
        if (!controller.signal.aborted) setBranchesError('No pudimos cargar las sucursales. Reintenta antes de cambiar de ubicación.')
      }
    }
    void load()
    return () => controller.abort()
  }, [restaurante, branchesVersion])

  // 🔊 Desbloquear audio en el primer clic del usuario (política del navegador)
  const desbloquearAudio = useCallback(() => {
    if (audioDesbloqueado) return
    try {
      const ctx = new AudioContext()
      // Reproducir silencio para "calentar" el contexto
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
      audioCtxRef.current = ctx
      setAudioDesbloqueado(true)
    } catch (e) {
      console.warn('No se pudo desbloquear el audio:', e)
    }
  }, [audioDesbloqueado])

  // Escuchar el primer clic en cualquier parte de la pantalla
  useEffect(() => {
    document.addEventListener('click', desbloquearAudio, { once: true })
    return () => document.removeEventListener('click', desbloquearAudio)
  }, [desbloquearAudio])

  // 🎵 Función de reproducción con Web Audio API (sin MP3 externo, instantáneo)
  const tocarTimbre = useCallback(() => {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext()
      if (!audioCtxRef.current) audioCtxRef.current = ctx

      const tocarTono = (freq: number, inicio: number, duracion: number, volumen: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio)
        gain.gain.setValueAtTime(volumen, ctx.currentTime + inicio)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion)
        osc.start(ctx.currentTime + inicio)
        osc.stop(ctx.currentTime + inicio + duracion)
      }

      // Secuencia de tonos tipo "ding-dong" de pedido
      tocarTono(880, 0.0, 0.25, 0.6)   // La5
      tocarTono(1100, 0.2, 0.25, 0.5)  // Do#6
      tocarTono(1320, 0.4, 0.4, 0.7)   // Mi6 (tono principal)
      tocarTono(880, 0.75, 0.3, 0.4)   // La5 (echo)
    } catch (e) {
      console.warn('Error al reproducir sonido:', e)
    }
  }, [])

  const loadRestaurante = useCallback(() => getMyRestaurante(userId).then(res => {
      setRestaurante(res)
      setNetworkError(false)
      
      // Solicitar permisos de notificación si no se han pedido
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }).catch((e:unknown) => {
      console.error(e)
      setNetworkError(true)
    }).finally(() => setLoading(false)), [userId])

  useEffect(() => {void loadRestaurante()},[loadRestaurante])

  // 🔔 Escucha global de Nuevos Pedidos (Push + Sonido)
  useEffect(() => {
    if (!restaurante) return;
    
    const channel = supabase.channel(`global:pedidos:${restaurante.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` }, (payload) => {
        
        let shouldRing = false;

        if (payload.eventType === 'INSERT' && isAwaitingKitchenOrder(payload.new)) {
          shouldRing = true;
        } else if (
          payload.eventType === 'UPDATE' &&
          payload.old.estado === 'pendiente_pago' &&
          payload.new.estado === 'pendiente' &&
          isAwaitingKitchenOrder(payload.new)
        ) {
          shouldRing = true;
        }

        if (shouldRing) {
          // PedidosView owns the continuous alarm once mounted; the portal only
          // provides a one-shot sound while the restaurant is elsewhere.
          if (!pedidosMounted) tocarTimbre()
          
          // 2. Notificación Push nativa
          if ('Notification' in window && Notification.permission === 'granted') {
             const notif = new Notification('¡Nuevo Pedido Recibido! 🚨', {
               body: `Un cliente acaba de realizar un pedido. Revisa tu Monitor de Cocina.`,
               icon: '/brand/estrella-mark-v2-192.png',
             })
             notif.onclick = () => {
               window.focus();
               navigateTab('pedidos');
               notif.close();
             }
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurante, pedidosMounted, navigateTab, tocarTimbre])

  useEffect(() => {
    if (!restaurante) return
    // Bug Fix 4: key por restaurante, no global
    const onboardingKey = `onboarding_b2b_done_${restaurante.id}`
    if (localStorage.getItem(onboardingKey)) return

    const getTarget = (id: string) => () =>
      document.querySelector(window.innerWidth < 1024 ? `#mobile-tour-${id}` : `#desktop-tour-${id}`)
        ?? document.querySelector('#mobile-tour-more') ?? document.body

    // Bug Fix 3: pasos adaptativos según estado del perfil
    const perfilIncompleto = !restaurante.perfil_completo

    const stepsBase = [
      {
        element: '#tour-welcome',
        popover: {
          title: '¡Bienvenido a tu Panel! 🎉',
          description: perfilIncompleto
            ? 'Tu negocio aún no es visible en la app. Completa tu perfil primero y luego explora las demás secciones.'
            : 'Aquí podrás gestionar todo lo relacionado con tu menú en la app. Te damos un recorrido rápido.'
        }
      },
      ...(perfilIncompleto ? [
        {
          element: getTarget('perfil'),
          popover: {
            title: '⚠️ Paso 1: Completa tu Perfil',
            description: 'Sube una foto de portada, selecciona categorías y configura tus horarios. Hasta que lo hagas, tu negocio NO aparecerá en el directorio público.'
          }
        }
      ] : []),
      {
        element: getTarget('dashboard'),
        popover: {
          title: 'Panel Principal',
          description: 'Aquí encontrarás el link a tu Menú Digital y el código QR para imprimir en tus mesas.'
        }
      },
      {
        element: getTarget('platillos'),
        popover: {
          title: 'Tus Platillos',
          description: 'Agrega tu menú, precios y fotos. Los cambios se reflejan al instante en la app.'
        }
      },
      {
        element: getTarget('combos'),
        popover: {
          title: 'Combos',
          description: 'Crea paquetes combinando varios productos para incrementar el ticket promedio.'
        }
      },
      {
        element: getTarget('promos'),
        popover: {
          title: 'Promociones',
          description: 'Lanza ofertas especiales por tiempo limitado y atrae más clientes.'
        }
      },
      ...(!perfilIncompleto ? [
        {
          element: getTarget('perfil'),
          popover: {
            title: 'Tu Perfil',
            description: 'Actualiza horarios, foto y datos de tu negocio cuando quieras.'
          }
        }
      ] : [])
    ]

    const driverObj = driver({
      animate: true,
      showProgress: true,
      doneBtnText: '¡Entendido!',
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Atrás',
      steps: stepsBase,
      onDestroyStarted: () => {
        localStorage.setItem(onboardingKey, 'true')
        driverObj.destroy()
      }
    })

    // Timeout para asegurar que el DOM esté listo (especialmente en móvil)
    setTimeout(() => driverObj.drive(), 600)
  }, [restaurante])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 size={44} className="animate-spin text-orange-500" />
      <span className="text-slate-400 font-medium animate-pulse">Cargando tu panel...</span>
    </div>
  )

  if (networkError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Error de Conexión</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            No pudimos conectar con el servidor. Por favor revisa tu conexión a internet e intenta nuevamente.
          </p>
          <button
            onClick={()=>{setLoading(true);setNetworkError(false);void loadRestaurante()}}
            className="block w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-900/20 mb-3 text-sm"
          >
            Reintentar
          </button>
          <button onClick={handleLogout} className="w-full py-3 text-slate-400 hover:text-slate-600 font-semibold text-sm transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  if (!restaurante) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Store size={32} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Acceso pendiente</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-1">
            Tu cuenta aún no está vinculada a un restaurante en el sistema.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Si ya te registraste como aliado, contáctanos por WhatsApp para activar tu acceso.
          </p>
          <a
            href="https://wa.me/529631539156?text=Hola%2C%20quiero%20activar%20mi%20acceso%20como%20aliado"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mb-3 text-sm"
          >
            📲 Contactar por WhatsApp
          </a>
          <button onClick={handleLogout} className="w-full py-3 text-slate-400 hover:text-slate-600 font-semibold text-sm transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <RestaurantPortalShell restaurant={restaurante} operatingRestaurant={operatingRestaurant??restaurante} branches={managedBranches}
      activeTab={activeTab} onNavigate={navigateTab} onSelectBranch={setSelectedBranchId} onLogout={handleLogout}
      deliveryEnabled={deliveryCapability?.enabled===true} audioUnlocked={audioDesbloqueado} onEnableAudio={desbloquearAudio}>
              {branchesError && <p role="alert">{branchesError} <button type="button" onClick={() => setBranchesVersion(value => value + 1)}>Reintentar</button></p>}
              {deliveryAccess && deliveryAccess.restaurantId === deliveryRestaurantId && deliveryAccess.error && <p role="alert" className="portal-delivery-access-error">{deliveryAccess.error} <button type="button" onClick={() => setDeliveryAccessVersion(value => value + 1)}>Reintentar</button></p>}

              {/* ── Banner: Perfil Incompleto ── Bug Fix 6: solo en dashboard ── */}
              {!restaurante.perfil_completo && activeTab === 'dashboard' && (
                <div className="restaurant-portal__profile-alert">
                  <div className="p-3 bg-amber-100 rounded-2xl shrink-0">
                    <AlertCircle className="text-amber-600" size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-amber-900 text-lg leading-tight">Tu negocio está oculto del público</p>
                    <p className="text-amber-700 text-sm mt-1 mb-3">Completa tu perfil para que los clientes puedan encontrarte en el directorio.</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${ restaurante.foto_fachada_url ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'}`}>
                        {restaurante.foto_fachada_url ? <CheckCircle2 size={12}/> : <span className="w-3 h-3 rounded-full border-2 border-amber-400 shrink-0"/>}
                        Foto de portada
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${ restaurante.categorias && restaurante.categorias.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'}`}>
                        {restaurante.categorias && restaurante.categorias.length > 0 ? <CheckCircle2 size={12}/> : <span className="w-3 h-3 rounded-full border-2 border-amber-400 shrink-0"/>}
                        Categorías
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${ restaurante.horarios && Object.values(restaurante.horarios).some(d => d?.activo) ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'}`}>
                        {restaurante.horarios && Object.values(restaurante.horarios).some(d => d?.activo) ? <CheckCircle2 size={12}/> : <span className="w-3 h-3 rounded-full border-2 border-amber-400 shrink-0"/>}
                        Horarios
                      </div>
                    </div>
                    <button
                      onClick={() => navigateTab('perfil')}
                      className="restaurant-portal__profile-action"
                    >
                      Completar Perfil →
                    </button>
                  </div>
                </div>
              )}

              {pedidosMounted && (
                <div className={`restaurant-portal__orders-view${activeTab === 'pedidos' ? '' : ' is-hidden'}`} aria-hidden={activeTab !== 'pedidos'}>
                  <Suspense fallback={
                    <div className="restaurant-portal__loading">
                      <Loader2 className="animate-spin" size={26} />
                    </div>
                  }>
                    <PedidosView key={`${restaurante.id}:${branchesVersion}`} restaurante={restaurante} branchIds={kitchenBranchIds} highlightedPedidoId={highlightedPedidoId} onClearHighlight={() => setHighlightedPedidoId(null)} onOpenOrders={openOrders} />
                  </Suspense>
                </div>
              )}

              <AnimatePresence initial={false}>
                {activeTab !== 'pedidos' && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.16 }}
                    className="restaurant-portal__view-transition"
                  >
                    <Suspense fallback={
                      <div className="restaurant-portal__loading">
                        <Loader2 className="animate-spin" size={26} />
                      </div>
                    }>
                      {activeTab === 'dashboard' && operatingRestaurant && <DashboardView key={operatingRestaurant.id} restaurante={operatingRestaurant} />}
                      {activeTab === 'productos' && operatingRestaurant && <MenuProductosView key={operatingRestaurant.id} restaurante={operatingRestaurant} />}
                      {activeTab === 'combos' && operatingRestaurant && <MenuCombosView key={operatingRestaurant.id} restaurante={operatingRestaurant} />}
                      {activeTab === 'promos' && operatingRestaurant && <MenuPromosView key={operatingRestaurant.id} restaurante={operatingRestaurant} />}
                      {activeTab === 'cupones' && operatingRestaurant && <CuponesView key={operatingRestaurant.id} restaurante={operatingRestaurant} />}
                      {activeTab === 'perfil' && operatingRestaurant && <PerfilView key={operatingRestaurant.id} restaurante={operatingRestaurant} ownAccount={operatingRestaurant.id === restaurante.id} onUpdate={loadRestaurante} />}
                      {activeTab === 'sucursales' && !restaurante.matriz_id && <SucursalesView restaurante={restaurante} onManage={branch => { setSelectedBranchId(branch.id); navigateTab('productos') }} onSaved={() => setBranchesVersion(value => value + 1)} />}
                      {activeTab === 'envios' && (deliveryCapability?.enabled ? <EnviosView key={deliveryCapability.origin.id} capability={deliveryCapability} onOpenOrders={openOrders} /> : <p role="status">{deliveryAccess?.capability?.enabled === false ? 'Esta sucursal no tiene habilitadas las solicitudes de envío.' : 'Comprobando acceso a envíos…'}</p>)}
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
    </RestaurantPortalShell>
  )
}
