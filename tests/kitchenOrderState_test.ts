import { assertEquals } from 'jsr:@std/assert'
import { createKitchenAlarm } from '../src/lib/kitchenAlarm.ts'
import {
  createKitchenOrderFeed,
  isActiveKitchenOrder,
  isAwaitingKitchenOrder,
  isOlderKitchenOrderSnapshot,
} from '../src/lib/kitchenOrderState.ts'

const order = (estado: string, estado_cocina: string | null, updated_at = '2026-10-15T12:00:00.000Z') => ({
  id: 'order-1', estado, estado_cocina, updated_at,
})

Deno.test('terminal orders never appear as active kitchen work or keep the alarm ringing', () => {
  for (const estado of ['entregado', 'cancelado', 'rechazado', 'pendiente_pago']) {
    const row = order(estado, 'pendiente')
    assertEquals(isActiveKitchenOrder(row), false)
    assertEquals(isAwaitingKitchenOrder(row), false)
  }
})

Deno.test('only pending or legacy null kitchen stages await preparation', () => {
  assertEquals(isAwaitingKitchenOrder(order('pendiente', 'pendiente')), true)
  assertEquals(isAwaitingKitchenOrder(order('pendiente', null)), true)
  assertEquals(isActiveKitchenOrder(order('buscando_repartidor', 'en_cocina')), true)
  assertEquals(isAwaitingKitchenOrder(order('buscando_repartidor', 'en_cocina')), false)
})

Deno.test('delayed updates cannot restore a pending stage after kitchen acceptance', () => {
  const accepted = order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z')
  const delayedPending = order('pendiente', 'pendiente', '2026-10-15T12:00:00.000Z')
  assertEquals(isOlderKitchenOrderSnapshot(delayedPending, accepted), true)
  assertEquals(isOlderKitchenOrderSnapshot(accepted, delayedPending), false)
})

Deno.test('a newer timestamp does not authorize a regression in the kitchen stage', () => {
  assertEquals(isOlderKitchenOrderSnapshot(
    order('pendiente', 'pendiente', '2026-10-15T12:02:00.000Z'),
    order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z'),
  ), true)
})

Deno.test('confirmed RPC acceptance survives both delayed events and an in-flight read', () => {
  const feed = createKitchenOrderFeed()
  const pending = order('pendiente', 'pendiente')
  feed.reconcile([pending], feed.revision())
  const readRevision = feed.revision()
  feed.apply(order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z'))
  assertEquals(feed.apply(pending), false)
  feed.reconcile([pending], readRevision)
  assertEquals(feed.activeOrders().length, 1)
  assertEquals(feed.activeOrders()[0].estado_cocina, 'en_cocina')
  assertEquals(feed.activeOrders().filter(isAwaitingKitchenOrder).length, 0)
})

Deno.test('events arriving during the read are kept while fetched orders are merged', () => {
  const feed = createKitchenOrderFeed()
  const readRevision = feed.revision()
  feed.apply({ ...order('pendiente', 'pendiente'), id: 'order-2' })
  feed.reconcile([order('pendiente', 'pendiente')], readRevision)
  assertEquals(feed.activeOrders().map(row => row.id).sort(), ['order-1', 'order-2'])
  feed.apply(order('pendiente', 'pendiente'))
  assertEquals(feed.activeOrders().length, 2)
})

Deno.test('delivery or deletion during a read cannot be resurrected by its result', () => {
  for (const action of ['delivery', 'deletion']) {
    const feed = createKitchenOrderFeed()
    const pending = order('pendiente', 'pendiente')
    feed.reconcile([pending], feed.revision())
    const readRevision = feed.revision()
    if (action === 'delivery') feed.apply(order('entregado', 'pendiente', '2026-10-15T12:01:00.000Z'))
    else feed.remove('order-1')
    feed.reconcile([pending], readRevision)
    feed.apply({ ...pending, updated_at: '2026-10-15T12:02:00.000Z' })
    assertEquals(feed.activeOrders(), [])
  }
})

Deno.test('Realtime preserves the restaurant label loaded with the SQL join', () => {
  const feed = createKitchenOrderFeed()
  feed.reconcile([{ ...order('pendiente', 'pendiente'), restaurantes: { nombre: 'Restaurante de prueba' } }], feed.revision())
  feed.apply(order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z'))
  assertEquals(feed.activeOrders()[0].restaurantes, { nombre: 'Restaurante de prueba' })
})

Deno.test('a successful refresh removes missing orders without discarding concurrent events', () => {
  const feed = createKitchenOrderFeed()
  feed.reconcile([order('pendiente', 'pendiente')], feed.revision())
  feed.reconcile([], feed.revision())
  assertEquals(feed.activeOrders(), [])
})

Deno.test('a late RPC response cannot replace a newer ready snapshot', () => {
  const feed = createKitchenOrderFeed()
  feed.apply(order('asignado', 'listo_para_recoger', '2026-10-15T12:02:00.000Z'))
  assertEquals(feed.apply(order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z')), false)
  assertEquals(feed.activeOrders()[0].estado_cocina, 'listo_para_recoger')
})

Deno.test('malformed external rows cannot enter the monitor or trigger the alarm', () => {
  const feed = createKitchenOrderFeed()
  for (const value of [null, [], {}, { id: 'order-1', estado: 4, estado_cocina: null }]) {
    assertEquals(feed.apply(value), false)
    assertEquals(isAwaitingKitchenOrder(value), false)
  }
  feed.reconcile([null, {}], feed.revision())
  assertEquals(feed.activeOrders(), [])
})

Deno.test('accepting the last pending order stops audio through delayed events and refreshes', () => {
  const feed = createKitchenOrderFeed()
  let plays = 0
  let scheduled = 0
  const alarm = createKitchenAlarm(
    () => { plays += 1 },
    () => {},
    {
      schedule: () => ++scheduled,
      cancel: () => { scheduled -= 1 },
    },
  )
  const syncAlarm = () => {
    if (feed.activeOrders().some(isAwaitingKitchenOrder)) alarm.start()
    else alarm.stop()
  }
  const pending = order('pendiente', 'pendiente')
  feed.reconcile([pending], feed.revision())
  syncAlarm()
  assertEquals(plays, 1)
  const readingAt = feed.revision()
  feed.apply(order('buscando_repartidor', 'en_cocina', '2026-10-15T12:01:00.000Z'))
  syncAlarm()
  feed.apply(pending)
  syncAlarm()
  feed.reconcile([pending], readingAt)
  syncAlarm()
  assertEquals(plays, 1)
  assertEquals(scheduled, 0)
  assertEquals(alarm.isRunning(), false)
})
