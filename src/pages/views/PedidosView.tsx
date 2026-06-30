import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Check, ChefHat, Clock, AlertCircle, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'

export function PedidosView({ restaurante }: { restaurante: Restaurante }) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )

  useEffect(() => {
    if (!restaurante) return
    loadPedidos()

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`public:pedidos:${restaurante.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=eq.${restaurante.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPedidos((prev) => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setPedidos((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            )
          } else if (payload.eventType === 'DELETE') {
            setPedidos((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurante.id])

  const loadPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('restaurante_id', restaurante.id)
      // Solo mostramos pedidos activos en base al estado de la cocina
      .in('estado_cocina', ['pendiente', 'en_cocina', 'listo_para_recoger'])
      .order('created_at', { ascending: false })

    if (data) setPedidos(data)
    setLoading(false)
  }

  // Alarma continua y título dinámico para pedidos sin aceptar
  useEffect(() => {
    const pendientes = pedidos.filter(p => p.estado_cocina === 'pendiente' || p.estado_cocina == null)
    
    if (pendientes.length > 0) {
      document.title = `(${pendientes.length}) ¡NUEVO PEDIDO! 🔔`
      // Hacemos sonar la campana cada 4 segundos
      const interval = setInterval(() => {
        if (notifPermission === 'granted') {
          playBellSound()
        }
      }, 4000)
      
      // Reproducir también inmediatamente al detectar
      if (notifPermission === 'granted') playBellSound()

      return () => {
        clearInterval(interval)
        document.title = 'Estrella Restaurantes'
      }
    } else {
      document.title = 'Estrella Restaurantes'
    }
  }, [pedidos, notifPermission])

  const playBellSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.volume = 1.0
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((e) => console.error('Audio play blocked:', e))
      }
    } catch (e) {
      console.error('Error playing sound:', e)
    }
  }

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        playBellSound()
      }
    }
  }

  const updateEstado = async (id: string, nuevoEstado: string) => {
    // Guardar estado previo para rollback
    const estadoPrevio = pedidos.find(p => p.id === id)?.estado_cocina
    try {
      // Actualización optimista del UI
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado_cocina: nuevoEstado } : p))
      )
      // Solo actualiza estado_cocina. El campo 'estado' (logística del repartidor)
      // lo maneja únicamente la APK de Flutter para no interferir con el flujo del repartidor.
      const { error } = await supabase.from('pedidos').update({ 
        estado_cocina: nuevoEstado
      }).eq('id', id)
      if (error) throw error
      
      // Si cambia de estado en cocina, notificar
      if (nuevoEstado === 'en_cocina' || nuevoEstado === 'listo_para_recoger') {
        const tipo = nuevoEstado === 'en_cocina' ? 'preparando' : 'comida_lista'
        const { error: invokeErr } = await supabase.functions.invoke('notificar-whatsapp', {
          body: { tipo, pedido_id: id, restaurante: restaurante.nombre }
        })
        if (invokeErr) {
          console.error(`Error al invocar webhook de WA para ${tipo}:`, invokeErr)
        }
      }
    } catch (e) {
      console.error('Error actualizando estado, revirtiendo:', e)
      // Rollback: restaurar el estado previo en el UI
      if (estadoPrevio) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, estado_cocina: estadoPrevio } : p))
        )
      }
    }
  }

  // Ahora las columnas se basan exclusivamente en el estado_cocina, no se mezclan con el repartidor.
  const nuevos = pedidos.filter(p => p.estado_cocina === 'pendiente')
  const enCocina = pedidos.filter(p => p.estado_cocina === 'en_cocina')
  const listos = pedidos.filter(p => p.estado_cocina === 'listo_para_recoger')

  if (loading) {
    return <div className="p-8 text-slate-400">Cargando pedidos...</div>
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Monitor de Cocina</h3>
        <div className="flex gap-4">
          {notifPermission !== 'granted' && (
            <button 
              onClick={requestNotifications} 
              className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <BellRing size={16} /> Activar Notificaciones
            </button>
          )}
          <button onClick={playBellSound} className="text-sm text-slate-400 flex items-center gap-2 hover:text-slate-600 transition-colors">
            <BellRing size={16} /> Probar Timbre
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Columna: Nuevos */}
        <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100 h-full flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={16} className="stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-slate-700">Nuevos</h4>
            <div className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{nuevos.length}</div>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
            <AnimatePresence>
              {nuevos.map(p => (
                <PedidoCard 
                  key={p.id} 
                  pedido={p} 
                  actionLabel="Empezar a Preparar" 
                  actionColor="bg-orange-500 hover:bg-orange-600"
                  onAction={() => updateEstado(p.id, 'en_cocina')}
                />
              ))}
              {nuevos.length === 0 && <EmptyState text="No hay pedidos nuevos." />}
            </AnimatePresence>
          </div>
        </div>

        {/* Columna: En Cocina */}
        <div className="bg-orange-50/30 rounded-3xl p-4 border border-orange-100/50 h-full flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <ChefHat size={16} className="stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-slate-700">En Cocina</h4>
            <div className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{enCocina.length}</div>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
            <AnimatePresence>
              {enCocina.map(p => (
                <PedidoCard 
                  key={p.id} 
                  pedido={p} 
                  actionLabel="¡Listo para recoger!" 
                  actionColor="bg-emerald-500 hover:bg-emerald-600"
                  onAction={() => updateEstado(p.id, 'listo_para_recoger')}
                />
              ))}
              {enCocina.length === 0 && <EmptyState text="Nada preparándose ahora." />}
            </AnimatePresence>
          </div>
        </div>

        {/* Columna: Listos */}
        <div className="bg-emerald-50/30 rounded-3xl p-4 border border-emerald-100/50 h-full flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Check size={16} className="stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-slate-700">Listos</h4>
            <div className="ml-auto bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">{listos.length}</div>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
            <AnimatePresence>
              {listos.map(p => (
                <PedidoCard 
                  key={p.id} 
                  pedido={p} 
                  actionLabel="Esperando al Repartidor..." 
                  actionColor="bg-slate-200 text-slate-400 cursor-not-allowed"
                  onAction={() => {}}
                />
              ))}
              {listos.length === 0 && <EmptyState text="No hay pedidos listos." />}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  )
}

function PedidoCard({ pedido, actionLabel, actionColor, onAction }: { pedido: any, actionLabel: string, actionColor: string, onAction: () => void }) {
  // Parse items safely if it's JSON or string
  let items = []
  try {
    items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items
  } catch(e) {}

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      layout
      className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold text-slate-400 tracking-wider">#{pedido?.wb_message_id || pedido?.id?.replace(/-/g, '').slice(-5).toUpperCase() || 'N/A'}</span>
          <h5 className="font-bold text-slate-800 mt-1">{pedido.cliente_nombre || 'Cliente Web'}</h5>
        </div>
        <span className="text-sm font-bold text-[#FF7A6A]">${pedido.total}</span>
      </div>

      {pedido.descripcion && (
        <div className="mb-3 flex items-start gap-2 bg-amber-50 p-2 rounded-lg text-xs text-amber-800 border border-amber-100">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p className="leading-tight">{pedido.descripcion}</p>
        </div>
      )}

      {/* Lista de productos minimizada */}
      <div className="space-y-1.5 mb-4">
        {items?.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-slate-600 font-medium"><span className="text-slate-400 mr-1">{item.cantidad}x</span> {item.nombre}</span>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-sm text-slate-400 italic">Ver notas del pedido.</div>
        )}
      </div>

      <button 
        onClick={onAction}
        className={`w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-sm ${actionColor}`}
      >
        {actionLabel}
      </button>
    </motion.div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
        <Store size={20} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-400">{text}</p>
    </div>
  )
}
