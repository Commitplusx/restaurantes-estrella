import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { BottomSheet } from '../../components/BottomSheet'

// Componente Genérico Anti-Doble Toque
function ActionButton({ onClick, children, className, loadingText = "Cargando..." }: {
  onClick: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (isProcessing) return; // Cortafuegos
    try {
      setIsProcessing(true);
      await onClick();
    } catch (error) {
      console.error("Error en el botón:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      className={`${className} ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.97]'} transition-all`}
    >
      {isProcessing ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function PedidosView({ restaurante, highlightedPedidoId, onClearHighlight }: { restaurante: Restaurante, highlightedPedidoId?: string | null, onClearHighlight?: () => void }) {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pedidoToPrepare, setPedidoToPrepare] = useState<any>(null)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )
  // Incrementar este valor fuerza la reconexión del canal de Supabase Realtime
  const [channelKey, setChannelKey] = useState(0)

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

    // channelKey en las deps garantiza que al subir (wake-up) el canal se destruye
    // y se vuelve a crear con .subscribe() fresco.
    const channel = supabase
      .channel(`public:pedidos:group:${restaurante.id}:${channelKey}`)
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
  }, [restaurante.id, linkedIds, channelKey])

  // ─── Wake-up: reconectar canales y recargar pedidos cuando la pestaña vuelve ───
  // Browsers throttle WebSockets + timers when a tab is hidden. When the tab
  // becomes visible again we: 1) reload orders from DB (catch missed events),
  // 2) remove+re-add all Supabase channels (force reconnect), 3) restart alarm.
  useEffect(() => {
    if (linkedIds.length === 0) return

    const handleWakeUp = async () => {
      if (document.hidden) return  // tab going to sleep – nothing to do

      // 1. Refetch pedidos from DB (catch events missed while sleeping)
      await loadPedidos(linkedIds)

      // 2. Bump channelKey → React destroys + recreates the Supabase channel
      setChannelKey(k => k + 1)
    }

    document.addEventListener('visibilitychange', handleWakeUp)
    window.addEventListener('focus', handleWakeUp)

    return () => {
      document.removeEventListener('visibilitychange', handleWakeUp)
      window.removeEventListener('focus', handleWakeUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedIds])

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

  // ─── Alarma continua: título dinámico + sonido cada 4s ─────────────────────
  const playBellSound = React.useCallback(() => {
    try {
      const audioElement = document.getElementById('alarm-audio') as HTMLAudioElement;
      if (audioElement) {
        audioElement.currentTime = 0;
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.error('Audio bloqueado:', e))
        }
      }
    } catch (e) {
      console.error('Error playing sound:', e)
    }
  }, [])

  // Ref para el intervalo – permite reiniciarlo desde el wake-up handler
  const alarmIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const startAlarm = React.useCallback(() => {
    if (alarmIntervalRef.current) return  // ya está corriendo
    playBellSound()
    alarmIntervalRef.current = setInterval(() => {
      playBellSound()
    }, 4000)
  }, [playBellSound])

  const stopAlarm = React.useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current)
      alarmIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const pendientes = pedidos.filter(p => p.estado_cocina === 'pendiente' || p.estado_cocina == null)

    if (pendientes.length > 0) {
      document.title = `(${pendientes.length}) ¡NUEVO PEDIDO! 🔔`
      if (notifPermission === 'granted') startAlarm()
    } else {
      document.title = 'Estrella Restaurantes'
      stopAlarm()
    }

    return () => {
      // No detener la alarma en el cleanup: queremos que siga sonando
      // aunque el efecto re-corra. stopAlarm() se llama cuando pendientes===0.
    }
  }, [pedidos, notifPermission, startAlarm, stopAlarm])

  // Reiniciar alarma cuando la pestaña despierta (los setInterval se throttlean)
  useEffect(() => {
    const onWake = () => {
      if (document.hidden) return
      const pendientes = pedidos.filter(p => p.estado_cocina === 'pendiente' || p.estado_cocina == null)
      if (pendientes.length > 0 && notifPermission === 'granted') {
        stopAlarm()   // matar el intervalo viejo throttleado
        startAlarm()  // arrancar uno nuevo limpio
      }
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [pedidos, notifPermission, startAlarm, stopAlarm])

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Audio oculto */}
      <audio id="alarm-audio" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* Barra superior */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-base font-bold text-slate-700">Monitor de Cocina</h3>
        <div className="flex items-center gap-2">
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotifications}
              className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <BellRing size={13} /> Activar alarma
            </button>
          )}
          <button onClick={playBellSound} className="text-xs text-slate-400 flex items-center gap-1.5 hover:text-slate-600 transition-colors">
            <BellRing size={13} /> Probar
          </button>
        </div>
      </div>

      {/* Kanban: 3 columnas con altura fija y scroll interno */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

        {/* ─── Nuevos ─── */}
        <KanbanCol
          title="Nuevos"
          count={nuevos.length}
          headerCls="text-blue-700 bg-blue-600"
          colCls="border-blue-100 bg-blue-50/40"
        >
          <AnimatePresence>
            {nuevos.map(p => (
              <PedidoCard
                key={p.id}
                pedido={p}
                actionLabel="Preparar"
                actionColor="bg-orange-500 hover:bg-orange-600"
                onAction={() => setPedidoToPrepare(p)}
                isHighlighted={p.id === highlightedPedidoId}
              />
            ))}
            {nuevos.length === 0 && <EmptyCol />}
          </AnimatePresence>
        </KanbanCol>

        {/* ─── En Cocina ─── */}
        <KanbanCol
          title="En Cocina"
          count={enCocina.length}
          headerCls="text-orange-700 bg-orange-500"
          colCls="border-orange-100 bg-orange-50/30"
        >
          <AnimatePresence>
            {enCocina.map(p => (
              <PedidoCard
                key={p.id}
                pedido={p}
                actionLabel="¡Listo!"
                actionColor="bg-emerald-500 hover:bg-emerald-600"
                onAction={() => updateEstado(p.id, 'listo_para_recoger')}
                isHighlighted={p.id === highlightedPedidoId}
              />
            ))}
            {enCocina.length === 0 && <EmptyCol />}
          </AnimatePresence>
        </KanbanCol>

        {/* ─── Listos ─── */}
        <KanbanCol
          title="Listos"
          count={listos.length}
          headerCls="text-emerald-700 bg-emerald-500"
          colCls="border-emerald-100 bg-emerald-50/30"
        >
          <AnimatePresence>
            {listos.map(p => {
              const driverCerca = p.estado === 'asignado' || p.estado === 'buscando_repartidor'
              return (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  actionLabel={driverCerca ? 'Entregar' : 'Cerrar'}
                  actionColor="bg-slate-700 hover:bg-slate-800"
                  onAction={() => updateEstado(p.id, 'entregado')}
                />
              )
            })}
            {listos.length === 0 && <EmptyCol />}
          </AnimatePresence>
        </KanbanCol>

      </div>

      {/* Modal: elegir tiempo de preparación */}
      <BottomSheet isOpen={!!pedidoToPrepare} onClose={() => setPedidoToPrepare(null)} title="¿Cuánto tiempo tardará?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            Elige el tiempo estimado de preparación. El cliente recibirá una notificación y asignaremos un repartidor.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[15, 20, 25, 35, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => { if (pedidoToPrepare) updateEstado(pedidoToPrepare.id, 'en_cocina', mins) }}
                className="bg-white border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-black py-3 rounded-xl text-sm transition-all"
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

/* ─── Columna Kanban ─────────────────────────────────────── */
function KanbanCol({ title, count, headerCls, colCls, children }: {
  title: string
  count: number
  headerCls: string
  colCls: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col rounded-xl border overflow-hidden ${colCls}`}>
      {/* Cabecera */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/60 border-b border-inherit shrink-0">
        <span className="text-xs font-bold text-slate-700 flex-1 truncate">{title}</span>
        <span className={`text-white text-[10px] font-black px-1.5 py-0.5 rounded-md ${headerCls}`}>{count}</span>
      </div>
      {/* Scroll interno */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}

/* ─── Tarjeta de Pedido ──────────────────────────────────── */
function PedidoCard({ pedido, actionLabel, actionColor, onAction, isHighlighted }: {
  pedido: any
  actionLabel: string
  actionColor: string
  onAction: () => void
  isHighlighted?: boolean
}) {
  let items: any[] = []
  try {
    items = typeof pedido.items === 'string' ? JSON.parse(pedido.items) : (pedido.items || [])
  } catch(e) {}

  const hora = new Date(pedido.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const driverLabel = (() => {
    if (pedido.estado_cocina === 'pendiente') return null
    const map: Record<string, string> = {
      buscando_repartidor: '🔍 Buscando',
      asignado:            '🛵 En camino',
      en_camino:           '📦 Al cliente',
      entregado:           '✓ Entregado',
      cancelado:           '✕ Cancelado',
    }
    return map[pedido.estado] ?? null
  })()

  return (
    <motion.div
      id={`pedido-${pedido.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      layout
      className={`bg-white rounded-lg border shadow-sm overflow-hidden transition-all duration-200 ${
        isHighlighted
          ? 'border-orange-400 ring-2 ring-orange-300/40'
          : 'border-slate-200'
      }`}
    >
      {/* ── Header: folio + hora + total ── */}
      <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
          #{pedido?.wb_message_id || pedido?.id?.replace(/-/g,'').slice(-5).toUpperCase() || '—'}
        </span>
        <span className="text-[10px] text-slate-300 shrink-0">{hora}</span>
        {pedido.restaurantes?.nombre && (
          <span className="text-[9px] font-semibold text-indigo-500 truncate min-w-0">· {pedido.restaurantes.nombre}</span>
        )}
        <span className="ml-auto text-sm font-black text-emerald-600 shrink-0">${pedido.total}</span>
      </div>

      {/* ── Nombre cliente + estado repartidor ── */}
      <div className="flex items-center justify-between gap-1 px-2.5 pb-1.5 border-b border-slate-100">
        <p className="text-[13px] font-bold text-slate-800 truncate">{pedido.cliente_nombre || 'Cliente Web'}</p>
        {driverLabel && (
          <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
            {driverLabel}
          </span>
        )}
      </div>

      {/* ── Nota / descripción (texto de WhatsApp) ── */}
      {pedido.descripcion && (
        <div className="mx-2.5 mt-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          <p className="text-[13px] font-black text-slate-900 leading-snug whitespace-pre-wrap break-words">
            {pedido.descripcion}
          </p>
        </div>
      )}

      {/* ── PIN DE RECOLECCIÓN ── */}
      {pedido.pickup_pin && (
        <div className="mx-2.5 mt-2 bg-orange-100 border-2 border-orange-400 border-dashed rounded-md px-2 py-1 flex items-center justify-between shadow-sm">
          <span className="text-[10px] font-black text-orange-600">PIN RECOLECCIÓN</span>
          <span className="text-base font-black text-orange-700 tracking-[0.2em]">{pedido.pickup_pin}</span>
        </div>
      )}

      {/* ── Items del pedido ── */}
      {items.length > 0 && (
        <div className="px-2.5 pt-1.5 space-y-1">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
              <p className="text-[13px] font-black text-slate-900 leading-snug">
                <span className="text-orange-500 mr-1">{item.cantidad}×</span>{item.nombre}
              </p>
              {item.opcionesSeleccionadas?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5 ml-4">
                  {item.opcionesSeleccionadas.map((opc: any, i: number) => (
                    <span key={i} className="text-[9px] font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {opc.opcion}{opc.precio_extra > 0 ? ` +$${opc.precio_extra}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Botón acción ── */}
      <div className="px-2.5 pt-2 pb-2.5">
        <ActionButton
          onClick={onAction}
          className={`w-full py-1.5 rounded-md font-bold text-xs text-white ${actionColor}`}
          loadingText="Espere..."
        >
          {actionLabel}
        </ActionButton>
      </div>
    </motion.div>
  )
}

/* ─── Estado vacío ───────────────────────────────────────── */
function EmptyCol() {
  return (
    <div className="flex flex-col items-center justify-center py-8 opacity-40">
      <Store size={20} className="text-slate-400 mb-1" />
      <p className="text-[10px] font-medium text-slate-400">Vacío</p>
    </div>
  )
}
