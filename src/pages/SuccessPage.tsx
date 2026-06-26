import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, MessageCircle, AlertCircle, ShoppingBag, Star } from 'lucide-react';
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
  const [restauranteInfo, setRestauranteInfo] = useState<any>(null);
  // Ref to avoid stale closure bugs in async callbacks (BUG 1 fix)
  const resolvedRef = useRef(false);
  const confettiFiredRef = useRef(false);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    if ((!pedidoId && !orderId) || !isSuccess) {
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
    };

    const RESOLVED_STATES = ['pendiente', 'pagado', 'asignado', 'recibido', 'preparando', 'en_camino', 'entregado', 'en_cocina', 'listo_para_recoger'];

    const fetchPedido = async (retries = 3) => {
      try {
        let query = supabase.from('pedidos').select('*');
        if (pedidoId) {
          query = query.eq('wb_message_id', pedidoId);
        } else if (orderId) {
          query = query.eq('conekta_order_id', orderId);
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

        if (pedidoData.restaurante) {
          const { data: restData } = await supabase
            .from('restaurantes')
            .select('*')
            .ilike('nombre', pedidoData.restaurante)
            .single();
          if (restData) setRestauranteInfo(restData);
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
            }
          }, 15000);
        }

        // UNIFICADO: Un solo canal de realtime que siempre actualiza la UI
        checkChannel = supabase.channel(`pedido-updates-${pedidoData.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoData.id}` },
            (payload) => {
              setPedido(payload.new); // ¡ESTO ARREGLA EL BUG DE NO ACTUALIZAR!
              if (RESOLVED_STATES.includes(payload.new.estado)) {
                resolveSuccess(payload.new);
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
  }, [pedidoId, orderId, isSuccess]);

  const handleWhatsApp = () => {
    if (!restauranteInfo || !pedido) return;
    const numeroRestaurante = restauranteInfo.telefono ? restauranteInfo.telefono.replace(/\D/g, '') : '';
    const ticketIdFinal = pedidoId || orderId || pedido.id;
    const mensaje = `¡Hola *${restauranteInfo.nombre}*! 👋\nSoy *${pedido.cliente_nombre?.trim()}* y acabo de pagar en línea el siguiente pedido:\n\n${pedido.descripcion}\n\n*Forma de pago:* En Línea (Conekta) 💳\n\n_(Ticket Web: #${ticketIdFinal})_`;
    const waUrl = `https://wa.me/${numeroRestaurante}?text=${encodeURIComponent(mensaje)}`;
    window.open(waUrl, '_blank');
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-8 pb-12 px-4 sm:px-6 relative overflow-hidden font-sans">
      
      {/* Brand Logo Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md mx-auto flex flex-col items-center justify-center mb-6"
      >
        <div className="w-14 h-14 bg-[#FA4A0C] rounded-[18px] flex items-center justify-center shadow-lg shadow-[#FA4A0C]/30 mb-3 relative overflow-hidden">
           <Star className="text-white w-7 h-7 relative z-10" fill="currentColor" />
           <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
        </div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Estrella Eats</h1>
      </motion.div>

      <div className="w-full max-w-md md:max-w-2xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {status === 'validating' || status === 'loading' ? (
            <motion.div
              key="validating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-10 w-full flex flex-col items-center text-center border border-slate-100"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Validando Pago</h2>
              <p className="text-slate-500 font-medium">Estamos confirmando tu depósito con el banco. Por favor no cierres esta ventana.</p>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-10 w-full flex flex-col items-center text-center border border-slate-100"
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
              className="bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full flex flex-col overflow-hidden border border-slate-100/50"
            >
              {/* TOP TICKET: Success Status */}
              <div className="p-8 pb-10 flex flex-col items-center text-center relative bg-gradient-to-b from-white to-slate-50/30">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-emerald-500 text-white rounded-full flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(16,185,129,0.3)] relative"
                >
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                    <CheckCircle2 className="w-8 h-8" strokeWidth={3} />
                  </motion.div>
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">
                  {pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? 'Pedido Cancelado' : pedido?.estado === 'entregado' ? '¡Disfruta tu comida!' : '¡Orden Confirmada!'}
                </h1>
                
                {pedido?.tipo_pedido === 'tienda' ? (
                  <>
                    <p className="text-emerald-600 font-bold text-sm md:text-base mb-2">¡Éxito! Te esperamos pronto en la tienda.</p>
                    <p className="text-slate-500 text-sm leading-tight">Tu pedido ha sido recibido y comenzaremos a prepararlo para que pases a recogerlo.</p>
                  </>
                ) : pedido?.estado === 'entregado' ? (
                  <>
                    <p className="text-emerald-600 font-bold text-lg md:text-xl mt-2 mb-2">¡Pedido Entregado! 🎉</p>
                    <p className="text-slate-500 text-sm leading-tight">Esperamos que disfrutes tu comida. ¡Gracias por tu preferencia!</p>
                  </>
                ) : pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? (
                  <>
                    <p className="text-red-500 font-bold text-lg md:text-xl mt-2 mb-2">Pedido Cancelado ❌</p>
                    <p className="text-slate-500 text-sm leading-tight">Tu pedido no pudo ser procesado o fue cancelado.</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 font-medium text-sm md:text-base mb-5">
                      {pedido?.estado === 'aceptado' || pedido?.estado === 'en_cocina' ? '¡El restaurante está preparando tu comida! 🍳'
                      : pedido?.estado === 'listo_para_recoger' ? '¡Tu orden está lista para ser recogida! 🏃‍♂️'
                      : pedido?.estado === 'recibido' || pedido?.estado === 'en_camino' ? '¡Tu repartidor recogió la orden y va en camino! 🛵'
                      : 'Sigue el estado de tu pedido en tiempo real'}
                    </p>
                    {/* Progress Bar Injection */}
                    {pedido && (
                      <div className="w-full px-2 max-w-sm mx-auto">
                        <OrderProgressBar currentStatus={pedido.estado} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* TICKET DIVIDER CUTOUT */}
              <div className="relative flex items-center justify-center w-full h-8 -my-4 z-10">
                <div className="absolute left-[-16px] w-8 h-8 bg-slate-50 rounded-full border-r border-slate-100 shadow-inner" />
                <div className="absolute right-[-16px] w-8 h-8 bg-slate-50 rounded-full border-l border-slate-100 shadow-inner" />
                <div className="w-full border-t-[3px] border-dashed border-slate-200/80 mx-8" />
              </div>

              {/* BOTTOM TICKET: Details */}
              <div className="p-8 pt-10 flex flex-col space-y-4 bg-white relative">
                
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ticket de Orden</span>
                    <span className="text-slate-800 font-black font-mono bg-slate-100/80 px-2 py-1 rounded-md w-max border border-slate-200/50">#{pedidoId || orderId || pedido?.id?.substring(0,8)}</span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Restaurante</span>
                    <span className="text-slate-800 font-bold truncate max-w-full">{pedido?.restaurante}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Cliente</span>
                    <span className="text-slate-800 font-bold truncate max-w-full">{pedido?.cliente_nombre}</span>
                  </div>
                  {pedido?.notas && (
                    <div className="flex flex-col items-end text-right">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Método de Pago</span>
                      <span className="text-slate-800 font-bold capitalize">{pedido.notas}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-2 w-full" />

                {/* Total */}
                {pedido?.total && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500 font-black text-sm uppercase tracking-wider">Total Pagado</span>
                    <span className="text-[#FA4A0C] font-black text-2xl">${pedido.total.toFixed(2)}</span>
                  </div>
                )}

                {/* Summary Card */}
                <div className="bg-slate-50/50 p-4 rounded-[20px] mb-2 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-800 font-bold mb-3">
                    <ShoppingBag className="w-4 h-4 text-[#FA4A0C]" />
                    <span className="text-sm tracking-tight">Resumen de tu pedido</span>
                  </div>
                  <div className="pl-1">
                    {pedido?.descripcion ? renderDetalles(pedido.descripcion) : <p className="text-xs text-slate-500">Sin detalles</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 px-6 rounded-[20px] font-black text-[15px] shadow-lg shadow-[#25D366]/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Avisar al Restaurante
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
                    Al presionar el botón se abrirá WhatsApp con un mensaje preescrito.
                  </p>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
