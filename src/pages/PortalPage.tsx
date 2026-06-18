import { useState, useEffect } from 'react'
import { LogOut, LayoutDashboard, Utensils, Tag, Package, Store, Loader2, Star } from 'lucide-react'
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
const PerfilView = lazy(() => import('./views/PerfilView').then(m => ({ default: m.PerfilView })))

export function PortalPage() {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'productos' | 'combos' | 'promos' | 'perfil'>('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRestaurante()
  }, [])

  const loadRestaurante = async () => {
    const res = await getMyRestaurante()
    setRestaurante(res)
    setLoading(false)
  }

  useEffect(() => {
    if (restaurante && !localStorage.getItem('onboarding_b2b_done')) {
      const driverObj = driver({
        showProgress: true,
        doneBtnText: '¡Entendido!',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Atrás',
        steps: [
          { popover: { title: '¡Bienvenido a tu Panel!', description: 'Aquí podrás gestionar todo lo relacionado con tu menú en la app. Te daremos un recorrido rápido por las opciones.' } },
          { element: '#tour-dashboard', popover: { title: 'Panel Principal', description: 'Aquí encontrarás el link a tu Menú Digital y el código QR que puedes imprimir para tus mesas.' } },
          { element: '#tour-platillos', popover: { title: 'Tus Platillos', description: 'Desde aquí agregarás tu menú, precios y fotos. Los cambios se reflejan al instante.' } },
          { element: '#tour-combos', popover: { title: 'Combos', description: 'Crea paquetes combinando varios productos para vender más.' } },
          { element: '#tour-promos', popover: { title: 'Promociones', description: 'Lanza ofertas especiales por tiempo limitado.' } },
          { element: '#tour-perfil', popover: { title: 'Tu Perfil', description: 'Finalmente, configura tus horarios y datos de tu negocio. ¡Comienza a llenar tu menú ahora mismo!' } }
        ],
        onDestroyStarted: () => {
          localStorage.setItem('onboarding_b2b_done', 'true');
          driverObj.destroy();
        }
      });
      // Pequeño timeout para asegurar que el DOM esté renderizado (especialmente en móvil)
      setTimeout(() => driverObj.drive(), 500);
    }
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

  if (!restaurante) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="card text-center max-w-sm w-full">
          <Store size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Acceso denegado</h2>
          <p className="text-slate-500 mt-2 mb-6">Tu cuenta no está vinculada a ningún restaurante activo en nuestro sistema.</p>
          <button onClick={handleLogout} className="btn btn-ghost w-full">Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-white text-slate-900 font-sans selection:bg-orange-100 overflow-hidden w-full max-w-[100vw]">
      
      {/* ── Sidebar (Desktop) ── */}
      <aside className="hidden lg:flex flex-col w-[260px] xl:w-[280px] bg-gradient-to-b from-[#FFA08A] to-[#FF6B5B] p-5 xl:p-6 gap-2 z-10 text-white relative shadow-[4px_0_24px_rgba(255,107,91,0.2)] overflow-y-auto custom-scrollbar h-full">
          
          <div className="mb-8 mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">{restaurante.nombre.split(' ')[0]}.</h1>
          </div>

          <NavButton 
            id="tour-dashboard"
            active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          <div className="text-[10px] font-black text-white/50 mt-6 mb-2 ml-4 uppercase tracking-widest">
            Gestión de Menú
          </div>
          
          <NavButton 
            id="tour-platillos"
            active={activeTab === 'productos'} icon={<Utensils size={20}/>} label="Platillos" 
            onClick={() => setActiveTab('productos')} 
          />
          <NavButton 
            id="tour-combos"
            active={activeTab === 'combos'} icon={<Package size={20}/>} label="Combos / Paquetes" 
            onClick={() => setActiveTab('combos')} 
          />
          <NavButton 
            id="tour-promos"
            active={activeTab === 'promos'} icon={<Tag size={20}/>} label="Promociones" 
            onClick={() => setActiveTab('promos')} 
          />
          
          <div className="text-[10px] font-black text-white/50 mt-6 mb-2 ml-4 uppercase tracking-widest">
            Ajustes
          </div>
          
          <NavButton 
            id="tour-perfil"
            active={activeTab === 'perfil'} icon={<Store size={20}/>} label="Perfil del Negocio" 
            onClick={() => setActiveTab('perfil')} 
          />
          
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
          <header className="px-6 lg:px-8 py-6 flex items-center justify-between z-20 sticky top-0 bg-white/80 backdrop-blur-xl">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-800">
                {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'productos' ? 'Platillos' : activeTab === 'combos' ? 'Combos' : activeTab === 'promos' ? 'Promociones' : 'Perfil'}
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
                    {activeTab === 'productos' && <MenuProductosView restaurante={restaurante} />}
                    {activeTab === 'combos'    && <MenuCombosView restaurante={restaurante} />}
                    {activeTab === 'promos'    && <MenuPromosView restaurante={restaurante} />}
                    {activeTab === 'perfil'    && <PerfilView restaurante={restaurante} onUpdate={loadRestaurante} />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      {/* ── Bottom Nav (Mobile) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-between">
        <MobileNavBtn id="tour-dashboard" active={activeTab === 'dashboard'} icon={<LayoutDashboard size={22}/>} label="Inicio" onClick={() => setActiveTab('dashboard')} />
        <MobileNavBtn id="tour-platillos" active={activeTab === 'productos'} icon={<Utensils size={22}/>} label="Platillos" onClick={() => setActiveTab('productos')} />
        <MobileNavBtn id="tour-combos" active={activeTab === 'combos'} icon={<Package size={22}/>} label="Combos" onClick={() => setActiveTab('combos')} />
        <MobileNavBtn id="tour-promos" active={activeTab === 'promos'} icon={<Tag size={22}/>} label="Promos" onClick={() => setActiveTab('promos')} />
        <MobileNavBtn id="tour-perfil" active={activeTab === 'perfil'} icon={<Store size={22}/>} label="Perfil" onClick={() => setActiveTab('perfil')} />
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
