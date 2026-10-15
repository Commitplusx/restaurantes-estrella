type OrderRow = Record<string, unknown>

export type KitchenOrderSnapshot = OrderRow & {
  id: string
  estado: string | null
  estado_cocina: string | null
}

const TERMINAL_ORDER_STATES = new Set(['entregado', 'cancelado', 'rechazado'])
const NON_KITCHEN_ORDER_STATES = new Set(['pendiente_pago'])
const ACTIVE_KITCHEN_STAGES = new Set(['pendiente', 'en_cocina', 'listo_para_recoger'])
const KITCHEN_STAGE_ORDER = new Map<string, number>([
  ['pendiente', 0],
  ['en_cocina', 1],
  ['listo_para_recoger', 2],
  ['entregado', 3],
])

function asOrderRow(value: unknown): OrderRow | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as OrderRow
}

function isKitchenOrderSnapshot(value: unknown): value is KitchenOrderSnapshot {
  const row = asOrderRow(value)
  return row !== null && kitchenOrderId(row) !== null
    && (row.estado === null || typeof row.estado === 'string')
    && (row.estado_cocina === null || typeof row.estado_cocina === 'string')
}

export function kitchenOrderId(value: unknown): string | null {
  const row = asOrderRow(value)
  return row && typeof row.id === 'string' && row.id.length > 0 ? row.id : null
}

export function isTerminalRestaurantOrder(value: unknown): boolean {
  const row = asOrderRow(value)
  return row !== null && typeof row.estado === 'string' && TERMINAL_ORDER_STATES.has(row.estado)
}

export function isActiveKitchenOrder(value: unknown): boolean {
  const row = asOrderRow(value)
  if (!row || kitchenOrderId(row) === null) return false

  const orderState = row.estado
  const kitchenStage = row.estado_cocina
  if (orderState !== null && typeof orderState !== 'string') return false
  if (typeof orderState === 'string' && (TERMINAL_ORDER_STATES.has(orderState) || NON_KITCHEN_ORDER_STATES.has(orderState))) return false
  if (kitchenStage !== null && typeof kitchenStage !== 'string') return false

  return kitchenStage === null || ACTIVE_KITCHEN_STAGES.has(kitchenStage)
}

export function isAwaitingKitchenOrder(value: unknown): boolean {
  const row = asOrderRow(value)
  return isActiveKitchenOrder(row) && (row?.estado_cocina === null || row?.estado_cocina === 'pendiente')
}

/** Ignore delayed Realtime snapshots that would move kitchen work backwards. */
export function isOlderKitchenOrderSnapshot(incoming: unknown, current: unknown): boolean {
  const next = asOrderRow(incoming)
  const previous = asOrderRow(current)
  if (!next || !previous) return false

  const nextTime = typeof next.updated_at === 'string' ? Date.parse(next.updated_at) : Number.NaN
  const previousTime = typeof previous.updated_at === 'string' ? Date.parse(previous.updated_at) : Number.NaN
  if (Number.isFinite(nextTime) && Number.isFinite(previousTime) && nextTime < previousTime) return true
  if (!Number.isFinite(nextTime) && Number.isFinite(previousTime)) return true
  // Global delivery/cancellation wins even if the kitchen field was left behind.
  if (isTerminalRestaurantOrder(next)) return false
  if (isTerminalRestaurantOrder(previous)) return true

  const nextStage = typeof next.estado_cocina === 'string' ? KITCHEN_STAGE_ORDER.get(next.estado_cocina) : 0
  const previousStage = typeof previous.estado_cocina === 'string' ? KITCHEN_STAGE_ORDER.get(previous.estado_cocina) : 0
  return nextStage !== undefined && previousStage !== undefined && nextStage < previousStage
}

/** One cache for SQL reads, Realtime and confirmed RPC responses. */
export function createKitchenOrderFeed() {
  const snapshots = new Map<string, { row: KitchenOrderSnapshot, revision: number }>()
  const terminalIds = new Set<string>()
  let revision = 0

  const apply = (value: unknown): boolean => {
    if (!isKitchenOrderSnapshot(value) || terminalIds.has(value.id)) return false
    const previous = snapshots.get(value.id)
    if (previous && isOlderKitchenOrderSnapshot(value, previous.row)) return false
    const row = { ...previous?.row, ...value }
    if (isTerminalRestaurantOrder(row) || row.estado_cocina === 'entregado') terminalIds.add(row.id)
    snapshots.set(row.id, { row, revision: ++revision })
    return true
  }

  return {
    revision: () => revision,
    apply,
    remove(id: string) {
      terminalIds.add(id)
      snapshots.delete(id)
      revision += 1
    },
    reconcile(values: readonly unknown[], startedAtRevision: number) {
      const fetchedIds = new Set<string>()
      for (const value of values) {
        if (!isKitchenOrderSnapshot(value)) continue
        fetchedIds.add(value.id)
        if (terminalIds.has(value.id)) continue
        const previous = snapshots.get(value.id)
        // A request already in flight cannot undo an RPC or a Realtime event.
        if (previous && (previous.revision > startedAtRevision || isOlderKitchenOrderSnapshot(value, previous.row))) {
          snapshots.set(value.id, { ...previous, row: { ...value, ...previous.row } })
          continue
        }
        snapshots.set(value.id, { row: { ...previous?.row, ...value }, revision: startedAtRevision })
        if (isTerminalRestaurantOrder(value) || value.estado_cocina === 'entregado') terminalIds.add(value.id)
      }
      for (const [id, snapshot] of snapshots) {
        if (!fetchedIds.has(id) && snapshot.revision <= startedAtRevision) snapshots.delete(id)
      }
    },
    activeOrders: () => [...snapshots.values()]
      .map(snapshot => snapshot.row)
      .filter(row => !terminalIds.has(row.id) && isActiveKitchenOrder(row))
      .sort((left, right) => String(right.created_at ?? '').localeCompare(String(left.created_at ?? ''))),
  }
}
