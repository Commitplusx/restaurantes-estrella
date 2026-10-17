import { assertEquals } from 'jsr:@std/assert';
import { addedCartProduct, journeyTransform, type MotionCartRow } from '../src/lib/journeyGeometry.ts';

const row = (quantity: number, variant = 'plain'): MotionCartRow => ({ item: { id: 'chicken', tipo: 'item', cartItemId: variant, foto_url: '/chicken.webp' }, cantidad: quantity });

Deno.test('cart feedback acknowledges first and repeated committed additions', () => {
  assertEquals(addedCartProduct([], [row(1)]), { key: 'item:chicken', image: '/chicken.webp' });
  assertEquals(addedCartProduct([row(1)], [row(2)]), { key: 'item:chicken', image: '/chicken.webp' });
});
Deno.test('an option variant keeps its product identity for feedback', () => {
  assertEquals(addedCartProduct([row(1)], [row(1), row(1, 'spicy')]), { key: 'item:chicken', image: '/chicken.webp' });
});
Deno.test('cancelled additions, removals, quantity restoration and price-only renders do not fly', () => {
  assertEquals(addedCartProduct([row(1)], [row(1)]), null);
  assertEquals(addedCartProduct([row(2)], [row(1)]), null);
  assertEquals(addedCartProduct([], [row(3)]), null);
  assertEquals(addedCartProduct([row(1)], []), null);
  assertEquals(addedCartProduct([], [{ item: { id: 'no-photo', tipo: 'combo' }, cantidad: 1 }]), null);
});
Deno.test('a simultaneous removal and replacement is not confused with an addition', () => {
  assertEquals(addedCartProduct([row(1)], [row(1, 'other')]), null);
});
Deno.test('shared photo stays proportional when its destination changes aspect ratio', () => {
  assertEquals(journeyTransform({ left: 10, top: 20, width: 200, height: 100 }, { left: 30, top: 40, width: 80, height: 80 }),
    { x: -40, y: 10, scaleX: .4, scaleY: .8, photoScale: .4 });
});
Deno.test('zero-size or non-finite destinations cannot create invalid transforms', () => {
  const origin = { left: 0, top: 0, width: 100, height: 100 };
  assertEquals(journeyTransform(origin, { ...origin, width: 0 }), null);
  assertEquals(journeyTransform(origin, { ...origin, top: NaN }), null);
  assertEquals(journeyTransform({ ...origin, height: Infinity }, origin), null);
});
