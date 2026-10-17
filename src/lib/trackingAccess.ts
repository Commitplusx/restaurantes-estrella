import { acceptedDriver } from '../utils/orderState';
import { isTrackingReference, parseTrackedDriver, parseTrackedOrder, parseTrackedRestaurant } from './orderTracking';
import type { TrackedDriver, TrackedOrder, TrackedRestaurant } from './orderTracking';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const saved = new Map<string, string>();
const STORAGE = 'est_tracking_access_v1';
export function isTrackingKey(value: unknown): value is string { return typeof value === 'string' && UUID.test(value); }
function stored(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([reference, key]) => isTrackingReference(reference) && isTrackingKey(key)).slice(-20));
  } catch { return {}; }
}
export function rememberTrackingKey(reference: string, key: unknown): boolean {
  if (!isTrackingReference(reference) || !isTrackingKey(key)) return false;
  saved.delete(reference); saved.set(reference, key);
  if (saved.size > 20) saved.delete(saved.keys().next().value!);
  try { localStorage.setItem(STORAGE, JSON.stringify(Object.fromEntries(Object.entries({...stored(), [reference]: key}).slice(-20)))); } catch { /* This tab retains access when storage is disabled. */ }
  return true;
}
export function trackingKey(reference: string | null, hash = ''): string | null {
  if (!isTrackingReference(reference)) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.has('clave')) return isTrackingKey(params.get('clave')) ? params.get('clave') : null;
  return saved.get(reference) ?? stored()[reference] ?? null;
}
export function trackingLink(path: '/tracker' | '/success', reference: string, key = trackingKey(reference)): string {
  return path + '?pedido=' + encodeURIComponent(reference) + (isTrackingKey(key) ? '#clave=' + encodeURIComponent(key) : '');
}
export interface TrackingProjection { pedido: TrackedOrder; restaurante: TrackedRestaurant | null; repartidor: TrackedDriver | null; topic: string }
export function parseTrackingProjection(value: unknown): TrackingProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No encontramos el pedido con este enlace. Abre el enlace completo que recibiste por WhatsApp.');
  const raw = value as Record<string, unknown>, pedido = parseTrackedOrder(raw.pedido);
  if (typeof raw.topic !== 'string' || !/^storefront:[0-9a-f]{64}$/.test(raw.topic)) throw new Error('No pudimos comprobar el seguimiento.');
  const restaurante = raw.restaurante == null ? null : parseTrackedRestaurant(raw.restaurante);
  const owner = acceptedDriver(pedido);
  const repartidor = raw.repartidor == null || !owner ? null : parseTrackedDriver(raw.repartidor, owner);
  if (restaurante && restaurante.id !== pedido.restaurante_id) throw new Error('El restaurante no coincide con el pedido.');
  return {pedido, restaurante, repartidor, topic: raw.topic};
}
