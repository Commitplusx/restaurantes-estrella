import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { receiptState, parseOrderReceipt } from '../utils/orderState';

// Payment callbacks and existing checkout links still arrive here. Only a
// persisted, confirmed order can open tracking; URL payment flags are ignored.
export function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('pedido') || searchParams.get('order_id');
  const [status, setStatus] = useState<'loading' | 'validating' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!reference || !/^(?:[A-Z0-9]{6}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(reference)) {
      setStatus('error');
      return;
    }
    let disposed = false, fetching = false, failedReads = 0, resolved = false;
    setStatus('loading');
    const field = reference.length === 36 ? 'id' : 'wb_message_id';
    const value = field === 'id' ? reference : reference.toUpperCase();

    const read = async () => {
      if (disposed || resolved || fetching) return;
      fetching = true;
      try {
        const { data, error } = await supabase.from('pedidos').select('*').eq(field, value).single<unknown>();
        if (disposed) return;
        if (error || !data) throw new Error('No se pudo consultar el pedido.');
        const order = parseOrderReceipt(data);
        const state = receiptState(order);
        failedReads = 0;
        if (state !== 'success') {
          setStatus(state);
          return;
        }
        resolved = true;
        try {
          if (['entregado', 'cancelado', 'rechazado'].includes(order.estado)) {
            localStorage.removeItem('est_active_order');
          } else {
            localStorage.setItem('est_active_order', order.id);
          }
        } catch {
          console.warn('No se pudo guardar el acceso rápido al pedido en este navegador.');
        }
        navigate('/tracker?pedido=' + encodeURIComponent(order.id), { replace: true });
      } catch {
        if (!disposed && ++failedReads >= 3) setStatus('error');
      } finally { fetching = false; }
    };
    void read();
    const poll = setInterval(() => { if (failedReads < 3) void read(); }, 5000);
    const confirmationTimeout = setTimeout(() => {
      if (!disposed && !resolved) {
        failedReads = 3;
        setStatus('error');
      }
    }, 30000);
    const channel = supabase.channel('receipt-' + value)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: field + '=eq.' + value }, () => { void read(); })
      .subscribe();
    const resume = () => {
      if (document.visibilityState === 'visible' && failedReads < 3) void read();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      disposed = true;
      clearInterval(poll);
      clearTimeout(confirmationTimeout);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      void supabase.removeChannel(channel);
    };
  }, [reference, reloadKey, navigate]);

  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center px-4 py-8 font-sans">
      <div className="flex items-center gap-4 mb-6">
        <img src="/logo.png" alt="" className="w-16 h-16 object-contain" />
        <h1 className="text-2xl font-black text-slate-800">Estrella Eats</h1>
      </div>
      <section className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 text-center" aria-live="polite">
        {status === 'error' ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-2xl font-black text-slate-800 mb-3">No pudimos confirmar tu pedido</h2>
            <p className="text-slate-600 mb-8">No hagas otro pedido todavía. Vuelve a consultar para comprobar si se registró.</p>
            <button onClick={() => setReloadKey(key => key + 1)} className="w-full py-4 mb-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Volver a consultar</button>
            <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-800">Volver al inicio</button>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-blue-700 animate-spin motion-reduce:animate-none mx-auto mb-6" aria-hidden="true" />
            <h2 className="text-2xl font-black text-slate-800 mb-3">{status === 'validating' ? 'Esperando confirmación' : 'Abriendo tu seguimiento'}</h2>
            <p className="text-slate-600">{status === 'validating' ? 'Tu pago todavía no está confirmado por el servidor.' : 'Estamos comprobando tu pedido para mostrarte su estado.'}</p>
          </>
        )}
      </section>
    </main>
  );
}
