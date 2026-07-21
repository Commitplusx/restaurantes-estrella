import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Check, ChefHat, Clock, AlertCircle, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { BottomSheet } from '../../components/BottomSheet'

export function PedidosView({ restaurante, highlightedPedidoId, onClearHighlight }: { restaurante: Restaurante, highlightedPedidoId?: string | null, onClearHighlight?: () => void }) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pedidoToPrepare, setPedidoToPrepare] = useState<any>(null)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )

  // Scroll al pedido resaltado cuando carga
  useEffect(() => {
    if (highlightedPedidoId && pedidos.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`pedido-${highlightedPedidoId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Limpiamos después de 3 segundos para que deje de brillar
          setTimeout(() => {
            if (onClearHighlight) onClearHighlight()
          }, 3000)
        }
      }, 500)
    }
  }, [highlightedPedidoId, pedidos, onClearHighlight])

  const [linkedIds, setLinkedIds] = useState<string[]>([restaurante.id])

  // Cargar IDs vinculados (matriz + sucursales) al montar
  useEffect(() => {
    if (!restaurante) return
    const init = async () => {
      const { data } = await supabase
        .from('restaurantes')
        .select('id')
        .eq('matriz_id', restaurante.id)
      
      const ids = [restaurante.id, ...(data?.map(s => s.id) || [])]
      setLinkedIds(ids)
      await loadPedidos(ids)
    }
    init()
  }, [restaurante.id])

  useEffect(() => {
    if (!restaurante || linkedIds.length === 0) return

    // Suscribirse a cambios en tiempo real para todos los IDs
    const channel = supabase
      .channel(`public:pedidos:group:${restaurante.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=in.(${linkedIds.join(',')})` },
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
  }, [restaurante.id, linkedIds])

  const loadPedidos = async (ids: string[]) => {
    const { data } = await supabase
      .from('pedidos')
      .select('*, restaurantes(nombre)')
      .in('restaurante_id', ids)
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
      if (notifPermission === 'granted') {
        playBellSound()
      }

      return () => {
        clearInterval(interval)
        document.title = 'Estrella Restaurantes'
      }
    } else {
      document.title = 'Estrella Restaurantes'
    }
  }, [pedidos, notifPermission])

  // Enviar Notificación Push real al detectar nuevos pedidos (usando un listener al websocket)
  useEffect(() => {
    if (!restaurante || linkedIds.length === 0) return
    const channel = supabase
      .channel(`public:pedidos:notif:${restaurante.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `restaurante_id=in.(${linkedIds.join(',')})` },
        () => {
          if (notifPermission === 'granted' && 'Notification' in window) {
            new Notification('¡NUEVO PEDIDO!', {
              body: `Tienes un nuevo pedido a las ${new Date().toLocaleTimeString()}. ¡Revísalo ahora!`,
              icon: '/favicon.ico'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurante.id, notifPermission, linkedIds])

  // Desbloqueo de audio universal para Celulares/Tablets (iOS Safari / Chrome Android)
  // Los navegadores móviles bloquean el audio automático. Este truco lo "desbloquea"
  // de forma invisible en el primer toque a la pantalla.
  useEffect(() => {
    const unlockAudio = () => {
      const audio = document.getElementById('alarm-audio') as HTMLAudioElement;
      if (audio) {
        // Reproducir y pausar instantáneamente en silencio total
        const prevVolume = audio.volume;
        audio.volume = 0;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = prevVolume;
            // Una vez desbloqueado, quitamos los listeners para no gastar recursos
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
          }).catch(() => {
            // Si falla, restaurar el volumen para intentar de nuevo
            audio.volume = prevVolume;
          });
        }
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  const playBellSound = () => {
    try {
      const audioElement = document.getElementById('alarm-audio') as HTMLAudioElement;
      if (audioElement) {
        audioElement.currentTime = 0; // Reiniciar
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.error('Audio play blocked. Interactúa con la página para activar el sonido.', e))
        }
      }
    } catch (e) {
      console.error('Error playing sound:', e)
    }
  }

  const requestNotifications = async () => {
    // Hacemos sonar el timbre de forma SÍNCRONA al momento del clic
    // Esto garantiza que el navegador no bloquee el audio por ser una promesa asíncrona.
    playBellSound()

    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        alert('✅ Notificaciones activadas correctamente. ¡Asegúrate de NO tener el celular en silencio físico!')
      } else if (perm === 'denied') {
        alert('⚠️ Tu navegador bloqueó las notificaciones.\n\nPara activarlas, haz clic en el ícono de candado (o configuración) junto a la dirección web en la parte de arriba, busca "Notificaciones", cámbialo a "Permitir" y recarga la página.')
      }
    } else {
      alert('Tu navegador no soporta notificaciones.')
    }
  }

  const updateEstado = async (id: string, nuevoEstado: string, tiempoMinutos?: number) => {
    console.log(`[updateEstado] INICIANDO - ID: ${id} | Nuevo: ${nuevoEstado} | Tiempo: ${tiempoMinutos}`)
    // Guardar estado previo para rollback
    const estadoPrevio = pedidos.find(p => p.id === id)?.estado_cocina
    console.log(`[updateEstado] Estado previo guardado: ${estadoPrevio}`)
    try {
      // Actualización optimista del UI
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado_cocina: nuevoEstado } : p))
      )
      
      const updateData: any = { estado_cocina: nuevoEstado }
      if (tiempoMinutos) {
        updateData.tiempo_preparacion_minutos = tiempoMinutos
      }
      // Cuando el restaurante acepta y manda a cocina, activar la búsqueda de repartidor
      if (nuevoEstado === 'en_cocina') {
        updateData.estado = 'buscando_repartidor'
      }
      
      console.log(`[updateEstado] Objeto a enviar a Supabase:`, updateData)
      const { error, data } = await supabase.from('pedidos').update(updateData).eq('id', id).select()
      
      if (error) {
        console.error(`[updateEstado] ERROR SUPABASE UPDATE:`, JSON.stringify(error, null, 2))
        throw error
      }
      console.log(`[updateEstado] EXITO SUPABASE:`, data)
      
      if (nuevoEstado === 'en_cocina') {
        const edgeUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/asignar-repartidor';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        console.log(`[updateEstado] Disparando Edge Function a: ${edgeUrl}`)
        fetch(edgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ record: { id: id } })
        }).catch(e => console.error('Error disparando asignar-repartidor:', e));
      }

      // NOTA: Si cambia de estado en cocina, el Webhook de BD ahora detectará
      // el UPDATE y disparará automáticamente 'notificar-whatsapp' al cliente.
      setPedidoToPrepare(null)
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

  // Ahora las columnas se filtran reaccionando también al estado del repartidor (Global)
  const pedidosActivos = pedidos.filter(p => p.estado !== 'cancelado')
  
  const nuevos = pedidosActivos.filter(p => p.estado_cocina === 'pendiente' || p.estado_cocina == null)
  const enCocina = pedidosActivos.filter(p => p.estado_cocina === 'en_cocina')
  // Un pedido desaparece de Listos si el repartidor ya marcó "en_camino" (lo recogió) o si se entregó.
  const listos = pedidosActivos.filter(p => p.estado_cocina === 'listo_para_recoger' && !['en_camino', 'entregado'].includes(p.estado))

  if (loading) {
    return <div className="p-8 text-slate-400">Cargando pedidos...</div>
  }

  return (
    <div className="h-full flex flex-col">
      {/* Audio oculto cargado previamente para evitar bloqueos del navegador al reproducir */}
      <audio id="alarm-audio" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
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
                  onAction={() => setPedidoToPrepare(p)}
                  isHighlighted={p.id === highlightedPedidoId}
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
                  isHighlighted={p.id === highlightedPedidoId}
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
              {listos.map(p => {
                // Si el repartidor ya está asignado/llegando, sugerimos entregarlo
                const driverCerca = p.estado === 'asignado' || p.estado === 'buscando_repartidor'
                return (
                  <PedidoCard 
                    key={p.id} 
                    pedido={p} 
                    actionLabel={driverCerca ? "Entregar al Repartidor" : "Cerrar Pedido"} 
                    actionColor="bg-slate-800 hover:bg-slate-900 text-white"
                    onAction={() => updateEstado(p.id, 'entregado')}
                  />
                )
              })}
              {listos.length === 0 && <EmptyState text="No hay pedidos listos." />}
            </AnimatePresence>
          </div>
        </div>

      </div>

      <BottomSheet
        isOpen={!!pedidoToPrepare}
        onClose={() => setPedidoToPrepare(null)}
        title="Tiempo Estimado"
      >
        <div className="flex flex-col gap-5">
          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex items-start gap-3">
            <Clock className="text-orange-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              ¿En cuánto tiempo estará listo este pedido? Le avisaremos al cliente y asignaremos un repartidor para que llegue justo a tiempo.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[15, 25, 35, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => {
                  if (pedidoToPrepare) {
                    updateEstado(pedidoToPrepare.id, 'en_cocina', mins)
                  }
                }}
                className="bg-white border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-black py-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all"
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}

function PedidoCard({ pedido, actionLabel, actionColor, onAction, isHighlighted }: { pedido: any, actionLabel: string, actionColor: string, onAction: () => void, isHighlighted?: boolean }) {
  // Parse items safely if it's JSON or string
  let items = []
  try {
    items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items
  } catch(e) {}

  return (
    <motion.div
      id={`pedido-${pedido.id}`}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      layout
      className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-500 ${isHighlighted ? 'border-orange-500 shadow-orange-500/20 shadow-lg scale-[1.02]' : 'border-slate-100'}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex flex-col items-start gap-1">
            <span className="text-xs font-bold text-slate-400 tracking-wider">#{pedido?.wb_message_id || pedido?.id?.replace(/-/g, '').slice(-5).toUpperCase() || 'N/A'}</span>
            {pedido.restaurantes?.nombre && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                📍 {pedido.restaurantes.nombre}
              </span>
            )}
          </div>
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

      {/* Control de estado del Repartidor (Flujo UberEats/Rappi) */}
      {pedido.estado_cocina !== 'pendiente' && (
        <div className="mb-3 flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Repartidor</span>
          {pedido.estado === 'buscando_repartidor' && <span className="text-xs font-bold text-purple-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> Buscando...</span>}
          {pedido.estado === 'asignado' && <span className="text-xs font-bold text-blue-600">Asignado (En camino al local)</span>}
          {pedido.estado === 'en_camino' && <span className="text-xs font-bold text-emerald-600">En camino al cliente</span>}
          {pedido.estado === 'entregado' && <span className="text-xs font-bold text-emerald-600">Entregado</span>}
          {pedido.estado === 'cancelado' && <span className="text-xs font-bold text-red-600">Cancelado</span>}
          {['pendiente', null].includes(pedido.estado) && <span className="text-xs font-medium text-slate-400">En espera</span>}
        </div>
      )}

      {/* Lista de productos detallada */}
      <div className="space-y-3 mb-5">
        {items?.map((item: any, idx: number) => (
          <div key={idx} className="flex flex-col text-sm bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-slate-900 font-black text-[15px] leading-tight">
                <span className="text-white bg-[#FF7A6A] px-1.5 py-0.5 rounded-md text-[13px] mr-2 shadow-sm">{item.cantidad}x</span> 
                {item.nombre}
              </span>
            </div>
            
            {/* Opciones seleccionadas estilo Tags/Badges */}
            {item.opcionesSeleccionadas && item.opcionesSeleccionadas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.opcionesSeleccionadas.map((opc: any, oIdx: number) => (
                  <div key={oIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">{opc.grupo}:</span>
                    <span className="text-slate-800">{opc.opcion}</span>
                    {opc.precio_extra > 0 && <span className="text-emerald-600 ml-0.5">(+${opc.precio_extra})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="text-sm text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg">Ver notas del pedido.</div>
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
