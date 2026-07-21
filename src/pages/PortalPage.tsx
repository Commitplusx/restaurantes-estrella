import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { LogOut, LayoutDashboard, Utensils, Tag, Package, Store, Loader2, Star, AlertCircle, CheckCircle2, Ticket, BellRing } from 'lucide-react'
import { supabase, getMyRestaurante } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Suspense, lazy } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const MenuProductosView = lazy(() => import('./views/MenuProductosView').then(m => ({ default: m.MenuProductosView })))
const MenuCombosView = lazy(() => import('./views/MenuCombosView').then(m => ({ default: m.MenuCombosView })))
const MenuPromosView = lazy(() => import('./views/MenuPromosView').then(m => ({ default: m.MenuPromosView })))
const CuponesView = lazy(() => import('./views/CuponesView').then(m => ({ default: m.CuponesView })))
const PerfilView = lazy(() => import('./views/PerfilView').then(m => ({ default: m.PerfilView })))
const PedidosView = lazy(() => import('./views/PedidosView').then(m => ({ default: m.PedidosView })))
const SucursalesView = lazy(() => import('./views/SucursalesView').then(m => ({ default: m.SucursalesView })))

export function PortalPage({ initialTab }: { initialTab?: 'dashboard' | 'pedidos' | 'productos' | 'combos' | 'promos' | 'cupones' | 'perfil' | 'sucursales' }) {
  const { pedidoId } = useParams<{ pedidoId?: string }>()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pedidos' | 'productos' | 'combos' | 'promos' | 'cupones' | 'perfil' | 'sucursales'>(initialTab ?? 'dashboard')
  const [highlightedPedidoId, setHighlightedPedidoId] = useState<string | null>(pedidoId ?? null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` }, () => {
        
        // 1. Reproducir timbre con Web Audio API (instantáneo, sin descarga externa)
        tocarTimbre()
        
        // 2. Notificación Push nativa
        if ('Notification' in window && Notification.permission === 'granted') {
           const notif = new Notification('¡Nuevo Pedido Recibido! 🚨', {
             body: `Un cliente acaba de realizar un pedido. Revisa tu Monitor de Cocina.`,
             icon: '/favicon.ico',
           })
           notif.onclick = () => {
             window.focus();
             setActiveTab('pedidos');
             notif.close();
           }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurante, tocarTimbre])

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
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-white text-slate-900 font-sans selection:bg-orange-100 overflow-hidden w-full max-w-[100vw]">

      {/* ── Banner: Audio no desbloqueado ── */}
      <AnimatePresence>
        {!audioDesbloqueado && (
          <motion.button
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            onClick={desbloquearAudio}
            className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-bold py-2.5 px-4 shadow-lg cursor-pointer hover:bg-amber-600 transition-colors"
          >
            <BellRing size={16} className="animate-bounce" />
            Toca aquí para activar las alertas de sonido de nuevos pedidos
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-[260px] xl:w-[280px] bg-gradient-to-b from-[#FFA08A] to-[#FF6B5B] p-5 xl:p-6 gap-2 z-10 text-white relative shadow-[4px_0_24px_rgba(255,107,91,0.2)] overflow-y-auto custom-scrollbar h-full">
          
          <div className="mb-8 mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">{restaurante.nombre.split(' ')[0]}.</h1>
          </div>

          <NavButton 
            id="desktop-tour-dashboard"
            active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          <div className="text-[10px] font-black text-white/50 mt-6 mb-2 ml-4 uppercase tracking-widest">
            Gestión de Menú
          </div>
          
          <NavButton 
            id="desktop-tour-pedidos"
            active={activeTab === 'pedidos'} icon={<BellRing size={20}/>} label="Pedidos Activos" 
            onClick={() => setActiveTab('pedidos')} 
          />
          
          <NavButton 
            id="desktop-tour-platillos"
            active={activeTab === 'productos'} icon={<Utensils size={20}/>} label="Platillos" 
            onClick={() => setActiveTab('productos')} 
          />
          <NavButton 
            id="desktop-tour-combos"
            active={activeTab === 'combos'} icon={<Package size={20}/>} label="Combos / Paquetes" 
            onClick={() => setActiveTab('combos')} 
          />
          <NavButton 
            id="desktop-tour-promos"
            active={activeTab === 'promos'} icon={<Tag size={20}/>} label="Promociones" 
            onClick={() => setActiveTab('promos')} 
          />
          <NavButton
            id="desktop-tour-cupones"
            active={activeTab === 'cupones'}
            icon={<Ticket size={20}/>}
            label="Cupones"
            onClick={() => setActiveTab('cupones')}
          />
          
          <div className="text-[10px] font-black text-white/50 mt-6 mb-2 ml-4 uppercase tracking-widest">
            Ajustes
          </div>
          
          <NavButton 
            id="desktop-tour-perfil"
            active={activeTab === 'perfil'} icon={<Store size={20}/>} label="Perfil del Negocio" 
            onClick={() => setActiveTab('perfil')} 
          />

          {!restaurante.matriz_id && (
            <NavButton 
              id="desktop-tour-sucursales"
              active={activeTab === 'sucursales'} icon={<Store size={20}/>} label="Sucursales" 
              onClick={() => setActiveTab('sucursales')} 
            />
          )}
          
          <div className="flex-1" />

          {/* Ilustración Decorativa Premium - Socio Estrella */}
          <div className="mb-4 p-5 rounded-3xl bg-white/10 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-3 relative z-10 border border-slate-100">
              <Star size={20} className="text-[#FF7A6A] fill-[#FF7A6A]" />
            </div>
            <p className="text-sm font-bold text-white relative z-10">Socio Estrella</p>
            <p className="text-[11px] text-white/70 mt-1 font-medium relative z-10">Soporte: +52 123 456</p>
          </div>

          {/* User Guide / Logout */}
          <button onClick={handleLogout} className="mt-auto p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-3 text-left border border-white/10 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <LogOut size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Cerrar sesión</p>
              <p className="text-[11px] text-white/70 mt-0.5">Salir del panel</p>
            </div>
          </button>
        </aside>

      {/* ── Main Content Area ── */}
        <div className="flex-1 flex flex-col relative w-full overflow-hidden h-full">
          
          {/* Top Header inside main content */}
          <header id="tour-welcome" className="px-6 lg:px-8 py-6 flex items-center justify-between z-20 sticky top-0 bg-white/80 backdrop-blur-xl">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
                {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'pedidos' ? 'Pedidos Activos' : activeTab === 'productos' ? 'Platillos' : activeTab === 'combos' ? 'Combos' : activeTab === 'promos' ? 'Promociones' : activeTab === 'cupones' ? 'Cupones de Descuento' : activeTab === 'sucursales' ? 'Mis Sucursales' : 'Perfil'}
              </h2>
              <div className="text-sm text-slate-400 font-medium mt-1">Inicio / {activeTab}</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{restaurante.nombre}</span>
                <span className="text-[10px] font-bold text-[#FF7A6A] uppercase tracking-widest">Panel Conectado</span>
              </div>
              <div className="w-12 h-12 rounded-[16px] bg-[#FFF0EE] flex items-center justify-center text-[#FF7A6A]">
                <Store size={22} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-8 pb-32 lg:pb-10 overflow-y-auto custom-scrollbar w-full">
            <div className="max-w-5xl mx-auto">

              {/* ── Banner: Perfil Incompleto ── Bug Fix 6: solo en dashboard ── */}
              {!restaurante.perfil_completo && activeTab === 'dashboard' && (
                <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[2rem] p-6 flex flex-col sm:flex-row gap-4 items-start">
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
                      onClick={() => setActiveTab('perfil')}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30"
                    >
                      Completar Perfil →
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <Suspense fallback={
                    <div className="flex flex-col items-center justify-center h-64">
                      <Loader2 className="animate-spin text-[#FF7A6A] w-10 h-10 mb-4" />
                    </div>
                  }>
                    {activeTab === 'dashboard' && <DashboardView restaurante={restaurante} />}
                    {activeTab === 'pedidos'   && <PedidosView restaurante={restaurante} highlightedPedidoId={highlightedPedidoId} onClearHighlight={() => setHighlightedPedidoId(null)} />}
                    {activeTab === 'productos' && <MenuProductosView restaurante={restaurante} />}
                    {activeTab === 'combos'    && <MenuCombosView restaurante={restaurante} />}
                    {activeTab === 'promos'    && <MenuPromosView restaurante={restaurante} />}
                    {activeTab === 'cupones'   && <CuponesView restaurante={restaurante} />}
                    {activeTab === 'perfil'    && <PerfilView restaurante={restaurante} onUpdate={loadRestaurante} />}
                    {activeTab === 'sucursales' && <SucursalesView restaurante={restaurante} />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      {/* ── Bottom Nav (Mobile) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-between overflow-x-auto">
        <MobileNavBtn id="mobile-tour-dashboard" active={activeTab === 'dashboard'} icon={<LayoutDashboard size={22}/>} label="Inicio" onClick={() => setActiveTab('dashboard')} />
        <MobileNavBtn id="mobile-tour-pedidos" active={activeTab === 'pedidos'} icon={<BellRing size={22}/>} label="Pedidos" onClick={() => setActiveTab('pedidos')} />
        <MobileNavBtn id="mobile-tour-platillos" active={activeTab === 'productos'} icon={<Utensils size={22}/>} label="Platillos" onClick={() => setActiveTab('productos')} />
        <MobileNavBtn id="mobile-tour-combos" active={activeTab === 'combos'} icon={<Package size={22}/>} label="Combos" onClick={() => setActiveTab('combos')} />
        <MobileNavBtn id="mobile-tour-promos" active={activeTab === 'promos'} icon={<Tag size={22}/>} label="Promos" onClick={() => setActiveTab('promos')} />
        <MobileNavBtn id="mobile-tour-cupones" active={activeTab === 'cupones'} icon={<Ticket size={22}/>} label="Cupones" onClick={() => setActiveTab('cupones')} />
        <MobileNavBtn id="mobile-tour-perfil" active={activeTab === 'perfil'} icon={<Store size={22}/>} label="Perfil" onClick={() => setActiveTab('perfil')} />
        {!restaurante.matriz_id && (
          <MobileNavBtn id="mobile-tour-sucursales" active={activeTab === 'sucursales'} icon={<Store size={22}/>} label="Sucursales" onClick={() => setActiveTab('sucursales')} />
        )}
      </div>
    </div>
  )
}

function NavButton({ id, active, icon, label, onClick }: { id?: string, active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      id={id}
      onClick={onClick}
      className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-[16px] transition-all duration-200 overflow-hidden ${active ? 'bg-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'hover:bg-white/10'}`}
    >
      <span className={`relative z-10 transition-colors duration-200 ${active ? 'text-white' : 'text-white/70'}`}>
        {icon}
      </span>
      <span className={`relative z-10 font-bold text-sm tracking-tight transition-colors duration-200 ${active ? 'text-white' : 'text-white/80'}`}>
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
      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-1 transition-all"
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-[#FFF0EE] text-[#FF7A6A]' : 'text-slate-400'}`}>
        {icon}
      </div>
      <span className={`text-[9px] font-bold tracking-wider ${active ? 'text-[#FF7A6A]' : 'text-slate-400'}`}>
        {label}
      </span>
    </button>
  )
}
