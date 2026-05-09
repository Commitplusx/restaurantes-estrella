import { useState, useEffect } from 'react'
import { LogOut, LayoutDashboard, Utensils, Tag, Package, Store, Loader2, Star, ChevronRight } from 'lucide-react'
import { supabase, getMyRestaurante } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'


import { Suspense, lazy } from 'react'

// Lazy loaded sub-pages to reduce initial bundle size
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--brand)' }}>
      <Loader2 size={40} className="animate-spin" />
    </div>
  )

  if (!restaurante) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Acceso denegado</h2>
        <p style={{ color: '#888', marginTop: 8 }}>Tu cuenta no está vinculada a ningún restaurante activo.</p>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ marginTop: '1rem' }}>Cerrar sesión</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      
      {/* ── Topbar ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-5 py-3 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black tracking-tight text-slate-900">{restaurante.nombre}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Portal Activo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`p-2 rounded-xl transition-all ${activeTab === 'perfil' ? 'bg-orange-50 text-orange-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
            title="Mi Perfil"
          >
            <Store size={20} />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all group" title="Cerrar sesión">
            <LogOut size={20} className="group-active:scale-95 transition-transform" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ── Sidebar (Desktop) ── */}
        <aside className="hidden md:flex flex-col w-64 bg-white/60 backdrop-blur-3xl border-r border-slate-200/60 p-4 gap-2 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <NavButton 
            active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Panel Principal" 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          <div className="text-[10px] font-black text-slate-400 mt-6 mb-2 ml-3 uppercase tracking-widest">
            Gestión de Menú
          </div>
          
          <NavButton 
            active={activeTab === 'productos'} icon={<Utensils size={20}/>} label="Platillos" 
            onClick={() => setActiveTab('productos')} 
          />
          <NavButton 
            active={activeTab === 'combos'} icon={<Package size={20}/>} label="Combos / Paquetes" 
            onClick={() => setActiveTab('combos')} 
          />
          <NavButton 
            active={activeTab === 'promos'} icon={<Tag size={20}/>} label="Promociones" 
            onClick={() => setActiveTab('promos')} 
          />
          
          <div className="text-[10px] font-black text-slate-400 mt-6 mb-2 ml-3 uppercase tracking-widest">
            Ajustes
          </div>
          
          <NavButton 
            active={activeTab === 'perfil'} icon={<Store size={20}/>} label="Perfil del Negocio" 
            onClick={() => setActiveTab('perfil')} 
          />
          
          {/* Ilustración o badge decorativo abajo */}
          <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100/50 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
              <Star size={18} className="text-orange-500 fill-orange-500" />
            </div>
            <p className="text-xs font-bold text-slate-800">Socio Estrella</p>
            <p className="text-[10px] text-slate-500 mt-1">Soporte: +52 123 456</p>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 relative">
          {/* Fondo decorativo opcional */}
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white to-transparent pointer-events-none -z-10" />
          
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="animate-spin text-orange-500 w-10 h-10 mb-4" />
                    <p className="text-slate-400 font-medium animate-pulse">Cargando módulo...</p>
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
      <nav className="md:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] px-2 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] z-20 flex justify-between">
        <MobileNavBtn active={activeTab === 'dashboard'} icon={<LayoutDashboard size={22}/>} label="Inicio" onClick={() => setActiveTab('dashboard')} />
        <MobileNavBtn active={activeTab === 'productos'} icon={<Utensils size={22}/>} label="Menú" onClick={() => setActiveTab('productos')} />
        <MobileNavBtn active={activeTab === 'combos'} icon={<Package size={22}/>} label="Combos" onClick={() => setActiveTab('combos')} />
        <MobileNavBtn active={activeTab === 'promos'} icon={<Tag size={22}/>} label="Promos" onClick={() => setActiveTab('promos')} />
        <MobileNavBtn active={activeTab === 'perfil'} icon={<Store size={22}/>} label="Perfil" onClick={() => setActiveTab('perfil')} />
      </nav>

    </div>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-200 group ${
        active 
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
          : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className={`${active ? 'text-orange-500' : 'text-slate-400 group-hover:text-slate-500'} transition-colors`}>
        {icon}
      </span>
      <span className={`font-bold text-sm tracking-tight ${active ? '' : ''}`}>{label}</span>
      {active && <ChevronRight size={16} className="ml-auto text-slate-500" />}
    </button>
  )
}

function MobileNavBtn({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-1 rounded-2xl transition-all ${
        active 
          ? 'text-orange-600' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-orange-100 scale-110' : 'bg-transparent scale-100'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black tracking-wide ${active ? 'text-slate-900' : ''}`}>{label}</span>
    </button>
  )
}
