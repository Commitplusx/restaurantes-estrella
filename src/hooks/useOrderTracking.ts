import { useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { acceptedDriver } from '../utils/orderState';
import { isTrackingReference, orderTrackingColumns, parseTrackedDriver, parseTrackedOrder, parseTrackedRestaurant } from '../lib/orderTracking';
import type { TrackedDriver, TrackedOrder, TrackedRestaurant } from '../lib/orderTracking';

export function useOrderTracking(reference: string | null) {
  const [pedido, setPedido] = useState<TrackedOrder | null>(null);
  const [repartidor, setRepartidor] = useState<TrackedDriver | null>(null);
  const [restaurante, setRestaurante] = useState<TrackedRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [receivedReference,setReceivedReference] = useState<string | null>(null);
  const [receivedAt,setReceivedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!isTrackingReference(reference)) return;
    let alive = true, running = false, again = false;
    let controller: AbortController | null = null;
    let orderChannel: RealtimeChannel | null = null, driverChannel: RealtimeChannel | null = null;
    let orderId: string | null = null, driverRowId: string | null = null;
    let restaurantId: string | null = null;
    let driverOwner: string | null = null;
    const refresh = async () => {
      if (!alive) return;
      if (running) {again = true; return;}
      running = true; controller = new AbortController();
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
      try {
        const query = supabase.from('pedidos').select(orderTrackingColumns);
        const {data, error: failed} = await query.eq(reference.length === 36 ? 'id' : 'wb_message_id',reference).abortSignal(signal).maybeSingle();
        if (!alive) return;
        if (failed) throw new Error('No pudimos actualizar tu pedido. Revisa tu conexión y vuelve a intentar.');
        if (!data) throw new Error('No encontramos ese pedido. Revisa el enlace que recibiste por WhatsApp.');
        const order = parseTrackedOrder(data); setPedido(order); setReceivedReference(reference); setReceivedAt(Date.now());
        if (orderId !== order.id) {
          if (orderChannel) void supabase.removeChannel(orderChannel);
          orderId = order.id;
          orderChannel = supabase.channel('order-tracker-' + order.id + '-' + crypto.randomUUID())
            .on('postgres_changes',{event:'UPDATE',schema:'public',table:'pedidos',filter:'id=eq.'+order.id},() => void refresh()).subscribe();
        }
        if (order.restaurante_id !== restaurantId) {
          setRestaurante(null);
          if (order.restaurante_id) {
            const result = await supabase.from('restaurantes').select('id,nombre,lat,lng,logo_url').eq('id',order.restaurante_id).abortSignal(signal).maybeSingle();
            if (!alive) return;
            if (result.error) throw new Error('Tu pedido sigue registrado; no pudimos actualizar los datos del restaurante.');
            if (result.data) setRestaurante(parseTrackedRestaurant(result.data));
          }
          restaurantId = order.restaurante_id;
        }
        const owner = acceptedDriver(order);
        if (owner !== driverOwner) {
          driverOwner = owner; setRepartidor(null);
          if (driverChannel) void supabase.removeChannel(driverChannel);
          driverChannel = null; driverRowId = null;
        }
        if (owner) {
          const result = await supabase.from('repartidores').select('id,user_id,nombre,telefono,lat,lng').eq('user_id',owner).abortSignal(signal).maybeSingle();
          if (!alive) return;
          if (result.error) throw new Error('Tu pedido sigue registrado; no pudimos actualizar al repartidor.');
          const driver = result.data ? parseTrackedDriver(result.data,owner) : null;
          setRepartidor(driver);
          if (driver?.id !== driverRowId) {
            if (driverChannel) void supabase.removeChannel(driverChannel);
            driverChannel = null; driverRowId = driver?.id ?? null;
            if (driver) driverChannel = supabase.channel('driver-tracker-' + driver.id + '-' + crypto.randomUUID())
              .on('postgres_changes',{event:'UPDATE',schema:'public',table:'repartidores',filter:'id=eq.'+driver.id},payload => {
                if (!alive || driverOwner !== owner || driverRowId !== driver.id) return;
                try {setRepartidor(parseTrackedDriver(payload.new,owner));} catch {setError('No pudimos actualizar la ubicación del repartidor. El estado del pedido sigue disponible.');}
              }).subscribe();
          }
        } else {
          setRepartidor(null); driverRowId = null;
          if (driverChannel) void supabase.removeChannel(driverChannel);
          driverChannel = null;
        }
        setError('');
      } catch (cause: unknown) {if (alive) {setReceivedReference(reference);setError(cause instanceof Error ? cause.message : 'No pudimos actualizar tu pedido. Intenta de nuevo.');}}
      finally {
        running = false;
        if (alive) {setLoading(false); if (again) {again = false; void refresh();}}
      }
    };
    const resume = () => {if (document.visibilityState === 'visible') void refresh();};
    const timer = window.setInterval(() => {if (document.visibilityState === 'visible' && navigator.onLine) void refresh();},30000);
    document.addEventListener('visibilitychange',resume); window.addEventListener('online',resume);
    void refresh();
    return () => {
      alive = false; controller?.abort(); window.clearInterval(timer);
      document.removeEventListener('visibilitychange',resume); window.removeEventListener('online',resume);
      if (orderChannel) void supabase.removeChannel(orderChannel);
      if (driverChannel) void supabase.removeChannel(driverChannel);
    };
  },[reference,attempt]);
  const validReference = isTrackingReference(reference);
  const current = validReference && receivedReference === reference;
  const matches = current && (reference.length === 36 ? pedido?.id === reference : pedido?.wb_message_id === reference);
  return {pedido:matches ? pedido : null,
    repartidor:matches && pedido && acceptedDriver(pedido) === repartidor?.user_id ? repartidor : null,
    restaurante:matches && pedido?.restaurante_id === restaurante?.id ? restaurante : null,
    loading:validReference && (!current || loading),
    error:!validReference ? 'Este enlace no tiene una referencia válida de pedido.' : current ? error : '',
    receivedAt:current ? receivedAt : null,retry: () => setAttempt(value => value + 1)};
}
