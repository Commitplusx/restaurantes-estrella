type Row = Record<string, unknown>

export interface OrderChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string
  new: unknown
  old: unknown
}

function asRow(value: unknown): Row | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Row
}

export function shouldNotifyRestaurantOrder(change: OrderChange, primaryRestaurantId: string): boolean {
  const next = asRow(change.new)
  if (!next || next.restaurante_id === primaryRestaurantId) return false

  if (change.eventType === 'INSERT') return next.estado !== 'pendiente_pago'
  if (change.eventType !== 'UPDATE') return false

  const previous = asRow(change.old)
  return previous?.estado === 'pendiente_pago' && next.estado === 'pendiente'
}
