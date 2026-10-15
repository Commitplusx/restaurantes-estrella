import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Store } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Restaurante } from '../../lib/supabase'
import { BottomSheet } from '../../components/BottomSheet'
import { createKitchenAlarm } from '../../lib/kitchenAlarm'
import {
  createKitchenOrderFeed,
  isActiveKitchenOrder,
  isAwaitingKitchenOrder,
  kitchenOrderId,
} from '../../lib/kitchenOrderState'
import type { KitchenOrderSnapshot } from '../../lib/kitchenOrderState'
import { shouldNotifyRestaurantOrder } from '../../lib/orderNotificationPolicy'
import './PedidosView.css'

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

export function PedidosView({ restaurante, highlightedPedidoId, onClearHighlight, onOpenOrders }: { restaurante: Restaurante, highlightedPedidoId?: string | null, onClearHighlight?: () => void, onOpenOrders?: () => void }) {
  const [pedidos, setPedidos] = useState<KitchenOrderSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [kitchenError, setKitchenError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pedidoToPrepare, setPedidoToPrepare] = useState<KitchenOrderSnapshot | null>(null)
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const [activeStage, setActiveStage] = useState<'new' | 'cooking' | 'ready'>('new')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousTitleRef = useRef<string | null>(null)
  const wakeInFlightRef = useRef(false)
  const orderLoadRequestRef = useRef(0)
  const [orderFeed] = useState(createKitchenOrderFeed)
  // Incrementar este valor fuerza la reconexión del canal de Supabase Realtime
  const [channelKey, setChannelKey] = useState(0)

  const loadPedidos = React.useCallback(async (ids: string[]): Promise<void> => {
    const requestId = ++orderLoadRequestRef.current
    const revision = orderFeed.revision()
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, restaurantes(nombre,nombre_sucursal)')
        .in('restaurante_id', ids)
        .or('and(or(estado.is.null,estado.not.in.(entregado,cancelado,rechazado,pendiente_pago)),or(estado_cocina.is.null,estado_cocina.in.(pendiente,en_cocina,listo_para_recoger)))')
        .order('created_at', { ascending: false })
      if (requestId !== orderLoadRequestRef.current) return
      if (error || !data) throw new Error('kitchen_load_failed')
      orderFeed.reconcile(data, revision)
      setPedidos(orderFeed.activeOrders())
      setLoadError(null)
    } catch {
      if (requestId === orderLoadRequestRef.current) {
        setLoadError('No pudimos actualizar los pedidos. La vista conserva la última información recibida.')
      }
    } finally {
      if (requestId === orderLoadRequestRef.current) setLoading(false)
    }
  }, [orderFeed])

  useEffect(() => () => { orderLoadRequestRef.current += 1 }, [orderFeed])

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
    if (!restaurante.id) return
    let cancelled = false
    const init = async () => {
      const { data, error } = await supabase
        .from('restaurantes')
        .select('id')
        .eq('matriz_id', restaurante.id)
      if (cancelled) return
      if (error) {
        setKitchenError('No pudimos consultar las sucursales. Vuelve a cargar el panel para incluir sus pedidos.')
      }
      
      const ids = [restaurante.id, ...(data?.map(s => s.id) || [])]
      setLinkedIds(ids)
      await loadPedidos(ids)
    }
    init()
    return () => { cancelled = true }
  }, [restaurante.id, loadPedidos])

  useEffect(() => {
    if (!restaurante.id || linkedIds.length === 0) return
    let disposed = false

    // channelKey en las deps garantiza que al subir (wake-up) el canal se destruye
    // y se vuelve a crear con .subscribe() fresco.
    const channel = supabase
      .channel(`public:pedidos:group:${restaurante.id}:${channelKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=in.(${linkedIds.join(',')})` },
        (payload) => {
          if (disposed) return
          const incoming = payload.eventType === 'DELETE' ? payload.old : payload.new
          const orderId = kitchenOrderId(incoming)
          if (!orderId) return
          if (payload.eventType === 'DELETE') {
            orderFeed.remove(orderId)
            setPedidos(orderFeed.activeOrders())
            return
          }
          if (orderFeed.apply(incoming)) {
            setPedidos(orderFeed.activeOrders())
          }
        }
      )
      .subscribe(status => {
        // Refresh after subscribing so orders arriving during reconnect are read.
        if (status === 'SUBSCRIBED' && !disposed) void loadPedidos(linkedIds)
      })

    return () => {
      disposed = true
      supabase.removeChannel(channel)
    }
  }, [restaurante.id, linkedIds, channelKey, orderFeed, loadPedidos])

  // ─── Wake-up: reconectar canales y recargar pedidos cuando la pestaña vuelve ───
  // Browsers throttle WebSockets + timers when a tab is hidden. When the tab
  // becomes visible again we: 1) reload orders from DB (catch missed events),
  // 2) remove+re-add all Supabase channels (force reconnect), 3) restart alarm.
  useEffect(() => {
    if (linkedIds.length === 0) return

    const handleWakeUp = async () => {
      if (document.hidden || wakeInFlightRef.current) return
      wakeInFlightRef.current = true
      try {
        // Refresh before the alarm effect evaluates pending orders. Restarting
        // from stale local state here can ring for an order already accepted.
        await loadPedidos(linkedIds)
        setChannelKey(k => k + 1)
      } finally {
        wakeInFlightRef.current = false
      }
    }

    document.addEventListener('visibilitychange', handleWakeUp)
    window.addEventListener('focus', handleWakeUp)

    return () => {
      document.removeEventListener('visibilitychange', handleWakeUp)
      window.removeEventListener('focus', handleWakeUp)
    }
  }, [linkedIds, loadPedidos])

  // ─── Alarma continua mientras existan pedidos que cocina no ha aceptado ───
  const playBellSound = React.useCallback(() => {
    try {
      const audioElement = audioRef.current;
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

  const stopBellSound = React.useCallback(() => {
    const audioElement = audioRef.current
    if (!audioElement) return
    audioElement.pause()
    audioElement.currentTime = 0
  }, [])

  const kitchenAlarm = useMemo(() => createKitchenAlarm(
    playBellSound,
    stopBellSound,
    {
      schedule: (callback, intervalMs) => window.setInterval(callback, intervalMs),
      cancel: (handle) => window.clearInterval(handle),
    },
  ), [playBellSound, stopBellSound])

  const startAlarm = React.useCallback(() => kitchenAlarm.start(), [kitchenAlarm])
  const stopAlarm = React.useCallback(() => kitchenAlarm.stop(), [kitchenAlarm])

  // The portal keeps this monitor mounted between tabs; dispose its timer/audio when the portal exits.
  useEffect(() => () => {
    kitchenAlarm.dispose()
    if (previousTitleRef.current !== null) {
      document.title = previousTitleRef.current
      previousTitleRef.current = null
    }
  }, [kitchenAlarm])

  useEffect(() => {
    const pendientes = pedidos.filter(isAwaitingKitchenOrder)

    if (pendientes.length > 0) {
      if (previousTitleRef.current === null) previousTitleRef.current = document.title
      document.title = `(${pendientes.length}) ¡NUEVO PEDIDO! 🔔`
      if (notifPermission === 'granted') startAlarm()
      else stopAlarm()
    } else {
      if (previousTitleRef.current !== null) {
        document.title = previousTitleRef.current
        previousTitleRef.current = null
      }
      stopAlarm()
    }
  }, [pedidos, notifPermission, startAlarm, stopAlarm])

  // Enviar Notificación Push real al detectar nuevos pedidos (usando un listener al websocket)
  useEffect(() => {
    if (!restaurante.id || linkedIds.length === 0) return
    const channel = supabase
      .channel(`public:pedidos:notif:${restaurante.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `restaurante_id=in.(${linkedIds.join(',')})` },
        (payload) => {
          // The portal-level listener handles the primary restaurant; this channel
          // covers only linked branches so the owner never gets duplicate notices.
          if (!shouldNotifyRestaurantOrder({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          }, restaurante.id) || !isAwaitingKitchenOrder(payload.new)) return
          if (notifPermission === 'granted' && 'Notification' in window) {
            const notification = new Notification('¡Nuevo pedido!', {
              body: 'Hay una orden nueva para tu restaurante. Revisa el monitor de cocina.',
              icon: '/favicon.ico'
            })
            notification.onclick = () => {
              window.focus()
              setActiveStage('new')
              onOpenOrders?.()
              notification.close()
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurante.id, notifPermission, linkedIds, onOpenOrders])

  // Desbloqueo de audio universal para Celulares/Tablets (iOS Safari / Chrome Android)
  // Los navegadores móviles bloquean el audio automático. Este truco lo "desbloquea"
  // de forma invisible en el primer toque a la pantalla.
  useEffect(() => {
    const unlockAudio = () => {
      const audio = audioRef.current
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
    setKitchenError(null);
    try {
      const current = pedidos.find(order => order.id === id);
      if (!current || !['en_cocina','listo_para_recoger','entregado'].includes(nuevoEstado)) throw new Error('Vuelve a consultar el pedido antes de cambiarlo.');
      const expected = current.estado_cocina ?? null;
      if ((nuevoEstado === 'en_cocina' && expected !== null && expected !== 'pendiente')
        || (nuevoEstado === 'listo_para_recoger' && expected !== 'en_cocina')
        || (nuevoEstado === 'entregado' && (expected !== 'listo_para_recoger' || current.tipo_pedido !== 'tienda'))) throw new Error('El pedido ya cambió de etapa. Actualiza la vista.');
      if (nuevoEstado === 'en_cocina') {
        if (!Number.isInteger(tiempoMinutos) || !tiempoMinutos || tiempoMinutos < 1 || tiempoMinutos > 180) throw new Error('Elige un tiempo de preparación entre 1 y 180 minutos.');
      }
      const {data: result, error} = await supabase.rpc('cambiar_estado_cocina', {
        p_pedido_id: id, p_estado_nuevo: nuevoEstado, p_estado_esperado: expected, p_minutos: tiempoMinutos ?? null,
      }).returns<unknown>();
      const raw = result && typeof result === 'object' && !Array.isArray(result) && 'pedido' in result ? result.pedido : null;
      if (error || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('No se guardó el cambio en cocina. Vuelve a consultar el pedido.');
      const data = raw as Record<string, unknown>;
      if (data.id !== id || data.estado_cocina !== nuevoEstado || typeof data.estado !== 'string' || typeof data.updated_at !== 'string') throw new Error('No se confirmó el cambio en cocina. Vuelve a consultar el pedido.');
      const updatedAt = Date.parse(data.updated_at);
      if (!Number.isFinite(updatedAt)) throw new Error('No se confirmó la fecha del cambio en cocina.');
      const updatedOrder = {...current, ...data}
      orderFeed.apply(updatedOrder)
      setPedidos(orderFeed.activeOrders())
      setPedidoToPrepare(null);
    } catch (error: unknown) {
      setKitchenError(error instanceof Error ? error.message : 'No se pudo actualizar el pedido.');
      console.error('kitchen_update_failed');
    }
  };

  // Ahora las columnas se filtran reaccionando también al estado del repartidor (Global)
  const pedidosActivos = pedidos.filter(isActiveKitchenOrder)
  
  const nuevos = pedidosActivos.filter(isAwaitingKitchenOrder)
  const enCocina = pedidosActivos.filter(p => p.estado_cocina === 'en_cocina')
  // Un pedido desaparece de Listos si el repartidor ya marcó "en_camino" (lo recogió) o si se entregó.
  const listos = pedidosActivos.filter(p => p.estado_cocina === 'listo_para_recoger' && !['en_camino', 'entregado'].includes(p.estado ?? ''))

  if (loading) {
    return <div className="p-8 text-slate-400">Cargando pedidos...</div>
  }

  return (
    <div className="kitchen-monitor">
      {loadError && <p role="alert" className="kitchen-monitor__error">{loadError} <button type="button" onClick={() => void loadPedidos(linkedIds)}>Reintentar</button></p>}
      {kitchenError && <p role="alert" className="kitchen-monitor__error">{kitchenError}</p>}
      {/* Audio oculto */}
      <audio ref={audioRef} className="kitchen-monitor__audio" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* Barra superior */}
      <div className="kitchen-monitor__toolbar">
        <div>
          <p className="kitchen-monitor__eyebrow">Operación en tiempo real</p>
          <h3>Monitor de cocina</h3>
        </div>
        <div className="kitchen-monitor__tools">
          {notifPermission !== 'granted' && (
            <button
              onClick={requestNotifications}
              className="kitchen-monitor__tool-button kitchen-monitor__tool-button--primary"
            >
              <BellRing size={15} /> <span>Activar alarma</span>
            </button>
          )}
          <button onClick={playBellSound} className="kitchen-monitor__tool-button">
            <BellRing size={15} /> <span>Probar sonido</span>
          </button>
        </div>
      </div>

      <div className="kitchen-stage-tabs" role="group" aria-label="Etapas de pedidos">
        <button type="button" aria-pressed={activeStage === 'new'} className={activeStage === 'new' ? 'is-active' : ''} onClick={() => setActiveStage('new')}>
          Nuevos <span>{nuevos.length}</span>
        </button>
        <button type="button" aria-pressed={activeStage === 'cooking'} className={activeStage === 'cooking' ? 'is-active' : ''} onClick={() => setActiveStage('cooking')}>
          En cocina <span>{enCocina.length}</span>
        </button>
        <button type="button" aria-pressed={activeStage === 'ready'} className={activeStage === 'ready' ? 'is-active' : ''} onClick={() => setActiveStage('ready')}>
          Listos <span>{listos.length}</span>
        </button>
      </div>

      {/* Kanban: 3 columnas con altura fija y scroll interno */}
      <div className="kitchen-board">

        {/* ─── Nuevos ─── */}
        <KanbanCol
          stage="new"
          isActiveMobile={activeStage === 'new'}
          title="Nuevos"
          count={nuevos.length}
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
            {nuevos.length === 0 && <EmptyCol label="No hay pedidos nuevos" actionLabel={enCocina.length > 0 ? 'Ver en cocina' : listos.length > 0 ? 'Ver pedidos listos' : undefined} onAction={() => setActiveStage(enCocina.length > 0 ? 'cooking' : 'ready')} />}
          </AnimatePresence>
        </KanbanCol>

        {/* ─── En Cocina ─── */}
        <KanbanCol
          stage="cooking"
          isActiveMobile={activeStage === 'cooking'}
          title="En Cocina"
          count={enCocina.length}
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
            {enCocina.length === 0 && <EmptyCol label="Aún no hay pedidos en cocina" />}
          </AnimatePresence>
        </KanbanCol>

        {/* ─── Listos ─── */}
        <KanbanCol
          stage="ready"
          isActiveMobile={activeStage === 'ready'}
          title="Listos"
          count={listos.length}
        >
          <AnimatePresence>
            {listos.map(p => {
              const pickup = p.tipo_pedido === 'tienda';
              return (
                <PedidoCard
                  key={p.id}
                  pedido={p}
                  actionLabel={pickup ? 'Entregado al cliente' : 'Esperando recogida del repartidor'}
                  actionColor="bg-slate-700 hover:bg-slate-800"
                  onAction={pickup ? () => updateEstado(p.id, 'entregado') : undefined}
                />
              )
            })}
            {listos.length === 0 && <EmptyCol label="No hay pedidos listos" />}
          </AnimatePresence>
        </KanbanCol>

      </div>

      {/* Modal: elegir tiempo de preparación */}
      <BottomSheet isOpen={!!pedidoToPrepare} onClose={() => setPedidoToPrepare(null)} title="¿Cuánto tiempo tardará?">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            Elige el tiempo estimado de preparación. El cliente recibirá el aviso; los pedidos a domicilio buscarán repartidor.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[15, 20, 25, 35, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => { if (pedidoToPrepare) updateEstado(pedidoToPrepare.id, 'en_cocina', mins) }}
                className="kitchen-time-choice"
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
function KanbanCol({ title, count, children, stage, isActiveMobile }: {
  title: string
  count: number
  children: React.ReactNode
  stage: 'new' | 'cooking' | 'ready'
  isActiveMobile: boolean
}) {
  return (
    <section className={`kitchen-board__column kitchen-board__column--${stage}${isActiveMobile ? ' is-active-mobile' : ''}`} aria-label={`${title}: ${count} pedidos`}>
      {/* Cabecera */}
      <div className="kitchen-board__column-heading">
        <span>{title}</span>
        <span className="kitchen-board__count">{count}</span>
      </div>
      {/* Scroll interno */}
      <div className="kitchen-board__orders">
        {children}
      </div>
    </section>
  )
}

function PedidoCard({ pedido, actionLabel, actionColor, onAction, isHighlighted }: {
  pedido: any
  actionLabel: string
  actionColor: string
  onAction?: () => Promise<void> | void
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
      buscando_repartidor: 'Buscando Repartidor',
      asignado:            'Repartidor Asignado',
      en_camino:           'En Camino al Cliente',
      entregado:           'Entregado',
      cancelado:           'Cancelado',
    }
    return map[pedido.estado] ?? null
  })()

  // Helper to parse simple markdown like *bold*
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.trim() === '') return <div key={idx} className="h-1.5" />;
      
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <p key={idx} className="kitchen-order-card__description-line leading-snug">
          {parts.map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
              return <strong key={i} className="font-bold text-slate-900">{part.slice(1, -1)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  }

  return (
    <motion.div
      id={`pedido-${pedido.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      layout
      className={`kitchen-order-card group ${
        isHighlighted
          ? 'is-highlighted'
          : ''
      }`}
    >
      {/* ── Header: folio + hora + total ── */}
      <div className="kitchen-order-card__header">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="kitchen-order-card__reference font-black tracking-wider bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-sm">
              #{pedido?.wb_message_id || pedido?.id?.replace(/-/g,'').slice(-5).toUpperCase() || '—'}
            </span>
            <span className="kitchen-order-card__time font-semibold">{hora}</span>
          </div>
          {pedido.restaurantes?.nombre && (
            <span className="kitchen-order-card__restaurant font-bold truncate mt-0.5">
              {pedido.restaurantes.nombre_sucursal || pedido.restaurantes.nombre}
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="kitchen-order-card__total">${pedido.total}</span>
        </div>
      </div>

      {/* ── Nombre cliente + estado repartidor ── */}
      <div className="kitchen-order-card__customer-row">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <span className="kitchen-order-card__initial text-orange-600 font-black">
                {(pedido.cliente_nombre || 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="kitchen-order-card__customer font-bold truncate">{pedido.cliente_nombre || 'Cliente Web'}</p>
          </div>
          {driverLabel && (
            <span className="kitchen-order-card__driver-label font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
              {driverLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Detalles (WhatsApp Text o Items) ── */}
      <div className="kitchen-order-card__details">
        {pedido.descripcion ? (
          <div className="bg-slate-50/80 border border-slate-100 rounded-lg p-2.5 mt-1.5 shadow-inner">
            {renderMarkdown(pedido.descripcion)}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-1.5 mt-1.5">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="kitchen-order-card__item bg-slate-50 border border-slate-100 rounded-lg p-2 transition-colors hover:bg-slate-100">
                <p className="kitchen-order-card__item-name font-bold leading-snug">
                  <span className="kitchen-order-card__quantity inline-flex items-center justify-center w-5 h-5 rounded bg-orange-100 text-orange-600 mr-1.5">
                    {item.cantidad}x
                  </span>
                  {item.nombre}
                </p>
                {item.opcionesSeleccionadas?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-6.5">
                    {item.opcionesSeleccionadas.map((opc: any, i: number) => (
                      <span key={i} className="kitchen-order-card__option font-medium text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-sm">
                        {opc.opcion}{opc.precio_extra > 0 ? ` +$${opc.precio_extra}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* ── PIN DE RECOLECCIÓN ── */}
        {pedido.pickup_pin && (
          <div className="mt-2.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
              <span className="kitchen-order-card__pin-label font-bold tracking-wide text-orange-800 uppercase">PIN de Entrega</span>
            </div>
            <span className="text-lg font-black text-orange-600 tracking-[0.25em] bg-white px-2 rounded-md shadow-sm border border-orange-100">{pedido.pickup_pin}</span>
          </div>
        )}
      </div>

      {/* ── Botón acción ── */}
      <div className="px-3 pb-3 pt-1">
        {onAction ? <ActionButton
          onClick={onAction}
          className={`kitchen-order-card__action ${
            actionColor.includes('orange') 
              ? 'kitchen-order-card__action--orange'
              : actionColor.includes('emerald')
                ? 'kitchen-order-card__action--green'
                : 'kitchen-order-card__action--dark'
          }`}
          loadingText="Procesando..."
        >
          {actionLabel}
        </ActionButton> : <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold text-slate-600">{actionLabel}. La recogida se confirma en la app.</p>}
      </div>
    </motion.div>
  )
}

/* ─── Estado vacío ───────────────────────────────────────── */
function EmptyCol({ label = 'Vacío', actionLabel, onAction }: { label?: string, actionLabel?: string, onAction?: () => void }) {
  return (
    <div className="kitchen-board__empty">
      <Store size={20} aria-hidden="true" />
      <p className="kitchen-board__empty-label">{label}</p>
      {actionLabel && onAction && <button className="kitchen-board__empty-action" onClick={onAction}>{actionLabel}</button>}
    </div>
  )
}
