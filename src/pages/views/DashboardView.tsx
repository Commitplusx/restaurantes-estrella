import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { Activity, Utensils, Package, Tag, Loader2 } from 'lucide-react'

export function DashboardView({ restaurante }: { restaurante: Restaurante }) {
  const [stats, setStats] = useState({ platillos: 0, combos: 0, promos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const [
        { count: platillos },
        { count: combos },
        { count: promos }
      ] = await Promise.all([
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
        supabase.from('menu_combos').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id),
        supabase.from('menu_promociones').select('*', { count: 'exact', head: true }).eq('restaurante_id', restaurante.id)
      ])
      
      setStats({
        platillos: platillos || 0,
        combos: combos || 0,
        promos: promos || 0
      })
      setLoading(false)
    }
    loadStats()
  }, [restaurante.id])

  return (
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">¡Hola, {restaurante.nombre}! 👋</h1>
        <p className="text-muted">Bienvenido a tu panel de control. Aquí tienes el resumen de tu menú digital.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', color: 'var(--brand)' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={24} color="var(--brand)" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Platillos</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stats.platillos}</h3>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={24} color="var(--success)" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Paquetes</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stats.combos}</h3>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={24} color="#3b82f6" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Promociones</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stats.promos}</h3>
            </div>
          </div>

        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', background: 'linear-gradient(135deg, var(--surface) 0%, var(--brand-light) 100%)', border: '1px solid #fed7aa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <Activity size={20} color="var(--brand)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Menú público</h3>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Tu menú está visible para todos los clientes en la app principal. 
          Cuando agregues o modifiques platillos, los cambios se reflejarán inmediatamente en el bot de WhatsApp y en la página web.
        </p>
        <button className="btn btn-primary" onClick={() => window.open(`/menu/${restaurante.id}`, '_blank')}>
          Ver cómo lo ve el cliente
        </button>
      </div>
    </div>
  )
}
