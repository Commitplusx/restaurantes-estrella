import { assertEquals } from 'jsr:@std/assert'
import { shouldNotifyRestaurantOrder } from '../src/lib/orderNotificationPolicy.ts'

Deno.test('only linked-branch inserts outside pending payment send a notice', () => {
  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'INSERT',
    new: { restaurante_id: 'branch-1', estado: 'pendiente' },
    old: {},
  }, 'main-1'), true)

  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'INSERT',
    new: { restaurante_id: 'branch-1', estado: 'pendiente_pago' },
    old: {},
  }, 'main-1'), false)

  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'INSERT',
    new: { restaurante_id: 'main-1', estado: 'pendiente' },
    old: {},
  }, 'main-1'), false)
})

Deno.test('payment confirmation notifies once for branches and malformed rows are ignored', () => {
  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'UPDATE',
    new: { restaurante_id: 'branch-1', estado: 'pendiente' },
    old: { restaurante_id: 'branch-1', estado: 'pendiente_pago' },
  }, 'main-1'), true)

  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'UPDATE',
    new: { restaurante_id: 'branch-1', estado: 'en_cocina' },
    old: { restaurante_id: 'branch-1', estado: 'pendiente' },
  }, 'main-1'), false)

  assertEquals(shouldNotifyRestaurantOrder({
    eventType: 'INSERT',
    new: null,
    old: {},
  }, 'main-1'), false)
})
