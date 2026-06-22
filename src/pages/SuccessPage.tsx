import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, MessageCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

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

  useEffect(() => {
    if ((!pedidoId && !orderId) || !isSuccess) {
      setStatus('error');
      return;
    }

    let checkChannel: any = null;
    let timeoutId: any = null;

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

        if (pedidoData.estado === 'asignado' || pedidoData.estado === 'pagado') {
          setStatus('success');
          fireConfetti();
          sessionStorage.removeItem('est_carrito');
          sessionStorage.removeItem('est_checkoutstep');
          sessionStorage.removeItem('est_tipoentrega');
        } else {
          setStatus('validating');
          
          // Poll every 3 seconds as a fallback
          const pollInterval = setInterval(async () => {
            const { data: refreshData } = await supabase
              .from('pedidos')
              .select('estado')
              .eq('id', pedidoData.id)
              .single();
            if (refreshData && (refreshData.estado === 'asignado' || refreshData.estado === 'pagado')) {
              setStatus('success');
              setPedido((prev: any) => ({ ...prev, estado: refreshData.estado }));
              fireConfetti();
              clearInterval(pollInterval);
              if (checkChannel) supabase.removeChannel(checkChannel);
            }
          }, 3000);

          // Realtime subscription
          checkChannel = supabase.channel(`wait-payment-${pedidoData.id}-${Date.now()}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoData.id}` },
              (payload) => {
                if (payload.new.estado === 'asignado' || payload.new.estado === 'pagado') {
                  setStatus('success');
                  setPedido(payload.new);
                  fireConfetti();
                  sessionStorage.removeItem('est_carrito');
                  sessionStorage.removeItem('est_checkoutstep');
                  sessionStorage.removeItem('est_tipoentrega');
                  clearInterval(pollInterval);
                  if (checkChannel) supabase.removeChannel(checkChannel);
                }
              }
            )
            .subscribe();

          // 15 second timeout
          timeoutId = setTimeout(() => {
            if (status !== 'success') {
              clearInterval(pollInterval);
              if (checkChannel) supabase.removeChannel(checkChannel);
            }
          }, 15000);
        }
      } catch (err) {
        console.error('Error fetching pedido:', err);
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
      
      <div className="flex-1 flex flex-col items-center pt-20 px-4 pb-12 relative z-10 max-w-md mx-auto w-full">
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
              className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 p-6 sm:p-8 w-full flex flex-col mt-4"
            >
              <div className="flex flex-col items-center text-center pb-6 border-b-2 border-dashed border-gray-200">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-green-500 text-white rounded-full flex items-center justify-center mb-4 shadow-[0_10px_30px_rgba(16,185,129,0.3)] relative"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                  >
                    <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
                  </motion.div>
                </motion.div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-400 tracking-tight mb-1">¡Pago Exitoso!</h1>
                <p className="text-emerald-600/80 mt-1 font-bold text-lg">Tu orden ha sido confirmada</p>
              </div>

              <div className="py-6 space-y-4">
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
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-4 mt-2">
                    <span className="text-gray-500 font-bold">Total Pagado</span>
                    <span className="text-emerald-600 font-black text-xl">${pedido.total.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl mb-6 shadow-inner border border-slate-100">
                <div className="flex items-center gap-2 text-gray-700 font-bold mb-3">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  <span>Resumen de tu pedido</span>
                </div>
                <div className="pl-1">
                  {pedido?.descripcion ? renderDetalles(pedido.descripcion) : <p className="text-sm text-gray-500">Sin detalles</p>}
                </div>
              </div>

              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
              >
                <MessageCircle className="w-6 h-6" />
                Avisar al Restaurante
              </button>
              
              <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                Al presionar el botón se abrirá WhatsApp con un mensaje preescrito.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
