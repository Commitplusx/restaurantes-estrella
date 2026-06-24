import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, MessageCircle, AlertCircle, ShoppingBag } from 'lucide-react';
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
  
  const isSuccess = successParam === 'true' || paymentStatus === 'paid';

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
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-green-400 to-emerald-600 rounded-b-[3rem] shadow-xl transform -translate-y-10" />
      
      <div className="flex-1 flex flex-col items-center pt-12 md:pt-20 px-4 pb-12 relative z-10 max-w-[360px] md:max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {status === 'validating' || status === 'loading' ? (
            <motion.div
              key="validating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full flex flex-col items-center text-center mt-10"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Validando Pago</h2>
              <p className="text-gray-500">Estamos confirmando tu depósito con el banco. Por favor no cierres esta ventana.</p>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full flex flex-col items-center text-center mt-10"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Pago no encontrado</h2>
              <p className="text-gray-500 mb-6">Hubo un problema validando el ticket de tu compra. Si ya se descontó el saldo, por favor contacta al restaurante.</p>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                Volver al inicio
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 p-5 sm:p-8 w-full flex flex-col md:flex-row md:items-center mt-4"
            >
              {/* Columna Izquierda (Icono, Estado y Progress Bar) */}
              <div className="flex flex-col items-center text-center pb-6 md:pb-0 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-gray-200 md:pr-8 md:w-1/2">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-green-500 text-white rounded-full flex items-center justify-center mb-3 shadow-[0_10px_30px_rgba(16,185,129,0.3)] relative"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                  >
                    <CheckCircle2 className="w-8 h-8" strokeWidth={3} />
                  </motion.div>
                </motion.div>
                <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-400 tracking-tight mb-1">
                  {pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? 'Pedido Cancelado' : pedido?.estado === 'entregado' ? '¡Disfruta tu comida!' : '¡Orden Confirmada!'}
                </h1>
                
                {pedido?.tipo_pedido === 'tienda' ? (
                  <>
                    <p className="text-emerald-600/80 mt-1 font-bold text-sm md:text-base mb-2">¡Éxito! Te esperamos pronto en la tienda.</p>
                    <p className="text-gray-500 text-xs md:text-sm leading-tight">Tu pedido ha sido recibido y comenzaremos a prepararlo para que pases a recogerlo.</p>
                  </>
                ) : pedido?.estado === 'entregado' ? (
                  <>
                    <p className="text-emerald-600 font-bold text-lg md:text-xl mt-4 mb-2">¡Pedido Entregado! 🎉</p>
                    <p className="text-gray-500 text-sm md:text-base leading-tight">Esperamos que disfrutes tu comida. ¡Gracias por tu preferencia!</p>
                  </>
                ) : pedido?.estado === 'cancelado' || pedido?.estado === 'rechazado' ? (
                  <>
                    <p className="text-red-500 font-bold text-lg md:text-xl mt-4 mb-2">Pedido Cancelado ❌</p>
                    <p className="text-gray-500 text-sm md:text-base leading-tight">Tu pedido no pudo ser procesado o fue cancelado.</p>
                  </>
                ) : (
                  <>
                    <p className="text-emerald-600/80 mt-1 font-bold text-sm md:text-base mb-4">
                      {pedido?.estado === 'aceptado' || pedido?.estado === 'en_cocina' ? '¡El restaurante está preparando tu comida! 🍳'
                      : pedido?.estado === 'listo_para_recoger' ? '¡Tu orden está lista para ser recogida! 🏃‍♂️'
                      : pedido?.estado === 'recibido' || pedido?.estado === 'en_camino' ? '¡Tu repartidor recogió la orden y va en camino! 🛵'
                      : 'Sigue el estado de tu pedido en tiempo real'}
                    </p>
                    {/* Progress Bar Injection */}
                    {pedido && (
                      <OrderProgressBar currentStatus={pedido.estado} />
                    )}
                  </>
                )}
              </div>

              {/* Columna Derecha (Detalles y Acciones) */}
              <div className="md:w-1/2 flex flex-col md:pl-8 pt-4 md:pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-medium">Ticket de Orden</span>
                  <span className="text-gray-800 font-bold bg-gray-100 px-3 py-1 rounded-lg">#{pedidoId || orderId || pedido?.id?.substring(0,8)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-medium">Restaurante</span>
                  <span className="text-gray-800 font-semibold">{pedido?.restaurante}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-medium">Cliente</span>
                  <span className="text-gray-800 font-semibold">{pedido?.cliente_nombre}</span>
                </div>
                
                {pedido?.notas && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm font-medium">Método de Pago</span>
                    <span className="text-gray-800 font-semibold capitalize">{pedido.notas}</span>
                  </div>
                )}

                {pedido?.total && (
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 mt-1 mb-4">
                    <span className="text-gray-500 font-bold text-sm">Total Pagado</span>
                    <span className="text-emerald-600 font-black text-lg">${pedido.total.toFixed(2)}</span>
                  </div>
                )}

                <div className="bg-slate-50 p-3 sm:p-4 rounded-[16px] mb-5 shadow-inner border border-slate-100">
                  <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm">Resumen de tu pedido</span>
                  </div>
                  <div className="pl-1">
                    {pedido?.descripcion ? renderDetalles(pedido.descripcion) : <p className="text-xs text-gray-500">Sin detalles</p>}
                  </div>
                </div>

                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white py-3 px-5 rounded-[16px] font-bold text-base shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md mt-auto"
                >
                  <MessageCircle className="w-5 h-5" />
                  Avisar al Restaurante
                </button>
                
                <p className="text-center text-xs text-gray-400 mt-3 font-medium">
                  Al presionar el botón se abrirá WhatsApp con un mensaje preescrito.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
