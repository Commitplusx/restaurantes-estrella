import { useState, useEffect } from 'react'
import { LogOut, LayoutDashboard, Utensils, Tag, Package, Store } from 'lucide-react'
import { supabase, getMyRestaurante } from '../lib/supabase'
import type { Restaurante } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'


// Sub-pages
import { DashboardView } from './views/DashboardView'
import { MenuProductosView } from './views/MenuProductosView'
import { MenuCombosView } from './views/MenuCombosView'
import { MenuPromosView } from './views/MenuPromosView'

export function PortalPage() {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'productos' | 'combos' | 'promos'>('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyRestaurante().then(res => {
      setRestaurante(res)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Cargando portal...</div>

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* ── Topbar ── */}
      <header style={{ 
        background: 'var(--surface)', borderBottom: '1px solid var(--border)', 
        padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={18} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{restaurante.nombre}</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }}/>
              Portal Activo
            </span>
          </div>
        </div>
        
        <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.5rem' }} title="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Sidebar (Desktop) ── */}
        <aside style={{ 
          width: 240, background: 'var(--bg)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', gap: '0.5rem'
        }} className="hide-mobile">
          <NavButton 
            active={activeTab === 'dashboard'} icon={<LayoutDashboard size={18}/>} label="Dashboard" 
            onClick={() => setActiveTab('dashboard')} 
          />
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginTop: '1rem', marginBottom: '0.25rem', paddingLeft: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
            Gestión de Menú
          </div>
          <NavButton 
            active={activeTab === 'productos'} icon={<Utensils size={18}/>} label="Platillos" 
            onClick={() => setActiveTab('productos')} 
          />
          <NavButton 
            active={activeTab === 'combos'} icon={<Package size={18}/>} label="Combos / Paquetes" 
            onClick={() => setActiveTab('combos')} 
          />
          <NavButton 
            active={activeTab === 'promos'} icon={<Tag size={18}/>} label="Promociones" 
            onClick={() => setActiveTab('promos')} 
          />
        </aside>

        {/* ── Main Content Area ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', padding: '1rem' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && <DashboardView restaurante={restaurante} />}
                {activeTab === 'productos' && <MenuProductosView restaurante={restaurante} />}
                {activeTab === 'combos'    && <MenuCombosView restaurante={restaurante} />}
                {activeTab === 'promos'    && <MenuPromosView restaurante={restaurante} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav style={{ 
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', padding: '0.5rem', paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))'
      }} className="show-mobile">
        <MobileNavBtn active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Inicio" onClick={() => setActiveTab('dashboard')} />
        <MobileNavBtn active={activeTab === 'productos'} icon={<Utensils size={20}/>} label="Menú" onClick={() => setActiveTab('productos')} />
        <MobileNavBtn active={activeTab === 'combos'} icon={<Package size={20}/>} label="Combos" onClick={() => setActiveTab('combos')} />
        <MobileNavBtn active={activeTab === 'promos'} icon={<Tag size={20}/>} label="Promos" onClick={() => setActiveTab('promos')} />
      </nav>

      {/* Mobile styles inline for quick setup */}
      <style>{`
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '0.75rem 1rem',
        borderRadius: 12, border: 'none', background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 600 : 500,
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left'
      }}
    >
      <span style={{ color: active ? 'var(--brand)' : 'inherit' }}>{icon}</span>
      {label}
    </button>
  )
}

function MobileNavBtn({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', color: active ? 'var(--brand)' : 'var(--muted)',
        padding: '0.5rem', cursor: 'pointer'
      }}
    >
      {icon}
      <span style={{ fontSize: '0.65rem', fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  )
}
