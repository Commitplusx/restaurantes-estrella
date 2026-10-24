import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { LogOut, LayoutDashboard, Utensils, Tag, Package, Store, Loader2, Star, AlertCircle, CheckCircle2, Ticket, BellRing } from 'lucide-react'
import { supabase, getMyRestaurante } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './restaurantPortal.css'
import { isAwaitingKitchenOrder } from '../lib/kitchenOrderState'
import { branchLabel, parseRestaurantBranches, RESTAURANT_PUBLIC_FIELDS } from '../lib/restaurantBranches'
import './views/SucursalesView.css'
import { BrandLogo } from '../components/BrandLogo'

type PortalTab = 'dashboard' | 'pedidos' | 'productos' | 'combos' | 'promos' | 'cupones' | 'perfil' | 'sucursales'

const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const MenuProductosView = lazy(() => import('./views/MenuProductosView').then(m => ({ default: m.MenuProductosView })))
const MenuCombosView = lazy(() => import('./views/MenuCombosView').then(m => ({ default: m.MenuCombosView })))
const MenuPromosView = lazy(() => import('./views/MenuPromosView').then(m => ({ default: m.MenuPromosView })))
const CuponesView = lazy(() => import('./views/CuponesView').then(m => ({ default: m.CuponesView })))
const PerfilView = lazy(() => import('./views/PerfilView').then(m => ({ default: m.PerfilView })))
const PedidosView = lazy(() => import('./views/PedidosView').then(m => ({ default: m.PedidosView })))
const SucursalesView = lazy(() => import('./views/SucursalesView').then(m => ({ default: m.SucursalesView })))

export function PortalPage({ initialTab }: { initialTab?: PortalTab }) {
  const { pedidoId } = useParams<{ pedidoId?: string }>()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [managedBranches, setManagedBranches] = useState<Restaurante[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [branchesError, setBranchesError] = useState('')
  const [branchesVersion, setBranchesVersion] = useState(0)
  const operatingRestaurant = managedBranches.find(branch => branch.id === selectedBranchId) || restaurante
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

  useEffect(() => {
    loadRestaurante()
  }, [])

  const loadRestaurante = async () => {
    setLoading(true)
    setNetworkError(false)
    try {
      const res = await getMyRestaurante()
      setRestaurante(res)
      
      // Solicitar permisos de notificación si no se han pedido
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch (e) {
      console.error(e)
      setNetworkError(true)
    } finally {
      setLoading(false)
    }
  }

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
      document.querySelector(window.innerWidth < 1024 ? `#mobile-tour-${id}` : `#desktop-tour-${id}`) as Element

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
            onClick={loadRestaurante}
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
    <div className="restaurant-portal">

      {/* ── Banner: Audio no desbloqueado ── */}
      <AnimatePresence>
        {!audioDesbloqueado && (
          <motion.button
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            onClick={desbloquearAudio}
            className="restaurant-portal__audio-notice"
          >
            <BellRing size={16} />
            Toca aquí para activar las alertas de sonido de nuevos pedidos
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* ── Sidebar (Desktop) ── */}
      <aside className="restaurant-portal__sidebar">
          
          <div className="restaurant-portal__brand">
            <div>
              <h1><BrandLogo /></h1>
              <p>Panel para restaurantes</p>
            </div>
          </div>

          <NavButton 
            id="desktop-tour-dashboard"
            active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" 
            onClick={() => navigateTab('dashboard')}
          />
          
          <div className="restaurant-portal__section-label">
            Gestión de Menú
          </div>
          
          <NavButton 
            id="desktop-tour-pedidos"
            active={activeTab === 'pedidos'} icon={<BellRing size={20}/>} label="Pedidos Activos" 
            onClick={() => navigateTab('pedidos')}
          />
          
          <NavButton 
            id="desktop-tour-platillos"
            active={activeTab === 'productos'} icon={<Utensils size={20}/>} label="Platillos" 
            onClick={() => navigateTab('productos')}
          />
          <NavButton 
            id="desktop-tour-combos"
            active={activeTab === 'combos'} icon={<Package size={20}/>} label="Combos / Paquetes" 
            onClick={() => navigateTab('combos')}
          />
          <NavButton 
            id="desktop-tour-promos"
            active={activeTab === 'promos'} icon={<Tag size={20}/>} label="Promociones" 
            onClick={() => navigateTab('promos')}
          />
          <NavButton
            id="desktop-tour-cupones"
            active={activeTab === 'cupones'}
            icon={<Ticket size={20}/>}
            label="Cupones"
            onClick={() => navigateTab('cupones')}
          />
          
          <div className="restaurant-portal__section-label">
            Ajustes
          </div>
          
          <NavButton 
            id="desktop-tour-perfil"
            active={activeTab === 'perfil'} icon={<Store size={20}/>} label="Perfil del Negocio" 
            onClick={() => navigateTab('perfil')}
          />

          {/* Oculto temporalmente
          {!restaurante.matriz_id && (
            <NavButton 
              id="desktop-tour-sucursales"
              active={activeTab === 'sucursales'} icon={<Store size={20}/>} label="Sucursales" 
              onClick={() => setActiveTab('sucursales')} 
            />
          )}
          */}
          
          <div className="restaurant-portal__sidebar-spacer" />

          {/* Ilustración Decorativa Premium - Socio Estrella */}
          <div className="restaurant-portal__support">
            <Star size={16} aria-hidden="true" />
            <div>
              <p>Socio Estrella</p>
              <span>Estamos para ayudarte</span>
            </div>
          </div>

          {/* User Guide / Logout */}
          <button onClick={handleLogout} className="restaurant-portal__logout">
            <LogOut size={17} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </aside>

      {/* ── Main Content Area ── */}
        <div className="restaurant-portal__main">
          
          {/* Top Header inside main content */}
          <header id="tour-welcome" className="restaurant-portal__header">
            <div className="restaurant-portal__page-heading">
              <h2>
                {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'pedidos' ? 'Pedidos Activos' : activeTab === 'productos' ? 'Platillos' : activeTab === 'combos' ? 'Combos' : activeTab === 'promos' ? 'Promociones' : activeTab === 'cupones' ? 'Cupones de Descuento' : activeTab === 'sucursales' ? 'Mis Sucursales' : 'Perfil'}
              </h2>
              <div className="restaurant-portal__breadcrumb">Estrella Eats <span>/</span> {activeTab}</div>
            </div>
            
            <div className="restaurant-portal__account">
              <div className="restaurant-portal__restaurant-name">
                <span>{restaurante.nombre}</span>
                <small><i aria-hidden="true" /> Sesión del restaurante</small>
              </div>
              <div className="restaurant-portal__restaurant-avatar" aria-hidden="true">
                <Store size={19} />
              </div>
            </div>
          </header>

          <main className="restaurant-portal__content-scroll">
            <div className="restaurant-portal__content">
              {branchesError && <p role="alert">{branchesError} <button type="button" onClick={() => setBranchesVersion(value => value + 1)}>Reintentar</button></p>}
              {managedBranches.length > 0 && activeTab !== 'sucursales' && activeTab !== 'pedidos' && operatingRestaurant && <div className="portal-branch-picker"><label htmlFor="portal-branch">Administrando</label><select id="portal-branch" value={operatingRestaurant.id} onChange={event => setSelectedBranchId(event.target.value)}>{[restaurante, ...managedBranches].map(branch => <option key={branch.id} value={branch.id}>{branchLabel(branch)}{branch.activo ? '' : ' · Pausada'}</option>)}</select></div>}
              {managedBranches.length > 0 && activeTab === 'pedidos' && <p className="portal-branch-picker">Pedidos de todas tus sucursales. Cada orden indica dónde se prepara.</p>}

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
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${ restaurante.horarios && Object.values(restaurante.horarios).some((d: any) => d?.activo) ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-700'}`}>
                        {restaurante.horarios && Object.values(restaurante.horarios).some((d: any) => d?.activo) ? <CheckCircle2 size={12}/> : <span className="w-3 h-3 rounded-full border-2 border-amber-400 shrink-0"/>}
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
                    <PedidosView key={`${restaurante.id}:${branchesVersion}`} restaurante={restaurante} highlightedPedidoId={highlightedPedidoId} onClearHighlight={() => setHighlightedPedidoId(null)} onOpenOrders={openOrders} />
                  </Suspense>
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeTab !== 'pedidos' && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
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
                      {activeTab === 'sucursales' && <SucursalesView restaurante={restaurante} onManage={branch => { setSelectedBranchId(branch.id); navigateTab('productos') }} onSaved={() => setBranchesVersion(value => value + 1)} />}
                    </Suspense>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="restaurant-portal__mobile-nav" aria-label="Navegación del restaurante">
        <MobileNavBtn id="mobile-tour-dashboard" active={activeTab === 'dashboard'} icon={<LayoutDashboard size={22}/>} label="Inicio" onClick={() => navigateTab('dashboard')} />
        <MobileNavBtn id="mobile-tour-pedidos" active={activeTab === 'pedidos'} icon={<BellRing size={22}/>} label="Pedidos" onClick={() => navigateTab('pedidos')} />
        <MobileNavBtn id="mobile-tour-platillos" active={activeTab === 'productos'} icon={<Utensils size={22}/>} label="Platillos" onClick={() => navigateTab('productos')} />
        <MobileNavBtn id="mobile-tour-combos" active={activeTab === 'combos'} icon={<Package size={22}/>} label="Combos" onClick={() => navigateTab('combos')} />
        <MobileNavBtn id="mobile-tour-promos" active={activeTab === 'promos'} icon={<Tag size={22}/>} label="Promos" onClick={() => navigateTab('promos')} />
        <MobileNavBtn id="mobile-tour-cupones" active={activeTab === 'cupones'} icon={<Ticket size={22}/>} label="Cupones" onClick={() => navigateTab('cupones')} />
        <MobileNavBtn id="mobile-tour-perfil" active={activeTab === 'perfil'} icon={<Store size={22}/>} label="Perfil" onClick={() => navigateTab('perfil')} />
        {/* Oculto temporalmente
        {!restaurante.matriz_id && (
          <MobileNavBtn id="mobile-tour-sucursales" active={activeTab === 'sucursales'} icon={<Store size={22}/>} label="Sucursales" onClick={() => setActiveTab('sucursales')} />
        )}
        */}
      </nav>
    </div>
  )
}

function NavButton({ id, active, icon, label, onClick }: { id?: string, active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`restaurant-portal__nav-button${active ? ' is-active' : ''}`}
    >
      <span className="restaurant-portal__nav-icon">
        {icon}
      </span>
      <span className="restaurant-portal__nav-label">
        {label}
      </span>
    </button>
  )
}

function MobileNavBtn({ id, active, icon, label, onClick }: { id?: string, active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`restaurant-portal__mobile-nav-button${active ? ' is-active' : ''}`}
    >
      <div className="restaurant-portal__mobile-nav-icon">
        {icon}
      </div>
      <span>
        {label}
      </span>
    </button>
  )
}
