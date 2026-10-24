import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { trackingLink } from '../lib/trackingAccess';
import { Loader2, AlertCircle } from 'lucide-react';
import { receiptState } from '../utils/orderState';

// Payment callbacks and existing checkout links still arrive here. Only a
// persisted, confirmed order can open tracking; URL payment flags are ignored.
export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('pedido') || searchParams.get('order_id');
  const tracking = useOrderTracking(reference);
  const state = tracking.pedido ? receiptState(tracking.pedido) : null;
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState('');
  const request = `${reference}:${attempt}`;
  const status = tracking.error || state === 'error' || expired === request ? 'error' : state === 'validating' ? 'validating' : 'loading';
  useEffect(() => {
    if (state === 'success' || tracking.error) return;
    const timer = window.setTimeout(() => setExpired(request), 30000);
    return () => window.clearTimeout(timer);
  }, [request, state, tracking.error]);
  useEffect(() => {
    if (!tracking.pedido || state !== 'success') return;
    const order = tracking.pedido;
    try {
      if (['entregado', 'cancelado', 'rechazado'].includes(order.estado)) localStorage.removeItem('est_active_order');
      else localStorage.setItem('est_active_order', order.id);
    } catch { /* The private URL also works when browser storage is unavailable. */ }
    navigate(trackingLink('/tracker', order.id), {replace: true});
  }, [tracking.pedido, state, navigate]);

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center px-4 py-8 font-sans">
      <div className="flex items-center gap-4 mb-6">
        <img src="/brand/estrella-mark-v2-192.png" alt="" className="w-16 h-16 object-contain" />
        <h1 className="text-2xl font-black text-slate-800">Estrella Eats</h1>
      </div>
      <section className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 text-center" aria-live="polite">
        {status === 'error' ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-2xl font-black text-slate-800 mb-3">No pudimos confirmar tu pedido</h2>
            <p className="text-slate-600 mb-8">{tracking.error || 'No hagas otro pedido todavía. Vuelve a consultar para comprobar si se registró.'}</p>
            <button onClick={() => { setAttempt(value => value + 1); tracking.retry(); }} className="w-full py-4 mb-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Volver a consultar</button>
            <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-800">Volver al inicio</button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-2xl font-black text-slate-800 mb-3">{status === 'validating' ? 'Esperando confirmación' : 'Abriendo tu seguimiento'}</h2>
            <p className="text-slate-600">{status === 'validating' ? 'Tu pago todavía no está confirmado por el servidor.' : 'Estamos comprobando tu pedido para mostrarte su estado.'}</p>
          </>
        )}
      </section>
    </main>
  );
}
