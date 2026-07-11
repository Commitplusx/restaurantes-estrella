import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, AlertCircle, ShoppingBag, Truck, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { OrderProgressBar } from '../components/OrderProgressBar';

export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pedidoId = searchParams.get('pedido');
  const orderId = searchParams.get('order_id');
  const successParam = searchParams.get('success');
  const paymentStatus = searchParams.get('payment_status');
  const statusParam = searchParams.get('status');
  
  const isSuccess = successParam === 'true' || paymentStatus === 'paid' || statusParam === 'approved';

  const [status, setStatus] = useState<'loading' | 'validating' | 'success' | 'error'>('loading');
  const [pedido, setPedido] = useState<any>(null);
  const [repartidorInfo, setRepartidorInfo] = useState<{ nombre: string; alias?: string } | null>(null);
  const [repartidorRecienAsignado, setRepartidorRecienAsignado] = useState(false);
  // Ref to avoid stale closure bugs in async callbacks (BUG 1 fix)
  const resolvedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const pollIntervalRef = useRef<any>(null);
  const repartidorFetchedRef = useRef(false);

  const fetchRepartidor = useCallback(async (repartidorId: string) => {
    if (repartidorFetchedRef.current || !repartidorId) return;
    repartidorFetchedRef.current = true;
    const { data } = await supabase
      .from('repartidores')
      .select('nombre, alias')
      .or(`user_id.eq.${repartidorId},id.eq.${repartidorId}`) // Busca tanto por UID como por PK directo
      .maybeSingle();
    if (data) {
      setRepartidorInfo(data);
      setRepartidorRecienAsignado(true);
      setTimeout(() => setRepartidorRecienAsignado(false), 5000);
    }
  }, []);

  useEffect(() => {
    if (!pedidoId && !orderId) {
      setStatus('error');
      return;
    }

    // Reset refs on each mount (BUG 1 + 8 fix)
    resolvedRef.current = false;
    confettiFiredRef.current = false;
    let checkChannel: any = null;
    let timeoutId: any = null;

    const fireOnce = () => {
      if (!confettiFiredRef.current) {
        confettiFiredRef.current = true;
        fireConfetti();
      }
    };

    const resolveSuccess = (newPedido: any) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      // Clear poll if running (BUG 1 fix)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setStatus('success');
      setPedido(newPedido);
      fireOnce();
      sessionStorage.removeItem('est_carrito');
      sessionStorage.removeItem('est_checkoutstep');
      sessionStorage.removeItem('est_tipoentrega');
      
      // Guardar el pedido en localStorage para el Floating Tracker
      if (newPedido && !['entregado', 'cancelado', 'rechazado'].includes(newPedido.estado)) {
        localStorage.setItem('est_active_order', newPedido.id);
      } else {
        localStorage.removeItem('est_active_order');
      }
    };

    const RESOLVED_STATES = ['pendiente', 'pagado', 'asignado', 'recibido', 'preparando', 'en_camino', 'entregado', 'en_cocina', 'listo_para_recoger'];

      const fetchPedido = async (retries = 3) => {
      try {
        let query = supabase.from('pedidos').select('*');
        if (pedidoId) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pedidoId);
          if (isUUID) {
            query = query.eq('id', pedidoId);
          } else {
            query = query.eq('wb_message_id', pedidoId);
          }
        } else if (orderId) {
          query = query.eq('id', orderId);  // orderId viene de la URL cuando se usa flujo de pago externo
        }
        
        const { data: pedidoData, error } = await query.single();
        console.log("SuccessPage DEBUG - ID buscado:", pedidoId || orderId);
        console.log("SuccessPage DEBUG - Resultado query:", pedidoData, "Error:", error);

        if (error || !pedidoData) {
          if (retries > 0) {
            setTimeout(() => fetchPedido(retries - 1), 2000);
            return;
          }
          setStatus('error');
          return;
        }

        setPedido(pedidoData);
        
        // BUG FIX: Si ya tiene repartidor al cargar la página, traer sus datos
        if (pedidoData.repartidor_id && !repartidorFetchedRef.current) {
          fetchRepartidor(pedidoData.repartidor_id);
        }

        if (RESOLVED_STATES.includes(pedidoData.estado)) {
          // Ya estaba confirmado, configuramos el canal de progreso continuo
          resolveSuccess(pedidoData);
        } else {
          // Esperando confirmación de pago
          setStatus('validating');
          
          // Fallback manual cada 3 segundos
          pollIntervalRef.current = setInterval(async () => {
            const { data: refreshData } = await supabase
              .from('pedidos')
              .select('*')
              .eq('id', pedidoData.id)
              .single();
            if (refreshData) {
              setPedido(refreshData); // Siempre actualizamos el estado
              if (RESOLVED_STATES.includes(refreshData.estado)) {
                resolveSuccess(refreshData);
              }
            }
          }, 3000);
          
          // Timeout de 15 segundos para el fallback
          timeoutId = setTimeout(() => {
            if (!resolvedRef.current) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              // Si pasaron 8 segundos y no llegó el webhook, pero la URL dice que pagó, 
              // forzamos el éxito para no dejar al usuario atascado.
              if (isSuccess) {
                resolveSuccess(pedidoData);
              } else {
                setStatus('error');
              }
            }
          }, 8000);
        }

        // UNIFICADO: Un solo canal de realtime que siempre actualiza la UI
        checkChannel = supabase.channel(`pedido-updates-${pedidoData.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoData.id}` },
            (payload) => {
              const newData = payload.new;
              setPedido((prev: any) => prev ? { ...prev, ...newData } : newData);

              // Si acaba de asignarse un repartidor, hacer fetch de sus datos
              if (newData.repartidor_id && !repartidorFetchedRef.current) {
                fetchRepartidor(newData.repartidor_id);
              }
              
              if (['entregado', 'cancelado', 'rechazado'].includes(newData.estado)) {
                localStorage.removeItem('est_active_order');
              } else {
                localStorage.setItem('est_active_order', newData.id);
              }

              if (RESOLVED_STATES.includes(newData.estado)) {
                resolveSuccess(newData);
              }
            }
          )
          .subscribe();

      } catch (err) {
        if (retries > 0) {
          setTimeout(() => fetchPedido(retries - 1), 2000);
          return;
        }
        setStatus('error');
      }
    };

    fetchPedido();

    return () => {
      if (checkChannel) supabase.removeChannel(checkChannel);
      if (timeoutId) clearTimeout(timeoutId);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pedidoId, orderId, isSuccess, fetchRepartidor]);

  /** Genera el número corto de orden: EST-XXXXX
   *  Misma lógica que generarNumeroOrden() en utils.ts y PedidosView.
   *  Fuente de verdad: últimos 5 caracteres del UUID sin guiones.
   */
  const getShortTicket = (pedidoRef: any | null) => {
    if (!pedidoRef) return 'EST-00000';
    if (pedidoRef.wb_message_id) return '#' + pedidoRef.wb_message_id;
    return 'EST-' + pedidoRef.id.replace(/-/g, '').slice(-5).toUpperCase();
  };

  const fireConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#34d399', '#10b981', '#059669', '#fcd34d']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#34d399', '#10b981', '#059669', '#fcd34d']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const renderDetalles = (desc: string) => {
    return desc.split('\n').map((line, i) => (
      <p key={i} className="text-sm text-gray-700 leading-relaxed">{line}</p>
    ));
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-start pt-4 pb-4 px-3 sm:px-6 relative overflow-x-hidden font-sans">
      
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md mx-auto flex flex-row items-center justify-start mb-4 px-1 gap-4"
      >
        <div className="w-20 h-20 flex items-center justify-center drop-shadow-md">
           <img src="/logo.png" alt="Estrella Eats" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Estrella Eats</h1>
      </motion.div>

      <div className="w-full max-w-md md:max-w-5xl xl:max-w-6xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {status === 'validating' || status === 'loading' ? (
            <motion.div
              key="validating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-10 w-full flex flex-col items-center text-center border border-slate-100 max-w-md mx-auto"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 overflow-hidden">
                {isSuccess ? (
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                ) : (
                  <motion.div
                    animate={{ x: [-15, 15, -15] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Truck className="w-10 h-10 text-[#FA4A0C]" />
                  </motion.div>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                {isSuccess ? 'Validando Pago' : 'Cargando tu recibo'}
              </h2>
              <p className="text-slate-500 font-medium">
                {isSuccess ? 'Estamos confirmando tu depósito con el banco. Por favor no cierres esta ventana.' : 'Estamos obteniendo los detalles de tu envío...'}
              </p>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-10 w-full flex flex-col items-center text-center border border-slate-100 max-w-md mx-auto"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/10"></div>
                <AlertCircle className="w-10 h-10 text-red-500 relative z-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Pago no encontrado</h2>
              <p className="text-slate-500 mb-8 font-medium">Hubo un problema validando el ticket de tu compra. Si ya se descontó el saldo, por favor contacta al restaurante.</p>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-[20px] transition-colors"
              >
                Volver al inicio
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch"
            >
              {/* === COLUMNA IZQUIERDA: Estatus y Seguimiento === */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full flex flex-col p-5 md:p-8 border border-white/40 relative">
                <div className="flex flex-col items-center text-center">
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-tr from-emerald-400 to-emerald-500 text-white rounded-full flex items-center justify-center mb-3 md:mb-4 shadow-[0_4px_20px_rgba(16,185,129,0.3)] relative"
                  >
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                      <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
                    </motion.div>
                  </motion.div>
                  
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-1 md:mb-2">
                    {pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? 'Pedido Cancelado' : pedido?.estado === 'entregado' ? '¡Disfruta tu comida!' : '¡Orden Confirmada!'}
                  </h1>
                  
                  {pedido?.tipo_pedido === 'tienda' ? (
                    <>
                      <p className="text-emerald-600 font-bold text-sm mb-1">¡Éxito! Te esperamos pronto en la tienda.</p>
                      <p className="text-slate-500 text-sm leading-tight">Comenzaremos a preparar tu pedido.</p>
                    </>
                  ) : pedido?.estado === 'entregado' ? (
                    <>
                      <p className="text-emerald-600 font-bold text-lg mt-1 mb-2">¡Pedido Entregado! 🎉</p>
                      <p className="text-slate-500 text-sm leading-tight">Esperamos que disfrutes tu comida.</p>
                    </>
                  ) : pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? (
                    <>
                      <p className="text-red-500 font-bold text-lg mt-1 mb-2">Pedido Cancelado ❌</p>
                      <p className="text-slate-500 text-sm leading-tight">Tu pedido no pudo ser procesado.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-500 font-medium text-sm mb-4 md:mb-6">
                        {pedido?.estado === 'aceptado' || pedido?.estado === 'en_cocina' ? '¡El restaurante está preparando tu comida! 🍳'
                        : pedido?.estado === 'listo_para_recoger' ? '¡Tu orden está lista para ser recogida! 🏃‍♂️'
                        : pedido?.estado === 'recibido' ? '¡Tu repartidor está en el restaurante verificando tu orden! 🧑‍🍳'
                        : pedido?.estado === 'en_camino' ? '¡Tu repartidor recogió la orden y va en camino! 🛵'
                        : 'Sigue el estado de tu pedido en tiempo real'}
                      </p>
                      
                      {/* Progress Bar */}
                      {pedido && (
                        <div className="w-full pb-4 md:pb-6">
                          <OrderProgressBar currentStatus={pedido.estado} />
                        </div>
                      )}

                      {/* Bloque: Buscando repartidor / Repartidor asignado */}
                      {pedido?.tipo_pedido !== 'tienda' && (
                        <AnimatePresence mode="wait">
                          {repartidorInfo && pedido?.estado !== 'ofrecido' ? (
                            // ✅ Repartidor asignado
                            <motion.div
                              key="asignado"
                              initial={{ opacity: 0, y: 12, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                              className={`mt-2 w-full rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 border ${
                                repartidorRecienAsignado
                                  ? 'bg-emerald-50 border-emerald-200 shadow-md shadow-emerald-100'
                                  : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                repartidorRecienAsignado ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}>
                                <User className={`w-5 h-5 md:w-6 md:h-6 ${repartidorRecienAsignado ? 'text-white' : 'text-slate-500'}`} />
                              </div>
                              <div className="flex flex-col text-left flex-1 overflow-hidden">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                  {repartidorRecienAsignado ? '¡Repartidor Asignado! 🎉' : 'Tu Repartidor'}
                                </span>
                                <span className="text-slate-800 font-black text-base truncate">
                                  {repartidorInfo.alias || repartidorInfo.nombre}
                                </span>
                                <span className="text-slate-500 text-xs flex items-center gap-1 mt-0.5 line-clamp-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {pedido?.estado === 'en_camino' 
                                      ? 'Va en camino hacia tu domicilio' 
                                      : pedido?.estado === 'entregado'
                                      ? 'Entregó tu pedido exitosamente'
                                      : pedido?.estado === 'recibido'
                                      ? 'Está en el restaurante recolectando tu orden'
                                      : 'Va en camino al restaurante a recoger tu orden'}
                                  </span>
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            // 🔍 Buscando repartidor (radar)
                            <motion.div
                              key="buscando"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="mt-2 w-full flex flex-col items-center gap-3 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100"
                            >
                              {/* Radar animado */}
                              <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                                {[0, 1, 2].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="absolute rounded-full border-2 border-[#FA4A0C]/40"
                                    initial={{ width: 24, height: 24, opacity: 0.8 }}
                                    animate={{ width: 56, height: 56, opacity: 0 }}
                                    transition={{
                                      duration: 1.8,
                                      delay: i * 0.6,
                                      repeat: Infinity,
                                      ease: 'easeOut',
                                    }}
                                  />
                                ))}
                                <div className="w-10 h-10 bg-[#FA4A0C] rounded-full flex items-center justify-center z-10 shadow-lg shadow-orange-200">
                                  <Truck className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              <p className="text-slate-500 text-sm font-semibold">Buscando repartidor cercano...</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* === COLUMNA DERECHA: Resumen y Totales === */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full flex flex-col p-5 md:p-8 border border-white/40 h-full justify-between">
                
                <div className="flex flex-col space-y-4 md:space-y-5">
                  <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800">Resumen de Orden</h3>
                    <div className="bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 tracking-widest">
                      {getShortTicket(pedido)}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Restaurante</span>
                      <span className="text-slate-800 font-bold text-sm truncate">{pedido?.restaurante}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cliente</span>
                      <span className="text-slate-800 font-bold text-sm truncate">{pedido?.cliente_nombre}</span>
                    </div>
                    {pedido?.notas && (
                      <div className="flex flex-col col-span-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Método de Pago / Notas</span>
                        <span className="text-slate-800 font-bold text-sm capitalize">{pedido.notas}</span>
                      </div>
                    )}
                  </div>

                  {/* PIN Section */}
                  {pedido?.pin_seguridad && (
                    <div className="flex flex-col items-center justify-center py-5 bg-red-50 rounded-2xl border border-red-100 mt-2">
                      <span className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1 text-center px-4">PIN de Seguridad (Dar al Repartidor)</span>
                      <span className="text-red-600 font-black text-4xl tracking-[0.2em]">{pedido.pin_seguridad}</span>
                    </div>
                  )}

                  {/* Summary Details */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                    <div className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                      <ShoppingBag className="w-4 h-4 text-[#FA4A0C]" />
                      <span className="text-sm tracking-tight">Artículos</span>
                    </div>
                    <div className="pl-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {pedido?.descripcion ? renderDetalles(pedido.descripcion) : <p className="text-xs text-slate-500">Sin detalles</p>}
                    </div>
                  </div>
                </div>

                {/* Totals & Action */}
                <div className="mt-4 pt-4 md:mt-6 md:pt-5 border-t-2 border-dashed border-slate-200/70 flex flex-col gap-4 md:gap-6">
                  {pedido?.total && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                      <span className="text-[#FA4A0C] font-black text-2xl md:text-3xl">${pedido.total.toFixed(2)}</span>
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/')}
                    className="w-full flex items-center justify-center gap-2 bg-[#FA4A0C] hover:bg-[#e0400b] text-white py-3 px-6 md:py-4 rounded-2xl font-black text-sm md:text-base shadow-lg shadow-[#FA4A0C]/20 transition-all active:scale-95"
                  >
                    Volver al Inicio
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
