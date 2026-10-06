export const ACTIVE_ORDER_STATES = [
  'pendiente', 'buscando_repartidor', 'ofrecido', 'asignado', 'recibido', 'en_camino',
] as const;

export interface OrderReceipt {
  id: string;
  estado: string;
  estado_pago: string | null;
  metodo_pago: string | null;
  wb_message_id: string | null;
  repartidor_id: string | null;
  descripcion: string;
  tipo_pedido: string | null;
  total: number | null;
  precio_entrega: number | null;
  restaurante: string | null;
  direccion: string | null;
  destino: string | null;
  cliente_nombre: string | null;
  cliente_tel: string;
  pin_seguridad: string | null;
  pickup_pin: string | null;
  estado_cocina: string | null;
  created_at: string;
}

export function parseOrderReceipt(value: unknown): OrderReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pedido inválido.');
  const row = value as Record<string, unknown>;
  const required = (key: string): string => {
    const result = row[key];
    if (typeof result !== 'string' || !result) throw new Error('Pedido incompleto.');
    return result;
  };
  const optional = (key: string): string | null => {
    const result = row[key];
    if (result == null) return null;
    if (typeof result !== 'string') throw new Error('Pedido inválido.');
    return result;
  };
  const amount = (key: string): number | null => {
    const result = row[key];
    if (result == null) return null;
    if (typeof result !== 'number' || !Number.isFinite(result) || result < 0) throw new Error('Importe inválido.');
    return result;
  };
  const id = required('id'), created_at = required('created_at');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !Number.isFinite(Date.parse(created_at))) throw new Error('Pedido inválido.');
  return {id, created_at, estado: required('estado'), descripcion: required('descripcion'), cliente_tel: required('cliente_tel'),
    estado_pago: optional('estado_pago'), metodo_pago: optional('metodo_pago'), wb_message_id: optional('wb_message_id'),
    repartidor_id: optional('repartidor_id'), tipo_pedido: optional('tipo_pedido'), total: amount('total'), precio_entrega: amount('precio_entrega'),
    restaurante: optional('restaurante'), direccion: optional('direccion'), destino: optional('destino'),
    cliente_nombre: optional('cliente_nombre'), pin_seguridad: optional('pin_seguridad'), pickup_pin: optional('pickup_pin'), estado_cocina: optional('estado_cocina')};
}

export function receiptState(order: Pick<OrderReceipt, 'estado' | 'metodo_pago' | 'estado_pago'>): 'success' | 'validating' | 'error' {
  if (order.estado === 'cancelado' || order.estado === 'rechazado') return 'success';
  if (order.estado === 'pendiente_pago' || (order.metodo_pago === 'en_linea' && order.estado_pago !== 'pagado')) {
    return order.estado_pago === 'fallido' ? 'error' : 'validating';
  }
  return [...ACTIVE_ORDER_STATES, 'entregado'].includes(order.estado) ? 'success' : 'error';
}

export function acceptedDriver(order: Pick<OrderReceipt, 'estado' | 'repartidor_id'>): string | null {
  return ['asignado', 'recibido', 'en_camino', 'entregado'].includes(order.estado) ? order.repartidor_id : null;
}
