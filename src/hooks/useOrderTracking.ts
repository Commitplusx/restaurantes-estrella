import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createTrackingHints } from '../lib/trackingHints';
import { isTrackingReference } from '../lib/orderTracking';
import { parseTrackingProjection, rememberTrackingKey, trackingKey } from '../lib/trackingAccess';
import type { TrackingProjection } from '../lib/trackingAccess';

const watchHints = createTrackingHints((topic, changed) => {
  const channel = supabase.channel(topic).on('broadcast', {event: 'changed'}, changed).subscribe();
  return async () => {
    const status = await supabase.removeChannel(channel);
    if (status !== 'ok') throw new Error('Realtime cleanup failed');
  };
}, () => console.warn('El seguimiento en vivo no está disponible; se comprobará periódicamente.'));

export function useOrderTracking(reference: string | null) {
  const location = useLocation();
  const key = trackingKey(reference, location.hash);
  const [snapshot, setSnapshot] = useState<{reference: string; key: string; value: TrackingProjection; at: number} | null>(null);
  const [failure, setFailure] = useState<{reference: string; key: string; message: string} | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isTrackingReference(reference) || !key) return;
    rememberTrackingKey(reference, key);
    let alive = true, running = false, again = false, topic: string | null = null;
    let stopHints: (() => void) | null = null, controller: AbortController | null = null;
    const refresh = async () => {
      if (!alive) return;
      if (running) { again = true; return; }
      running = true; controller = new AbortController();
      try {
        const {data, error} = await supabase.rpc('storefront_tracking_read', {p_reference: reference, p_token: key})
          .abortSignal(AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]));
        if (!alive) return;
        if (error) throw new Error('No pudimos actualizar tu pedido. Revisa tu conexión y vuelve a intentar.');
        const value = parseTrackingProjection(data);
        if (reference.length === 36 ? value.pedido.id !== reference.toLowerCase() : value.pedido.wb_message_id !== reference) throw new Error('La referencia no corresponde al pedido.');
        rememberTrackingKey(value.pedido.id, key);
        setSnapshot({reference, key, value, at: Date.now()}); setFailure(null);
        if (topic !== value.topic) {
          stopHints?.();
          topic = value.topic;
          stopHints = watchHints(value.topic, () => void refresh());
        }
      } catch (cause: unknown) {
        if (alive) setFailure({reference, key, message: cause instanceof Error ? cause.message : 'No pudimos actualizar tu pedido.'});
      } finally {
        running = false;
        if (alive && again) { again = false; void refresh(); }
      }
    };
    const resume = () => { if (document.visibilityState === 'visible' && navigator.onLine) void refresh(); };
    const timer = window.setInterval(resume, 30000);
    document.addEventListener('visibilitychange', resume); window.addEventListener('online', resume);
    void refresh();
    return () => {
      alive = false; controller?.abort(); window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume);
      stopHints?.();
    };
  }, [reference, key, attempt]);
  const current = snapshot?.reference === reference && snapshot?.key === key ? snapshot : null;
  const error = !isTrackingReference(reference) ? 'Este enlace no tiene una referencia válida de pedido.'
    : !key ? 'Abre el enlace completo de tu pedido que recibiste por WhatsApp; incluye tu acceso privado.'
    : failure?.reference === reference && failure.key === key ? failure.message : '';
  return {pedido: current?.value.pedido ?? null, restaurante: current?.value.restaurante ?? null,
    repartidor: current?.value.repartidor ?? null, receivedAt: current?.at ?? null,
    loading: isTrackingReference(reference) && !!key && !current && !error, error,
    retry: () => setAttempt(value => value + 1)};
}
