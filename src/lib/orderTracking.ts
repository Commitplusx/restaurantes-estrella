import { parseOrderReceipt } from '../utils/orderState';
import type { OrderReceipt } from '../utils/orderState';
import type { DeliveryCoordinates } from './deliveryLocation';

export interface TrackedOrder extends OrderReceipt {
  restaurante_id: string | null; lat: number | null; lng: number | null; lat_entrega: number | null; lng_entrega: number | null;
  lines: {nombre: string; cantidad: number; precio: number; opciones: string[]}[] | null;
}
export interface TrackedRestaurant {id: string; nombre: string; lat: number | null; lng: number | null; logo_url: string | null}
export interface TrackedDriver {id: string; user_id: string; nombre: string; telefono: string | null; lat: number | null; lng: number | null}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isTrackingReference(value: string | null): value is string { return typeof value === 'string' && (UUID.test(value) || /^[A-Z0-9]{6}$/.test(value)); }
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No pudimos comprobar los datos del seguimiento.');
  return value as Record<string, unknown>;
};
const id = (value: unknown): string => { if (typeof value !== 'string' || !UUID.test(value)) throw new Error('Referencia inválida.'); return value; };
const name = (value: unknown): string => { if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new Error('Nombre inválido.'); return value; };
const coordinate = (value: unknown, max: number): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && Math.abs(parsed) <= max ? parsed : null;
};
export const orderTrackingColumns = 'id,estado,estado_pago,metodo_pago,wb_message_id,repartidor_id,descripcion,tipo_pedido,total,precio_entrega,restaurante,direccion,destino,cliente_nombre,cliente_tel,pin_seguridad,pickup_pin,estado_cocina,created_at,restaurante_id,lat,lng,lat_entrega,lng_entrega,items';
function parseLines(value: unknown): TrackedOrder['lines'] {
  try {
    if (!Array.isArray(value) || !value.length || value.length > 100) return null;
    return value.map(value => {
      const line = object(value), item = object(line.item), options = item.opcionesSeleccionadas ?? [];
      if (typeof line.cantidad !== 'number' || !Number.isInteger(line.cantidad) || line.cantidad<1 || line.cantidad>100 ||
        typeof item.precio !== 'number' || !Number.isFinite(item.precio) || item.precio<0 || !Array.isArray(options) || options.length>50) throw new Error('Legacy order lines.');
      return {nombre:name(item.nombre),cantidad:line.cantidad,precio:item.precio,opciones:options.map(value => name(object(value).opcion))};
    });
  } catch {return null;} // Legacy receipts keep their persisted description instead of inventing item values.
}
export function parseTrackedOrder(value: unknown): TrackedOrder {
  const raw = object(value);
  return {...parseOrderReceipt(value), lines:parseLines(raw.items), restaurante_id: raw.restaurante_id == null ? null : id(raw.restaurante_id),
    lat: coordinate(raw.lat,90), lng: coordinate(raw.lng,180), lat_entrega: coordinate(raw.lat_entrega,90), lng_entrega: coordinate(raw.lng_entrega,180)};
}
export function parseTrackedRestaurant(value: unknown): TrackedRestaurant {
  const raw = object(value);
  return {id: id(raw.id), nombre: name(raw.nombre), lat: coordinate(raw.lat,90), lng: coordinate(raw.lng,180),
    logo_url: typeof raw.logo_url === 'string' && /^https:\/\//.test(raw.logo_url) ? raw.logo_url : null};
}
export function parseTrackedDriver(value: unknown, owner: string): TrackedDriver {
  const raw = object(value);
  if (id(raw.user_id) !== owner) throw new Error('El repartidor no coincide con la asignación.');
  const digits = typeof raw.telefono === 'string' ? raw.telefono.replace(/\D/g,'') : '';
  return {id: id(raw.id), user_id: owner, nombre: name(raw.nombre), telefono: /^(?:52|521)?\d{10}$/.test(digits) ? digits.slice(-10) : null,
    lat: coordinate(raw.lat,90), lng: coordinate(raw.lng,180)};
}
export function trackingPoint(value: {lat: number | null; lng: number | null} | null): DeliveryCoordinates | null {
  return value?.lat !== null && value?.lat !== undefined && value.lng !== null
    && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180
    ? {lat: value.lat, lng: value.lng} : null;
}
