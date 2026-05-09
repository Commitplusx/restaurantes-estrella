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
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">¡Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">{restaurante.nombre}</span>! 👋</h1>
        <p className="text-slate-500 text-sm md:text-base font-medium">Bienvenido a tu panel de control. Aquí tienes el resumen de tu menú digital.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-100 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Utensils size={28} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">Platillos</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight">{stats.platillos}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package size={28} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">Paquetes</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight">{stats.combos}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-100 transition-all">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Tag size={28} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">Promociones</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight">{stats.promos}</h3>
            </div>
          </div>

        </div>
      )}

      <div className="mt-10 p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-20 -mt-20 transition-all group-hover:bg-orange-500/30"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <Activity size={24} className="text-orange-400" />
            </div>
            <h3 className="text-xl font-black text-white">Menú público en vivo</h3>
          </div>
          <p className="text-slate-300 text-sm md:text-base mb-8 leading-relaxed max-w-2xl">
            Tu menú está visible para todos los clientes en la app principal. 
            Cualquier cambio que realices aquí (precios, fotos, combos) se actualizará instantáneamente para todos tus clientes.
          </p>
          <button 
            className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2" 
            onClick={() => window.open(`/menu/${restaurante.id}`, '_blank')}
          >
            Ver cómo lo ve el cliente
          </button>
        </div>
      </div>
    </div>
  )
}
